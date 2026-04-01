# licss

Gulp plugin "licss" designed for style transformation workflows, and supported `.css`, `.scss`, `.sass` and `.pcss` files. You can use it to process Bootsrtap framework CSS files (sass version 1.78.0 was used here for the stop warning).

Its main features include:

1. #### Compiler Selection

The plugin uses the [SASS/SCSS](https://github.com/sass) (Dart SASS) or [LightningCSS](https://github.com/parcel-bundler/lightningcss) (from Parcel) compiler for CSS files depending on the configuration (options "compiler"). LightningCSS is then used for CSS concatenation/minification, including compatibility with target browsers (via browserslist).

CSS, SASS and SCSS style files are first processed by the SASS processor, with import entries pre-set in the files. The LightningCSS compiler is used for post-processing. For other style files with extensions other than SASS, SCSS and CSS (e.g. postcss style files), only LightningCSS processing is used.

All files can use the import of style files with the `@import`.

To create source map files, you need to use the `src()` and `dest()` functions option, details in the GALP documentation.

2. #### Post-Processing

Supports options like:

- full: Minify + Autoprefixer
- minify: Only minify CSS
- autoprefixer: Add vendor prefixes
- none: Skip post-processing

For browser support, use the browserlist settings, the default settings are `"> 0.2%, last 2 major versions, not dead"`.

3. #### PurgeCSS Integration

Removes unused CSS in production builds (via purgeTransform). Respects content globs and skippedContentGlobs for pruning. If the PurgeCSS option is enabled, a new source map is created after purging the file.

You can create a configuration for PurgeCSS use [this](https://purgecss.com/configuration.html) docunentation.

4. #### Source Map Management

Generates/updates source maps for debugging (controlled by sourceMap flag). Normalizes paths in maps for cross-platform consistency.

5. #### Validation & Error Handling

Validates file extensions, compiler/postprocess options, and load paths. Throws descriptive errors for unsupported inputs.

6. #### Rename files

if you need to rename a file, you can import the gulp function "rename" from licss

### install:

```
npm add -D licss
```

options:

```
options?: {
    compiler?: 'sass' | 'lightningcss' // use SASS/SCSS or LightningCSS compiler for CSS files
    postprocess?: 'full' | 'minify' | 'autoprefixer' | 'none' // Post-Processing via LightningCSS
    loadPaths?: string[]  // paths for files to imports for SASS/SCSS compiler
    purgeOptions?: UserDefinedOptions  // remove unused CSS from file - options PurgeCSS
    silent?: boolean // enable/disable information messages about the progress of the compilation process
}
```

default options:

```
{
    compiler: 'sass',
    postprocess: 'full',
    loadPaths: [dirname(file.path), join(file.cwd, 'node_modules')]
    purgeOptions: null,
    silent: true // disable
}
```

### sample:

```
import { src, dest, series } from 'gulp'
import licss, { rename } from 'licss'

const purgecss = {
  content: ['src/*.html', 'src/assets/scripts/**/*.ts'],
}

// sample task for css files
function css() {
  return src(['src/styles/*.css'], { sourcemaps: true })
    .pipe(licss({
        silent: false,
        compiler: 'lightningcss',
        postprocess: 'minify',
        purgeOptions: purgecss,
      }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// sample task for sass files
function sass() {
  return src(['src/sass/*.{sass,scss}'], { sourcemaps: true })
    .pipe(licss({
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
      }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// sample task for postcss files
function pcss() {
  return src(['src/pcss/styles/main.pcss'], { sourcemaps: true })
    .pipe(licss({
        silent: false,
        postprocess: 'autoprefixer',
        purgeOptions: {
          content: ['src/pcss/*.html', 'src/assets/scripts/**/*.ts'],
        },
      }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// sample task for scss files
function scss(cb) {
  src(['src/scss/main.scss'], { sourcemaps: true })
    .pipe(licss({ postprocess: 'minify' }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
  cb()
  return
}

export { css, sass, pcss, scss }
```

---

MIT License ©2025 by pasmurno from [llcawc](https://github.com/llcawc). Made with <span style="color:red;">❤</span> to beautiful architecture.
