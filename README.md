# licss

> gulp plugin. bundles, compiles and minifies sass, scss, css and postcss stylesheets with Lightning CSS and sass.
> use it for bootsrtap 5.3.3 (for the stop warning, sass v.1.77.4 was used here)

install:

```
npm add -D licss
```

options:

```
options?: {
    minify?: boolean | undefined;     // for minify css file
    loadPaths?: string[] | undefined; // paths for files to imports
}
```

- "minify": (default: true) - removes as many extra characters as possible, and writes the entire stylesheet on a single line - for sass and css files

- "loadPaths": (default: ['sass/scss file path', 'node_modules']) - Paths in which to look for stylesheets loaded by rules like @use and @import - only for sass files

- for source map files use { sourcemaps: true } / { sourcemaps: '.' } in gulp "src" and gulp "dest" functions (go to gulp docs)

sample:

```
import gulp from 'gulp'
import licss from 'licss'
const { src, dest } = gulp

// sample task for sass/scss files for development
function sass() {
  return src(['src/sass/*.{sass,scss}'], { sourcemaps: true })
    .pipe(licss({ minify: false, loadPaths: ['vendor/style'] }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// sample task for css files for productions
function css() {
  return src(['src/styles/*.css'])
    .pipe(licss({ minify: true }))
    .pipe(dest('dist/css'))
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

---

MIT License ©2025 by pasmurno from [llcawc](https://github.com/llcawc). Made with <span style="color:red;">❤</span> to beautiful architecture.
