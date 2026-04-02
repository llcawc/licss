import { Transform } from "node:stream";
import { UserDefinedOptions } from "purgecss";

//#region src/licss.d.ts
interface LicssOptions {
  minify?: boolean | undefined;
  loadPaths?: string[] | undefined;
  purgeCSSoptions?: UserDefinedOptions | undefined;
  verbose?: boolean | undefined;
}
interface RenameOptions {
  basename?: string | undefined;
  extname?: string | undefined;
  suffix?: string | undefined;
}
/**
 * Gulp plugin for style transformation - bundles, compiles, minimizes, and cleans up sass, scss, css, and postcss style sheets.
 * @param minify use LightningCSS for minify CSS files
 * @param loadPaths paths for files to imports for SASS/SCSS compiler
 * @param purgeCSSoptions remove unused CSS from file - options PurgeCSS
 * @param verbose display more messages
 * @returns Transform stream.
 *
 * @example
 *
 * ```js
 * // import modules
 * import { dest, src } from 'gulp'
 * import { licss, rename } from 'licss'
 *
 * // sample task for postcss files
 * function styles() {
 *   return src(['src/styles/main.css'], { sourcemaps: true })
 *   .pipe(licss({
 *       purgeCSSoptions: {
 *         content: ["src/*.html", "src/scripts/*.ts"],
 *       },
 *     }))
 *   .pipe(rename({ suffix: '.min', extname: '.css' }))
 *   .pipe(dest('dist/css', { sourcemaps: '.' })) // for file sourcemap
 *                 // or .. { sourcemaps: true } for inline soutcemap
 * }
 *
 * // export
 * export { styles }
 *
 * ```
 */
declare function licss({
  minify,
  loadPaths,
  purgeCSSoptions,
  verbose
}?: LicssOptions): Transform;
/**
 * Gulp plugin for rename file - change extname or/and added suffix
 * @param basename - new file name (file stem and file extension)
 * @param extname - new file extension
 * @param suffix - new file suffix
 */
declare function rename({
  basename,
  extname,
  suffix
}?: RenameOptions): Transform;
//#endregion
export { type LicssOptions, type RenameOptions, type UserDefinedOptions, licss, rename };