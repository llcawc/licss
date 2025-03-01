// import modules
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { rollup } from 'rollup'

import { deleteAsync } from 'del'
import rename from 'gulp-ren'
import licss from './plugin/licss.js'

import gulp from 'gulp'
const { src, dest, series } = gulp

// styles task
async function css() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/*.html'])
  await scripts('src/assets/scripts/main.ts')
  return src(['src/styles/css/main.css'], { sourcemaps: true })
    .pipe(licss({ minify: true }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}
async function pcss() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/*.html'])
  await scripts('src/assets/scripts/main.ts')
  return src(['src/styles/pcss/main.pcss'], { sourcemaps: true })
    .pipe(licss({ minify: true }))
    .pipe(rename({ extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}
async function scss() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/html/*.html'])
  await scripts('src/assets/scripts/script.ts')
  return src(['src/styles/scss/main.scss'], { sourcemaps: true })
    .pipe(licss({ minify: false }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}
async function sass() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/html/*.html'])
  await scripts('src/assets/scripts/script.ts')
  return src(['src/styles/sass/main.sass'], { sourcemaps: true })
    .pipe(licss({ minify: false }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// scripts task
async function scripts(src) {
  const bundle = await rollup({
    input: src,
    plugins: [
      typescript({
        compilerOptions: { lib: ['ESNext', 'DOM', 'DOM.Iterable'], target: 'ESNext' },
        include: ['src/assets/scripts/*'],
      }),
      resolve(),
      commonjs({ include: 'node_modules/**' }),
      babel({ babelHelpers: 'bundled' }),
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
async function clean() {
  await deleteAsync(['dist'])
}

// copy task
function copy(source) {
  return src(source).pipe(dest('dist'))
}

// assets task
function images() {
  return src(['src/assets/images/**/*.{ico,jpg,png,svg}'], { encoding: false }).pipe(dest('dist/images'))
}
function fonts() {
  return src(
    [
      'src/assets/fonts/bootstrap-icons/*.woff*',
      'src/assets/fonts/Inter/*.woff*',
      'src/assets/fonts/JetBrains/*.woff*',
    ],
    {
      encoding: false,
    }
  ).pipe(dest('dist/fonts'))
}

// export
export { clean, images, fonts, sass, scss, css, pcss }
export const assets = series(clean, images, fonts)
