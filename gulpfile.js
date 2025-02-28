// import modules
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { rollup } from 'rollup'
import { deleteAsync as del } from 'del'
import rename from 'gulp-ren'

import licss from './plugin/licss.js'
import gulp from 'gulp'
const { src, dest, series } = gulp

// styles task
async function scss() {
  copy(['src/scss/*.html'])
  await comp('src/scss/scripts/main.ts', ['src/scss/scripts/*'])
  del(['dist/css/*'])
  return src(['src/scss/styles/*.scss'], { sourcemaps: false })
    .pipe(licss({ minify: true }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

async function sass() {
  copy(['src/sass/*.html'])
  await comp('src/sass/scripts/main.ts', ['src/sass/scripts/*'])
  del(['dist/css/*'])
  return src(['src/sass/styles/*.sass'], { sourcemaps: true })
    .pipe(licss({ minify: false }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

async function css() {
  copy(['src/css/*.html'])
  await comp('src/css/scripts/main.ts', ['src/css/scripts/*'])
  del(['dist/css/*'])
  return src(['src/css/styles/main.css'], { sourcemaps: false })
    .pipe(licss({ minify: true }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

async function pcss() {
  copy(['src/pcss/*.html'])
  await comp('src/pcss/scripts/main.ts', ['src/pcss/scripts/*'])
  del(['dist/css/*'])
  return src(['src/pcss/styles/main.pcss'], { sourcemaps: true })
    .pipe(licss({ minify: true }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// scripts task
async function scripts() {
  await comp('src/css/scripts/main.ts', ['src/css/scripts/*'])
}

async function comp(src, path) {
  const bundle = await rollup({
    input: src,
    plugins: [
      typescript({
        compilerOptions: { lib: ['ESNext', 'DOM', 'DOM.Iterable'], target: 'ESNext' },
        include: path,
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
function clean() {
  return del(['dist/*'])
}

// copy task
function copy(source) {
  return src(source).pipe(dest('dist'))
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

// export
export { clean, copy, images, fonts, sass, scss, css, pcss, scripts }
export const dev = series(clean, images, fonts)
