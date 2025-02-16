import { Buffer } from 'node:buffer'
import { relative } from 'node:path'
import through2 from 'through2'
import browserslist from 'browserslist'
import { bundle, browserslistToTargets, Targets } from 'lightningcss'
import { RawSourceMap } from 'source-map'

import File from 'vinyl'

export interface mapFile extends File {
  sourceMap: string | RawSourceMap | undefined | null
}

export default function licss(options: { minify?: boolean } = {}) {
  return through2.obj(function (file: mapFile, _, cb) {
    if (file.isBuffer()) {
      try {
        const targets: Targets = browserslist.loadConfig({ path: file.cwd })
          ? browserslistToTargets(browserslist(browserslist.loadConfig({ path: file.cwd }) ?? browserslist.defaults))
          : browserslistToTargets(browserslist('> 0.2%, last 2 major versions, not dead'))
        const filename = file.path
        const minify = options.minify ? true : false
        const sourceMap = file.sourceMap ? true : false

        // compile style
        const { code, map } = bundle({
          targets,
          filename,
          minify,
          sourceMap,
        })

        file.contents = Buffer.from(code.toString())

        if (sourceMap) {
          // add file
          const mapContent: RawSourceMap = JSON.parse(String(map).toString())
          mapContent.file = relative(file.base, filename)

          // fix paths
          mapContent.file = mapContent.file.replace(/\\/g, '/')
          mapContent.sources = mapContent.sources.map(function (path) {
            path = relative(file.base, path)
            path = path.replace(/\\/g, '/')
            return path
          })

          file.sourceMap = mapContent
        }
      } catch (err) {
        console.error(err)
      }
    }
    cb(null, file)
  })
}
