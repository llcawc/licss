import type { RawSourceMap } from 'source-map'
import type File from 'vinyl'

import { Buffer } from 'node:buffer'
import { dirname, join, relative } from 'node:path'
import { Transform } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'

import browserslist from 'browserslist'
import colors from 'colors'
import log from 'fancy-log'
import { type Targets, browserslistToTargets, bundle, transform } from 'lightningcss'
import PluginError from 'plugin-error'
import { type UserDefinedOptions, PurgeCSS } from 'purgecss'
import { compileStringAsync } from 'sass-embedded'
import { glob } from 'tinyglobby'

// Reusable TextDecoder instance for performance
const textDecoder = new TextDecoder()

interface LicssOptions {
  minify?: boolean | undefined
  loadPaths?: string[] | undefined
  purgeCSSoptions?: UserDefinedOptions | undefined
  verbose?: boolean | undefined
}

interface RenameOptions {
  basename?: string | undefined
  extname?: string | undefined
  suffix?: string | undefined
}

/**
 * Gulp plugin for style transformation - bundles, compiles, minimizes, and cleans up sass, scss, css, and postcss style sheets.
 * @param minify use LightningCSS for minify CSS files
 * @param loadPaths paths for files to imports for SASS/SCSS compiler
 * @param purgeCSSoptions remove unused CSS from file - options PurgeCSS
 * @param verbose display more messages
 * @returns Transform stream.
 *
 * @example
 *
 * ```js
 * // import modules
 * import { dest, src } from 'gulp'
 * import { licss, rename } from 'licss'
 *
 * // sample task for postcss files
 * function styles() {
 *   return src(['src/styles/main.css'], { sourcemaps: true })
 *   .pipe(licss({
 *       purgeCSSoptions: {
 *         content: ["src/*.html", "src/scripts/*.ts"],
 *       },
 *     }))
 *   .pipe(rename({ suffix: '.min', extname: '.css' }))
 *   .pipe(dest('dist/css', { sourcemaps: '.' })) // for file sourcemap
 *                 // or .. { sourcemaps: true } for inline soutcemap
 * }
 *
 * // export
 * export { styles }
 *
 * ```
 */

function licss({ minify = true, loadPaths, purgeCSSoptions, verbose = false }: LicssOptions = {}): Transform {
  const stream = new Transform({ objectMode: true })
  stream._transform = async (file: File, _enc, cb) => {
    // Skip null files
    if (file.isNull()) {
      return cb(null, file)
    }

    // Reject streams
    if (file.isStream()) {
      return cb(new PluginError('licss', 'Streams are not supported'))
    }

    // Skip partials
    if (file.stem.startsWith('_')) {
      return cb()
    }

    if (file.isBuffer()) {
      try {
        // normalize loadPaths
        if (!loadPaths) {
          loadPaths = [dirname(file.path), join(file.cwd, 'node_modules')]
        }

        // normalize extname
        const extname = file.extname.split('.').pop()?.toLowerCase() ?? ''

        // Validate file extension
        if (!/^(css|scss|sass|pcss|postcss)$/i.test(extname)) {
          throw new Error('• "licss": Unsupported file extension. Supported: .css, .scss, .sass, .pcss')
        }

        // get list supported browsers
        const targetsList = getTargets(file.cwd)
        // boolean flags
        const isPcssFile = /^(pcss|postcss)$/i.test(extname)
        const isPurge = !!purgeCSSoptions
        const isSourceMap = file.sourceMap ? true : false

        if (verbose) {
          mess(`Options: minify: ${minify}, sourcemap: ${isSourceMap}, purge: ${isPurge}, file:`, file)
        }

        // Logic of transformation
        if (isPcssFile) {
          if (verbose) {
            mess('Run bundle LightningCSS for file:', file)
          }
          // LightningCSS Bundle compiler for PostCSS files
          bundleLightningCSS(file, isSourceMap)
        } else {
          if (verbose) {
            mess('Run SASS compiler for file:', file)
          }
          // run SASS compiler
          await bundleSASS(file, loadPaths, isSourceMap)
        }

        if (isPurge) {
          if (verbose) {
            mess('Purge unused CSS in file:', file)
          }
          // Purge unused CSS with PurgeCSS
          await purgeTransform(file, purgeCSSoptions)
        }

        // If rejected, disable transformLightningCSS
        if (!purgeCSSoptions?.rejected) {
          if (verbose) {
            mess('Run transform LightningCSS for file:', file)
          }
          // target, minify, sourcemap with LightningCSS compiler
          transformLightningCSS(file, minify, targetsList, isSourceMap, isPurge)
        }
        cb(null, file)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        throw new PluginError('licss', error, { fileName: file.path, showStack: true })
      }
    } else {
      throw new PluginError('licss', { message: 'File not found!' })
    }
  }
  return stream
}

// logs results of the conversion process
function mess(message: string, file: File) {
  return log(colors.cyan('licss ') + colors.red('★ ') + colors.magenta(message + ' ') + colors.blue(file.relative))
}

// Get target browsers from browserslist
function getTargets(cwd: string): Targets {
  const config = browserslist.loadConfig({ path: cwd }) ?? browserslist('> 0.2%, last 2 major versions, not dead')
  return browserslistToTargets(browserslist(config))
}

// Transform CSS with LightningCSS
function transformLightningCSS(
  file: File,
  minify: boolean,
  targetsList: Targets,
  isSourceMap: boolean,
  isPurge: boolean,
): void {
  if (file.isBuffer()) {
    const result = transform({
      filename: file.path,
      minify: minify,
      code: file.contents, // Buffer extends Uint8Array
      sourceMap: isSourceMap,
      inputSourceMap: isPurge ? undefined : isSourceMap ? JSON.stringify(file.sourceMap) : undefined,
      projectRoot: file.cwd,
      targets: minify ? targetsList : undefined,
    })

    file.extname = '.css'
    file.contents = Buffer.from(result.code) // result.code is Uint8Array
    if (result.map) {
      file.sourceMap = JSON.parse(textDecoder.decode(result.map))
    }
  } else {
    throw new Error('transformLightningCSS: File not found!')
  }
}

// Bundle CSS with LightningCSS
function bundleLightningCSS(file: File, isSourceMap: boolean): void {
  if (file.isBuffer()) {
    const result = bundle({
      filename: file.path,
      minify: false,
      sourceMap: isSourceMap,
      inputSourceMap: undefined,
      projectRoot: file.cwd,
      targets: undefined,
    })

    file.extname = '.css'
    file.contents = Buffer.from(result.code) // result.code is Uint8Array
    if (result.map) {
      file.sourceMap = JSON.parse(textDecoder.decode(result.map))
    }
  } else {
    throw new Error('bundleLightningCSS: File not found!')
  }
}

// Compile sass/scss
async function bundleSASS(file: File, loadPaths: string[], isSourceMap: boolean): Promise<void> {
  if (file.isBuffer()) {
    try {
      const content = parseImport(file)

      const result = await compileStringAsync(content, {
        url: pathToFileURL(file.path),
        loadPaths: loadPaths,
        syntax: file.extname === '.sass' ? 'indented' : 'scss',
        sourceMap: isSourceMap,
        sourceMapIncludeSources: true,
      })

      file.extname = '.css'
      file.contents = Buffer.from(result.css)

      if (result.sourceMap && isSourceMap) {
        cleanSourceMap(file, JSON.parse(JSON.stringify(result.sourceMap)) as RawSourceMap)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      throw new PluginError('licss', error, {
        message: 'Error! Sass compiler: ',
        fileName: file.path,
        showStack: true,
      })
    }
  } else {
    throw new Error('bundleSASS: File not found!')
  }
}

// Update source map
function cleanSourceMap(file: File, map: RawSourceMap) {
  const basePath = file.base
  map.file = file.relative.replace(/\\/g, '/')

  map.sources = map.sources.map((path) => {
    if (path.startsWith('file:')) {
      path = fileURLToPath(path)
    }
    path = relative(basePath, path)
    return path.replace(/\\/g, '/')
  })
  // Update file source map
  file.sourceMap = map
}

// Resolve file paths via glob
async function getFiles(contentArray: string[], ignore: string | string[] | undefined) {
  return await glob(contentArray, {
    ignore: ignore,
  })
}

// Clean import statements
function parseImport(file: File): string {
  if (file.isBuffer()) {
    const contents = textDecoder.decode(file.contents)
    return contents.replace(/@import +([url(]*)["']([./]*)([a-z-_/]+)\.?(.*)['"]\)?/gi, '@import "$2$3"')
  } else {
    throw new Error('parseImport: File not found!')
  }
}

// Purge unused CSS (https://purgecss.com/api.html)
async function purgeTransform(file: File, options: UserDefinedOptions | undefined): Promise<void> {
  // include PurgeCSS
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Error! Check the type PurgeCSS options.')
  }
  // Validate required content field
  if (!options.content || !Array.isArray(options.content) || options.content.length === 0) {
    throw new Error('Error! PurgeCSS requires a non-empty "content" array.')
  }

  if (file.isBuffer()) {
    // Resolve file paths via glob and get content for PurgeCSS
    const processedContent = await getFiles(options.content as string[], options.skippedContentGlobs)

    // Process content files and convert them to the format required by PurgeCSS
    const purgedCSSResults = await new PurgeCSS().purge({
      ...options,
      content: processedContent,
      css: [
        {
          raw: textDecoder.decode(file.contents),
        },
      ],
      stdin: true,
      sourceMap: false,
    })
    // Get the first result (since we are processing one file)
    const purge = purgedCSSResults[0]

    // If there are rejected selectors, join them with empty rules to prevent errors in the browser
    const rejected =
      options.rejected && purge.rejected && purge.rejected.length > 0 ? purge.rejected.join(' {}\n') + ' {}' : ''

    // Use the purged CSS if there are no rejected selectors
    const result = rejected ? rejected : purge.css

    // Update file contents
    file.contents = Buffer.from(result, 'utf8')
  } else {
    throw new Error('purgeTransform: File not found!')
  }
}

/**
 * Gulp plugin for rename file - change extname or/and added suffix
 * @param basename - new file name (file stem and file extension)
 * @param extname - new file extension
 * @param suffix - new file suffix
 */
function rename({ basename = undefined, extname = undefined, suffix = undefined }: RenameOptions = {}): Transform {
  const stream = new Transform({ objectMode: true })

  stream._transform = async (sameFile: File, _enc, callback) => {
    // Empty
    if (sameFile.isNull()) {
      return callback(null, sameFile)
    }
    // Reject streams
    if (sameFile.isStream()) {
      return callback(new PluginError('licss', 'Streams are not supported'))
    }
    // Rename
    if (sameFile.isBuffer()) {
      try {
        const file = sameFile.clone({ contents: false })

        if (basename) {
          file.basename = basename
        }

        const extName = file.extname

        if (suffix && extname) {
          file.extname = suffix + extname
        } else if (suffix && !extname) {
          file.extname = suffix + extName
        } else if (!suffix && extname) {
          file.extname = extname
        }

        // rename sourcemap
        if (file.sourceMap) {
          file.sourceMap.file = file.relative
        }
        callback(null, file)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        throw new PluginError('licss', error, { fileName: sameFile.path, showStack: true })
      }
    } else {
      // non-buffer files (streams) pass through unchanged
      callback(null, sameFile)
    }
  }
  return stream
}

// export
export { licss, rename }
export type { LicssOptions, RenameOptions, UserDefinedOptions }
