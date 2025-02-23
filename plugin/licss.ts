import File from 'vinyl'
import { Buffer } from 'node:buffer'
import browserslist from 'browserslist'
import through2 from 'through2'
import { bundle, transform, browserslistToTargets, Targets } from 'lightningcss'
import { RawSourceMap } from 'source-map'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { compileStringAsync, OutputStyle, Syntax } from 'sass'

export default function licss(
  options: { minify?: boolean | undefined; loadPaths?: string[] | undefined } = {
    minify: true,
    loadPaths: undefined,
  }
) {
  return through2.obj(async function (file: File, _, cb) {
    if (file.stem.startsWith('_')) {
      cb()
      return
    }
    if (file.isBuffer()) {
      try {
        const targets: Targets = browserslist.loadConfig({ path: file.cwd })
          ? browserslistToTargets(browserslist(browserslist.loadConfig({ path: file.cwd }) ?? browserslist.defaults))
          : browserslistToTargets(browserslist('> 0.2%, last 2 major versions, not dead'))
        const filename = file.path
        const minify = options.minify ? true : false
        const sourceMap = file.sourceMap ? true : false

        const compileTransformOptions = {
          targets,
          filename,
          minify,
          inputSourceMap: '',
          sourceMap,
          code: Buffer.from(''),
        }
        const compileBundleOptions = {
          targets,
          filename,
          minify,
          sourceMap,
        }

        // compile sass or scss files
        if (file.extname === '.sass' || file.extname === '.scss') {
          // sass compile options
          const syntax: Syntax | undefined = file.extname === '.sass' ? 'indented' : 'scss'
          const style: OutputStyle | undefined = 'expanded'
          const loadPaths: string[] = options.loadPaths
            ? [...options.loadPaths]
            : [dirname(file.path), join(file.cwd, 'node_modules')]

          const sassOptions = {
            url: pathToFileURL(file.path),
            loadPaths: loadPaths,
            syntax: syntax,
            style: style,
            sourceMap: sourceMap,
            sourceMapIncludeSources: true,
          }
          // sass compile
          const fileContents = String(file.contents).toString()
          const result = await compileStringAsync(fileContents, sassOptions)
          file.extname = '.css'

          // use sass map
          const sassMap = result.sourceMap as RawSourceMap | undefined

          // compile lightningcss
          compileTransformOptions.filename = file.path
          compileTransformOptions.code = Buffer.from(result.css)

          if (sourceMap && sassMap) {
            // compile lightningcss with map
            parseSourceMap(file, sassMap)
            compileTransformOptions.inputSourceMap = JSON.stringify(sassMap)
            const { code, map } = transform(compileTransformOptions)
            file.contents = Buffer.from(code.toString())
            file.sourceMap = JSON.parse(String(map).toString())
          } else {
            // compile lightningcss and no map
            const { code } = transform(compileTransformOptions)
            file.contents = Buffer.from(code.toString())
          }
        } else {
          // compile css file with use lightningcss
          const { code, map } = bundle(compileBundleOptions)
          file.contents = Buffer.from(code.toString())

          // if need map
          if (sourceMap) {
            const mapContent: RawSourceMap = JSON.parse(String(map).toString())
            parseSourceMap(file, mapContent)
            file.sourceMap = mapContent
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    cb(null, file)
  })
}

function parseSourceMap(file: File, sourceMap: RawSourceMap) {
  if (file.sourceMap && typeof file.sourceMap === 'string') {
    file.sourceMap = JSON.parse(file.sourceMap)
  }
  // insert file in to map
  if (!sourceMap.file) sourceMap.file = file.relative
  sourceMap.file = sourceMap.file.replace(/\\/g, '/')
  // made path to relative
  sourceMap.sources.map((path, index) => {
    if (/file:/i.test(path)) {
      path = fileURLToPath(path)
    }
    let base = file.base
    if (/^\/?/.test(base)) {
      base = file.base.replace(/^\/?/, '')
    }
    path = relative(base, path)
    path = path.replace(/\\/g, '/')
    sourceMap.sources[index] = path
  })
}
