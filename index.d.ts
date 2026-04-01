import { UserDefinedOptions } from 'purgecss';
import rename from './rename.js';
export { rename };
/**
 * Gulp plugin for style transformation - bundles, compiles, minimizes, and cleans up sass, scss, css, and postcss style sheets.
 * @param options - optons {}
 * @param options.compiler use SASS/SCSS or LightningCSS compiler for CSS files
 * @param option.postprocess Post-Processing via LightningCSS
 * @param option.loadPaths paths for files to imports for SASS/SCSS compiler
 * @param option.purgeOptions remove unused CSS from file - options PurgeCSS
 * @param option.silent enable/disable information messages about the progress of the compilation process
 * @returns object stream.
 *
 * @example
 *
 * ```js
 * // import modules
 * import { dest, src } from 'gulp'
 * import licss, { rename } from 'licss'
 *
 * // sample task for postcss files
 * function css() {
 *   return src(['src/styles/main.css'], { sourcemaps: true })
 *   .pipe(licss({
 *       silent: false,
 *       postprocess: 'autoprefixer',
 *       purgeOptions: {
 *         content: ["src/*.html", "src/scripts/*.ts"],
 *       },
 *     }))
 *   .pipe(rename({ suffix: '.min', extname: '.css' }))
 *   .pipe(dest('dist/css', { sourcemaps: '.' }))
 * }
 *
 * // export
 * export { css }
 *
 * ```
 */
export default function licss(options?: {
    compiler?: 'sass' | 'lightningcss' | undefined;
    postprocess?: 'full' | 'minify' | 'autoprefixer' | 'none' | undefined;
    loadPaths?: string[] | undefined;
    purgeOptions?: UserDefinedOptions | undefined;
    silent?: boolean | undefined;
}): import("stream").Transform;
