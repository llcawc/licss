// import modules
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { rollup } from 'rollup'

import { deleteAsync } from 'del'
import { dest, series, src, watch } from 'gulp'
import licss, { rename } from './index.js'

// variables & paths
const purgecss = {
  content: ['src/*.html', 'src/assets/scripts/**/*.ts'],
}
const purge = {
  content: [
    'src/html/**/*.html',
    'src/assets/scripts/**/*.ts',
    'node_modules/bootstrap/js/dist/dom/*.js',
    'node_modules/bootstrap/js/dist/dropdown.js',
  ],
  safelist: [/show/],
  keyframes: true,
}

// styles task
async function css() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/*.html'])
  await scripts('src/assets/scripts/main.ts')
  return src(['src/styles/css/main.css'], { sourcemaps: true })
    .pipe(licss({ minify: true, purgeOptions: purgecss }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}
async function pcss() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/*.html'])
  await scripts('src/assets/scripts/main.ts')
  return src(['src/styles/pcss/main.pcss'], { sourcemaps: false })
    .pipe(licss({ minify: true, purgeOptions: purgecss }))
    .pipe(rename({ extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}
async function scss() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/html/*.html'])
  await scripts('src/assets/scripts/script.ts')
  return src(['src/styles/scss/main.scss'], { sourcemaps: true })
    .pipe(licss({ minify: true, purgeOptions: purge }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}
async function sass() {
  await deleteAsync(['dist/css/*', 'dist/js/*'])
  copy(['src/html/*.html'])
  await scripts('src/assets/scripts/script.ts')
  return src(['src/styles/sass/main.sass'])
    .pipe(licss())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest('dist/css'))
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
      babel({ presets: ['@babel/preset-env'], babelHelpers: 'bundled' }),
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

function monitor() {
  watch(['src/styles/css/**/*.css'], css)
  watch(['src/styles/pcss/**/*.pcss'], pcss)
  watch(['src/styles/scss/**/*.scss'], scss)
  watch(['src/styles/sass/**/*.sass'], sass)
}

// export
export { clean, css, fonts, images, monitor, pcss, sass, scss }
export const assets = series(clean, images, fonts)
