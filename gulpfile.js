// import modules
import { deleteAsync } from 'del'
import { dest, series, src } from 'gulp'
import compiler from 'tscom'
import licss, { rename } from './index.js'

// css task
async function css(cb) {
  await deleteAsync(['dist/css/*', 'dist/js/*', 'dist/*.html'])
  await scripts('src/assets/scripts/main.ts')
  src(['src/css/*.html']).pipe(dest('dist'))
  src(['src/css/main.*'], { sourcemaps: true })
    .pipe(
      licss({
        silent: false,
        compiler: 'lightningcss',
        postprocess: 'minify',
      })
    )
    .pipe(dest('dist/css', { sourcemaps: '.' }))
  cb()
  return
}

// pcss task
async function pcss(cb) {
  await deleteAsync(['dist/css/*', 'dist/js/*', 'dist/*.html'])
  await scripts('src/assets/scripts/main.ts')
  src(['src/pcss/*.html']).pipe(dest('dist'))
  src(['src/pcss/main.pcss'], { sourcemaps: true })
    .pipe(
      licss({
        silent: false,
        postprocess: 'autoprefixer',
        purgeOptions: {
          content: ['src/pcss/*.html', 'src/assets/scripts/**/*.ts'],
        },
      })
    )
    .pipe(dest('dist/css', { sourcemaps: '.' }))
  cb()
  return
}

// scss task
async function scss(cb) {
  await deleteAsync(['dist/css/*', 'dist/js/*', 'dist/*.html'])
  await scripts('src/assets/scripts/script.ts')
  src(['src/scss/*.html']).pipe(dest('dist'))
  src(['src/scss/main.scss'], { sourcemaps: true })
    .pipe(licss({ postprocess: 'minify' }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
  cb()
  return
}

// sass task
async function sass(cb) {
  await deleteAsync(['dist/css/*', 'dist/js/*', 'dist/*.html'])
  await scripts('src/assets/scripts/script.ts')
  src(['src/sass/*.html']).pipe(dest('dist'))
  src(['src/sass/main.sass'], { sourcemaps: true })
    .pipe(
      licss({
        silent: false,
        postprocess: 'full',
        purgeOptions: {
          content: [
            'src/sass/*.html',
            'src/assets/scripts/**/*.ts',
            'node_modules/bootstrap/js/dist/dom/*.js',
            'node_modules/bootstrap/js/dist/dropdown.js',
          ],
          safelist: [/show/],
          keyframes: true,
        },
      })
    )
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
  cb()
  return
}

// scripts task
async function scripts(src) {
  return compiler({
    input: src,
    dir: 'dist/js',
  })
}

// clean task
async function clean() {
  await deleteAsync(['dist'])
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
export { clean, css, fonts, images, pcss, sass, scss }
export const assets = series(clean, images, fonts)
