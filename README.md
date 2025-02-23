# licss

> gulp plugin for bundle, compile, mapping and minify sass/scss/css style with Lightning CSS and sass

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

// task for sass/scss files
function sass() {
  return src(['src/sass/*.{sass,scss}'], { sourcemaps: true })
    .pipe(licss({ minify: false, loadPaths: ['vendor/style'] }))
    .pipe(dest('dist/css', { sourcemaps: '.' }))
}

// task for css files
function css() {
  return src(['src/styles/*.css'])
    .pipe(licss())
    .pipe(dest('dist/css'))
}

export { css, sass }
```

---

MIT License ©2025 pasmurno из [llcawc](https://github.com/llcawc). Сделано <span style="color:red;">❤</span> прекрасной архитектуре.
