# licss

Gulp plugin for processing styles with support for `.css`, `.scss`, `.sass`, and `.pcss` files. Optimizes, minifies, and removes unused CSS with PurgeCSS integration. Supports Bootstrap and other frameworks. Optimized for Bootstrap 5.3+ (Sass 1.78.0)

## Features

### 1. Compiler Selection

Uses either [SASS/SCSS](https://github.com/sass/embedded-host-node) (Embedded Sass Host) or [LightningCSS](https://github.com/parcel-bundler/lightningcss) (from Parcel) depending on the `compiler` option.

All files support importing styles via `@import`.

### 2. Minification + Autoprefixer

LightningCSS performs CSS concatenation and minification, including automatic vendor prefixing based on browserslist.

### 3. PurgeCSS Integration

Removes unused CSS via PurgeCSS. PurgeCSS configuration is set through the `purgeCSSoptions` option. See documentation on the [PurgeCSS](https://purgecss.com/) website.

### 4. Source Map Management

Generates/updates source maps for debugging (controlled by the `sourcemaps` flag in Gulp). Normalizes paths in maps for cross‑platform consistency.

### 5. Validation & Error Handling

Validates file extensions, compiler/post‑processing options, and load paths. Throws descriptive errors for unsupported inputs.

### 6. File Renaming

The plugin includes a `rename` utility for flexible file naming:

```javascript
import { rename } from "licss";

// Change basename (file stem and file extension, or without file extension)
.pipe(rename({ basename: "main.css" }))

// Add suffix
.pipe(rename({ suffix: ".min" }))

// Change extension
.pipe(rename({ extname: ".css" }))

// Combine options
.pipe(rename({ basename: "main", suffix: ".min", extname: ".css" }))
```

## Quick Start

### Installation

```sh
pnpm add -D licss
```

or

```sh
npm install --save-dev licss
```

or

```sh
yarn add -D licss
```

### Basic Usage

```js
// import modules
import { dest, src } from "gulp";
import { licss, rename } from "licss";
// sample task for CSS files
function styles() {
  return src(["src/styles/main.css"], { sourcemaps: true })
    .pipe(
      licss({
        purgeCSSoptions: {
          content: ["src/*.html", "src/scripts/*.ts"],
        },
      }),
    )
    .pipe(rename({ suffix: ".min", extname: ".css" }))
    .pipe(dest("dist/css", { sourcemaps: "." })); // for file sourcemap
  // or .. { sourcemaps: true } for inline sourcemap
}
// export
export { styles };
```

## Configuration

### Options

```ts
interface LicssOptions {
  compiler?: "sass" | "lightningcss" | undefined;
  minify?: boolean | undefined;
  loadPaths?: string[] | undefined;
  purgeCSSoptions?: UserDefinedOptions | undefined;
  verbose?: boolean | undefined;
}
```

### Default Values

```ts
{
    compiler: 'lightningcss',
    minify: true,
    loadPaths: [dirname(file.path), join(file.cwd, 'node_modules')],
    purgeCSSoptions: undefined,
    verbose: false,
}
```

## Examples

### Processing CSS Files with SASS processor

```ts
import { src, dest } from "gulp";
import { licss } from "licss";

function css() {
  return src(["src/styles/*.css"], { sourcemaps: true })
    .pipe(licss({ compiler: "sass", minify: false }))
    .pipe(dest("dist/css", { sourcemaps: "." }));
}
```

### Processing SASS/SCSS with PurgeCSS

```ts
function sass() {
  return src(["src/sass/*.{sass,scss}"], { sourcemaps: true })
    .pipe(
      licss({
        minify: false,
        purgeCSSoptions: {
          content: [
            "src/**/*.html",
            "src/assets/scripts/**/*.ts",
            "node_modules/bootstrap/js/dist/**/*.js",
          ],
          safelist: [/show/],
          keyframes: true,
        },
      }),
    )
    .pipe(rename({ suffix: ".min", extname: ".css" }))
    .pipe(dest("dist/css", { sourcemaps: "." }));
}
```

### Processing PostCSS Files

```ts
function pcss() {
  return src(["src/pcss/styles/main.pcss"], { sourcemaps: true })
    .pipe(
      licss({
        purgeCSSoptions: {
          content: ["src/pcss/*.html", "src/assets/scripts/**/*.ts"],
        },
      }),
    )
    .pipe(rename({ suffix: ".min", extname: ".css" }))
    .pipe(dest("dist/css", { sourcemaps: true }));
}
```

### Processing SCSS with Minification

```ts
function scss() {
  return src(["src/scss/style.scss"])
    .pipe(licss())
    .pipe(rename({ basename: "main.min.css" }))
    .pipe(dest("dist/css"));
}
```

## Types

The plugin exports the following TypeScript types:

```ts
import type { LicssOptions, RenameOptions, UserDefinedOptions } from "licss";
```

- `LicssOptions` – options for the `licss()` function
- `RenameOptions` – options for the built‑in `rename()` function (compatible with `gulp‑rename`)
- `UserDefinedOptions` – PurgeCSS options type (re‑exported from `purgecss`)

### Project Scripts

- `pnpm test` – run Vitest tests
- `pnpm lint` – lint code with oxlint
- `pnpm fmt` – format code with oxfmt
- `pnpm build` – build TypeScript to JavaScript
- `pnpm dev` – build in watch mode

## License

MIT License ©2026 by pasmurno from [llcawc](https://github.com/llcawc). Made with <span style="color:red;">❤</span> to beautiful architecture.
