import File from 'vinyl'
import { Buffer } from 'node:buffer'
import browserslist from 'browserslist'
import through2 from 'through2'
import { transform, bundle, browserslistToTargets, Targets } from 'lightningcss'
import { RawSourceMap } from 'source-map'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { compileString, OutputStyle, Syntax } from 'sass'
import { PurgeCSS, UserDefinedOptions } from 'purgecss'
import * as glob from 'glob'

import rename from './rename.js'
export { rename }

/**
 * Gulp plugin for style transformation - bundles, compiles, minimizes, and cleans up sass, scss, css, and postcss style sheets.
 * @param options
 */

export default function licss(
  options: {
    minify?: boolean | undefined
    loadPaths?: string[] | undefined
    purgeOptions?: UserDefinedOptions | undefined
  } = { minify: undefined, loadPaths: undefined, purgeOptions: undefined }
) {
  return through2.obj(async function (file: File, _, cb) {
    // empty
    if (file.isNull()) {
      return cb(null, file)
    }
    // exclude chunk files
    if (file.stem.startsWith('_')) {
      cb()
      return
    }
    if (file.isBuffer()) {
      try {
        const minify: boolean = !!options.minify // normalize boolean
        const sourceMap: boolean = !!file.sourceMap // normalize boolean

        // compile css, scss or sass files
        if (file.extname === '.css' || file.extname === '.sass' || file.extname === '.scss') {
          const syntax: Syntax | undefined = file.extname === '.sass' ? 'indented' : 'scss'
          const style: OutputStyle | undefined = minify ? 'compressed' : 'expanded'
          const loadPaths: string[] = options.loadPaths ?? [dirname(file.path), join(file.cwd, 'node_modules')]

          const sassOptions = {
            url: pathToFileURL(file.path),
            loadPaths,
            syntax,
            style,
            sourceMap,
            sourceMapIncludeSources: true,
          }

          let fileContents = String(file.contents).toString()
          // fix imports
          fileContents = fileContents.replace(
            /@import +([url(]*)["']([./]*)([a-z-_/]+)\.?(.*)['"]\)?/gi,
            '@import "$2$3"'
          )
          // sass compile
          const result = compileString(fileContents, sassOptions)
          file.contents = Buffer.from(result.css)
          file.extname = '.css'
          const sassMap = result.sourceMap as RawSourceMap | undefined

          // add map in to file
          if (sourceMap && !!sassMap) {
            addSourceMap(file, sassMap, true)
          }
          // transform code with lightningcss
          if (!sourceMap) {
            licssTransform(file, minify, sourceMap)
          }
        } else {
          // compile postcss file
          licssBundle(file, minify, sourceMap)
        }
        // purgecss
        if (options.purgeOptions && !sourceMap) {
          await purge(file, options.purgeOptions)
        }
      } catch (err) {
        console.error(err)
      }
    }
    cb(null, file)
  })
}

// transform string css code with lightningcss
function licssTransform(file: File, minify: boolean, sourceMap: boolean) {
  if (file.isBuffer()) {
    // compile css files
    const targets: Targets = browserslist.loadConfig({ path: file.cwd })
      ? browserslistToTargets(browserslist(browserslist.loadConfig({ path: file.cwd }) ?? browserslist.defaults))
      : browserslistToTargets(browserslist('> 0.2%, last 2 major versions, not dead'))
    const filename = file.path
    const inputSourceMap = sourceMap ? JSON.stringify(file.sourceMap) : undefined

    const compileOptions = {
      targets,
      filename,
      minify,
      inputSourceMap,
      sourceMap,
      code: Buffer.from(file.contents.toString()),
      projectRoot: file.base,
    }

    // compile css file with use lightningcss
    const { code, map } = transform(compileOptions)
    file.contents = Buffer.from(code.toString())

    // if need map
    if (sourceMap && !!map) {
      const mapContent = JSON.parse(map.toString())
      mapContent.file = file.relative
      mapContent.sourceRoot = ''
      file.sourceMap = mapContent
    }
  }
}

// bundle and transforn css or postcss files with lightningcss
function licssBundle(file: File, minify: boolean, sourceMap: boolean) {
  if (file.isBuffer()) {
    const targets: Targets = browserslist.loadConfig({ path: file.cwd })
      ? browserslistToTargets(browserslist(browserslist.loadConfig({ path: file.cwd }) ?? browserslist.defaults))
      : browserslistToTargets(browserslist('> 0.2%, last 2 major versions, not dead'))
    const filename = file.path

    const compileOptions = {
      targets,
      filename,
      minify,
      sourceMap,
      projectRoot: file.base,
    }

    // compile css file with use lightningcss
    const { code, map } = bundle(compileOptions)
    file.contents = Buffer.from(code.toString())

    // add map in file
    if (sourceMap && !!map) {
      const mapContent = JSON.parse(map.toString())
      mapContent.file = file.relative
      mapContent.sourceRoot = ''
      file.sourceMap = mapContent
    }
  }
}

// fix sources and insert map in to file after sass compiler
function addSourceMap(file: File, map: RawSourceMap, relativePath: boolean) {
  // insert "file": in to map
  if (file.isBuffer()) {
    if (!map.file) {
      if (relativePath) {
        map.file = file.relative
      } else {
        map.file = file.path
      }
    }

    // fix "file:" paths
    if (/file:/i.test(map.file)) {
      map.file = fileURLToPath(map.file)
    }

    // fix paths if Windows style paths
    if (/\\/.test(map.file)) {
      map.file = map.file.replace(/\\/g, '/')
    }

    // and fix "sources:" paths too
    map.sources.map((path, index) => {
      if (/file:/i.test(path)) {
        path = fileURLToPath(path)
      }
      // make relative path if need
      if (relativePath) {
        let base = file.base
        if (/^\/?/.test(base)) {
          base = file.base.replace(/^\/?/, '')
        }
        path = relative(base, path)
      }
      if (/\\/.test(path)) {
        path = path.replace(/\\/g, '/')
      }
      map.sources[index] = path
    })

    if (!file.sourceMap) {
      throw new Error('sourcemap not enable')
    } else {
      file.sourceMap = map
    }
  }
}

function getFiles(contentArray: string[], ignore: string | string[] | undefined) {
  return contentArray.reduce((acc: string[], content: string) => {
    return [...acc, ...glob.sync(content, { ignore })]
  }, [])
}

async function purge(file: File, options: UserDefinedOptions) {
  // buffer
  if (file.isBuffer()) {
    const content = options.content as string[]
    const optionsGulp = {
      ...options,
      content: getFiles(content, options.skippedContentGlobs),
      css: [
        {
          raw: file.contents.toString(),
        },
      ],
      stdin: true,
      sourceMap: false,
    }
    const purgedCSSResults = await new PurgeCSS().purge(optionsGulp)
    const purge = purgedCSSResults[0]
    const result = optionsGulp.rejected && purge.rejected ? purge.rejected.join(' {}\n') + ' {}' : purge.css
    file.contents = Buffer.from(result, 'utf-8')
    // apply source map to the chain
    if (file.sourceMap && purge.sourceMap) {
      file.sourceMap = purge.sourceMap
    }
  }
}
