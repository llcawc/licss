# licss

> gulp plugin for style transformation - bundles, compiles, minimizes, rename and cleans up sass, scss, css, and postcss stylesheets with Lightning CSS and SASS API.
> use it for bootsrtap 5.3.7 (for the stop warning, sass v.1.78.0 was used here)

install:

```
npm add -D licss
```

options:

```
options?: {
    minify?: boolean | undefined;     // for minify css file
    loadPaths?: string[] | undefined; // paths for files to imports
    purgeOptions?: UserDefinedOptions | undefined; // remove unused CSS from file
}
```

- "minify": (default: true) - removes as many extra characters as possible, and writes the entire stylesheet on a single line - for sass and css files

- "loadPaths": (default: ['sass/scss file path', 'node_modules']) - Paths in which to look for stylesheets loaded by rules like @use and @import - only for sass files

- "purgeOptions": (default: undefined) - remove unused CSS from files used PurgeCSS API. This option only works if no source code mappings are created.

- for source map files use { sourcemaps: true } / { sourcemaps: '.' } in gulp "src" and gulp "dest" functions (go to gulp docs)

- if you need to rename a file, you can import the gulp function "rename" from licss.

sample:

```
import { src, dest, series } from 'gulp'
import licss, { rename } from 'licss'

const purgecss = {
  content: ['src/*.html', 'src/assets/scripts/**/*.ts'],
}

// sample task for css files
function css() {
  return src(['src/styles/*.css'])
    .pipe(licss({ minify: true, purgeOptions: purgecss }))
    .pipe(dest('dist/css'))
}

// sample task for sass/scss files
function sass() {
  return src(['src/sass/*.{sass,scss}'], { sourcemaps: false })
    .pipe(licss({
      minify: true, loadPaths: ['vendor/style'], purgeOptions: {
        content: [
          'src/html/**/*.html',
          'src/assets/scripts/**/*.ts',
          'node_modules/bootstrap/js/dist/dom/*.js',
          'node_modules/bootstrap/js/dist/dropdown.js',
        ],
        safelist: [/show/],
        keyframes: true,
      }
    }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// sample task for postcss files
async function pcss() {
  return src(['src/pcss/styles/main.pcss'], { sourcemaps: true })
    .pipe(licss({ minify: true }))
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

export { css, sass, pcss }
```

CSS, SASS and SCSS style files are processed by the SASS processor, with preliminary fixation of import records in files. For production, these files are additionally processed by Lightning CSS if source maps are not enabled.

If the creation of a source map is enabled, then only the SASS processor will be used.

For other style files with an extension different from SASS SCSS and CSS (for example, post CSS style files), only Lightning CSS processing is used.

All files can use the import of style files with the `@import`.

For browser support, use the browserlist settings, the default settings are `"> 0.2%, last 2 major versions, not dead"`.

To create source map files, you need to use the `src()` and `dest()` functions option, details in the GALP documentation.

You can create a configuration for PurgeCSS use [this](https://purgecss.com/configuration.html) docunentation.

---

MIT License ©2025 by pasmurno from [llcawc](https://github.com/llcawc). Made with <span style="color:red;">❤</span> to beautiful architecture.
