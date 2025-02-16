// import modules
import { rollup } from 'rollup'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { deleteAsync as del } from 'del'
import gulp from 'gulp'
import licss from './plugin/licss.js'
import server from 'passerve'
const { src, dest, parallel, series, watch } = gulp

function serve(cb) {
  server({ port: 3000, dist: 'dist' })
  cb()
}

function css() {
  return src(['src/styles/*.css'], { sourcemaps: true })
    .pipe(licss({ minify: false }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// styles task
function styles() {
  return src('src/styles/*.css')
    .pipe(licss({ minify: true }))
    .pipe(dest('dist/css'))
}

// scripts task
async function scripts() {
  const bundle = await rollup({
    input: 'src/scripts/main.ts',
    plugins: [
      typescript({
        compilerOptions: { lib: ['ESNext', 'DOM', 'DOM.Iterable'], target: 'ESNext' },
        include: ['src/scripts/*'],
      }),
    ],
  })
  await bundle.write({
    file: 'dist/js/main.js',
    format: 'iife',
    name: 'main',
    plugins: [terser({ format: { comments: false } })],
  })
}

// clean task
function clean() {
  return del(['dist/*'])
}

// copy task
function copy() {
  return src(['src/**/*.html'], { base: 'src' }).pipe(dest('dist'))
}

// assets task
function images() {
  return src(['public/**/*.{ico,jpg,png,svg}'], { encoding: false }).pipe(dest('dist/images'))
}
function fonts() {
  return src(['public/fonts/bootstrap-icons/*.woff*', 'public/fonts/Inter/*.woff*', 'public/fonts/JetBrains/*.woff*'], {
    encoding: false,
  }).pipe(dest('dist/fonts'))
}

//watch task
function watcher() {
  watch('src/**/*.html', copy)
  watch('src/styles/**/*.css', css)
  watch('src/scripts/**/*.ts', scripts)
}

// export
export { clean, copy, images, fonts, css, styles, scripts, serve }
export const assets = series(images, fonts)
export const dev = series(clean, copy, css, scripts, assets, parallel(watcher, serve))
export const build = series(clean, copy, styles, scripts, assets)
