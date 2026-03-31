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
  compiler?: 'sass' | 'lightningcss' | undefined
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
 * @param compiler use SASS/SCSS or LightningCSS compiler for CSS files
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

function licss({
  compiler = 'lightningcss',
  minify = true,
  loadPaths,
  purgeCSSoptions,
  verbose = false,
}: LicssOptions = {}): Transform {
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

        // mormalize extname
        const extname = file.extname.split('.').pop()?.toLowerCase() ?? ''

        // Validate file extension
        if (!/^(css|scss|sass|pcss)$/i.test(extname)) {
          throw new Error('• "licss": Unsupported file extension. Supported: .css, .scss, .sass, .pcss')
        }

        // Validate compiler
        if (!/^(sass|lightningcss)$/i.test(compiler)) {
          throw new Error(
            '• "licss": Unsupported "compiler" option.\nSupported: "sass", "lightningcss" or undefined. Default: "sass"',
          )
        }

        // get list supported browsers
        const targetsList = getTargets(file.cwd)
        // boolean flags
        const isPurge = !!purgeCSSoptions
        const isSourceMap = file.sourceMap ? true : false
        const isCssFile = /^css$/i.test(extname)
        const isSassFile = /^(sass|scss)$/i.test(extname)

        if (verbose) {
          mess(
            `options: compiler: ${compiler}, minify: ${minify}, purge: ${isPurge}, sourcemap: ${isSourceMap}, file:`,
            file,
          )
        }

        // SASS compile bundle
        if (isSassFile || (isCssFile && compiler === 'sass')) {
          // run SASS compiler
          if (verbose) {
            mess('Run SASS compiler for file:', file)
          }
          await bundleSASS(file, loadPaths, isSourceMap)

          if (minify) {
            // minify with LightningCSS compiler
            if (verbose) {
              mess('LightningCSS minify file:', file)
            }
            await transformLightningCSS(file, minify, targetsList, isSourceMap)
          }
        } else {
          // used LightningCSS Bundle compiler
          if (verbose) {
            mess('Run LightningCSS Bundle compiler for file:', file)
          }
          await bundleLightningCSS(file, minify, targetsList, isSourceMap)
        }

        if (isPurge) {
          // Purge unused CSS with PurgeCSS
          if (verbose) {
            mess('Purge unused CSS in file:', file)
          }
          await purgeTransform(file, purgeCSSoptions, isSourceMap)
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
async function transformLightningCSS(
  file: File,
  minify: boolean,
  targetsList: Targets,
  isSourceMap: boolean,
): Promise<void> {
  if (file.isBuffer()) {
    const result = transform({
      targets: minify ? targetsList : undefined,
      filename: file.basename,
      minify: minify,
      inputSourceMap: isSourceMap ? JSON.stringify(file.sourceMap) : undefined,
      sourceMap: isSourceMap,
      code: file.contents, // Buffer extends Uint8Array
      projectRoot: file.base,
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
async function bundleLightningCSS(
  file: File,
  minify: boolean,
  targetsList: Targets,
  isSourceMap: boolean,
): Promise<void> {
  if (file.isBuffer()) {
    const result = bundle({
      targets: minify ? targetsList : undefined,
      filename: file.path,
      minify: minify,
      sourceMap: isSourceMap,
      projectRoot: file.base,
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
      throw new PluginError('lscss', error, {
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
async function purgeTransform(
  file: File,
  options: UserDefinedOptions | undefined,
  isSourceMap: boolean,
): Promise<void> {
  // include PurgeCSS
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Error! Check the type PurgeCSS options.')
  }
  // Validate required content field
  if (!options.content || !Array.isArray(options.content) || options.content.length === 0) {
    throw new Error('Error! PurgeCSS requires a non-empty "content" array.')
  }

  if (file.isBuffer()) {
    // Get previous source map if exists (https://postcss.org/api/#sourcemapoptions)
    const prevMap: RawSourceMap | undefined = isSourceMap ? file.sourceMap : false
    const mapOptions = { inline: false, annotation: false, prev: prevMap, sourcesContent: true }

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
      // Pass source map options to PurgeCSS (https://purgecss.com/api-reference/purgecss.userdefinedoptions.sourcemap.html)
      sourceMap: mapOptions,
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

    // Update source map only if source maps are requested
    if (isSourceMap) {
      if (purge.sourceMap) {
        file.sourceMap = JSON.parse(purge.sourceMap) as RawSourceMap
      } else {
        // Log warning but don't throw - PurgeCSS may not generate source maps in some cases
        log(
          colors.yellow('licss ') +
            colors.red('⚠ ') +
            colors.magenta('Source map not generated by PurgeCSS for file: ') +
            colors.blue(file.relative),
        )
      }
    }
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
    // empty
    if (sameFile.isNull()) {
      return callback(null, sameFile)
    }
    // rename
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
