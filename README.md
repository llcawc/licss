# licss

Gulp plugin for processing styles with support for `.css`, `.scss`, `.sass`, and `.pcss` files. Optimizes, minifies, and removes unused CSS via PurgeCSS integration. Supports Bootstrap and other frameworks. Optimized for Bootstrap 5.3+ (uses Dart Sass 1.99.0)

## Features

### 1. Compiler Selection

Uses either [Sass/SCSS](https://github.com/sass/embedded-host-node) (Embedded Sass Host) for compilation and [LightningCSS](https://github.com/parcel-bundler/lightningcss) (from Parcel) for minification.

All file types support style imports via `@import`.

**Deprecation warnings silenced**: The following Sass compiler deprecations are automatically silenced: `import`, `color-functions`, `global-builtin`, `legacy-js-api`, `if-function`

### 2. Minification + Autoprefixer

LightningCSS handles CSS concatenation and minification, including automatic vendor prefixing based on browserslist.

### 3. PurgeCSS Integration

Removes unused CSS via PurgeCSS. PurgeCSS configuration is provided via the `purgeCSSoptions` option. Refer to the [PurgeCSS](https://purgecss.com/) documentation for details.

### 4. Source Map Management

Generates or updates source maps for debugging (controlled by Gulp's `sourcemaps` flag). Normalizes paths in source maps for cross‑platform consistency.

### 5. Validation & Error Handling

Validates file extensions, compiler/post‑processing options, and load paths. Throws descriptive errors for unsupported inputs.

### 6. File Renaming

The plugin includes a `rename` utility for flexible file naming:

- `basename` – replace the entire file name (including extension)
- `extname` – change the file extension (e.g., `.css`)
- `suffix` – add a suffix before the extension (e.g., `.min`)

The utility is compatible with `gulp‑rename` and can be used in the same pipeline.

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
        verbose: true, // display processing progress messages
      }),
    )
    .pipe(rename({ suffix: ".min", extname: ".css" }))
    .pipe(dest("dist/css", { sourcemaps: "." })); // for external source maps
  // or `{ sourcemaps: true }` for inline source maps
}
// export
export { styles };
```

## Configuration

### Options

```ts
interface LicssOptions {
  minify?: boolean | undefined;
  loadPaths?: string[] | undefined;
  purgeCSSoptions?: UserDefinedOptions | undefined;
  verbose?: boolean | undefined;
}
```

### Default Values

```ts
{
    minify: true,
    loadPaths: [dirname(file.path), join(file.cwd, 'node_modules')],
    purgeCSSoptions: undefined,
    verbose: false,
}
```

## Examples

### Processing CSS Files

```ts
import { src, dest } from "gulp";
import { licss } from "licss";

function css() {
  return src(["src/styles/*.css"], { sourcemaps: true })
    .pipe(licss({ minify: false }))
    .pipe(dest("dist/css", { sourcemaps: "." }));
}
```

### Processing Sass/SCSS with PurgeCSS

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
- `pnpm fix` – automatically fix lint issues
- `pnpm check` – check code formatting without changes
- `pnpm fmt` – format code with oxfmt
- `pnpm validate` – run lint and TypeScript type check
- `pnpm typecheck` – TypeScript type check only
- `pnpm tsc` – alias for `typecheck`
- `pnpm dev` – build in watch mode
- `pnpm build` – build TypeScript to JavaScript

## License

MIT License ©2026 by pasmurno from [llcawc](https://github.com/llcawc). Made with <span style="color:red;">❤</span> for beautiful architecture.
