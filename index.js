import browserslist from 'browserslist';
import colors from 'colors';
import log from 'fancy-log';
import * as glob from 'glob';
import { browserslistToTargets, bundle, transform } from 'lightningcss';
import { Buffer } from 'node:buffer';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import PluginError from 'plugin-error';
import { PurgeCSS } from 'purgecss';
import { compileString } from 'sass';
import through2 from 'through2';
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
export default function licss(options = {}) {
    return through2.obj(async function (file, _, cb) {
        // Skip null files
        if (file.isNull()) {
            return cb(null, file);
        }
        // Reject streams
        if (file.isStream()) {
            cb(new PluginError('licss', 'Streams are not supported'));
            return;
        }
        // Skip partials
        if (file.stem.startsWith('_')) {
            cb();
            return;
        }
        if (file.isBuffer()) {
            try {
                const compiler = options.compiler ?? 'sass';
                const postpro = options.postprocess ?? 'full';
                const loadPaths = options.loadPaths ?? [dirname(file.path), join(file.cwd, 'node_modules')];
                const purgeOptions = options.purgeOptions ?? null;
                const silent = options.silent ?? true;
                const extname = file.extname.split('.').pop()?.toLowerCase() ?? '';
                // Validate file extension
                if (!/^(css|scss|sass|pcss)$/i.test(extname)) {
                    throw new Error('• "licss": Unsupported file extension. Supported: .css, .scss, .sass, .pcss');
                }
                // Validate compiler
                if (options.compiler && !/^(sass|lightningcss)$/i.test(compiler)) {
                    throw new Error('• "licss": Unsupported "compiler" option.\nSupported: "sass", "lightningcss" or undefined. Default: "sass"');
                }
                // Validate postprocess
                if (options.postprocess && !/^(full|minify|autoprefixer|none)$/i.test(postpro)) {
                    throw new Error('• "licss": Unsupported "postprocess" option.\nSupported: "full", "minify", "autoprefixer", "none" or undefined. Default: "full"');
                }
                // get list supported browsers
                const targetsList = getTargets(file.cwd);
                const prefix = postpro === 'autoprefixer' || postpro === 'full';
                const minify = postpro === 'minify' || postpro === 'full';
                const isPurgMin = purgeOptions ? false : minify; // no initial minify if purge enabled
                const isSassMin = prefix ? false : isPurgMin; // no initial minify if on autoprefixer
                const sourceMap = file.sourceMap ? true : false;
                const isCssFile = /^css$/i.test(extname);
                const isSassFile = /^(sass|scss)$/i.test(extname);
                if (!silent) {
                    mess(file, `INFO: postprocess: ${postpro}, minify: ${minify}, autoprefixer: ${prefix}, file:`);
                }
                // Bundle process based on file type
                if ((isCssFile && compiler === 'sass') || isSassFile) {
                    // used SASS compiler
                    if (!silent) {
                        mess(file, 'Run SASS compiler for file:');
                    }
                    await handleSassCompilation(file, isSassMin, loadPaths, sourceMap);
                    if (prefix) {
                        // used postprocess compiler on base LightningCSS
                        if (!silent) {
                            mess(file, 'Run postprocess compiler on base LightningCSS for file:');
                        }
                        await handleLightningCSSCompilation(file, isPurgMin, prefix, targetsList, sourceMap, 'many');
                    }
                }
                else {
                    // used LightningCSS Bundle compiler
                    if (!silent) {
                        mess(file, 'Run LightningCSS Bundle compiler for file:');
                    }
                    await handleLightningcssBundle(file, isPurgMin, prefix, targetsList, sourceMap);
                }
                if (purgeOptions) {
                    // Purge unused CSS in production
                    if (!silent) {
                        mess(file, 'Purge unused CSS in file:');
                    }
                    await purgeTransform(file, purgeOptions);
                    if (!purgeOptions.rejected) {
                        await handleLightningCSSCompilation(file, minify, prefix, targetsList, sourceMap, 'one');
                    }
                }
            }
            catch (err) {
                cb(new PluginError('licss', err, { fileName: file.path }));
            }
        }
        cb(null, file);
    });
}
// logs results of the conversion process
function mess(file, message) {
    return log(colors.cyan('licss ') + colors.red('★ ') + colors.magenta(message + ' ') + colors.blue(file.relative));
}
// Get target browsers from browserslist
function getTargets(cwd) {
    const config = browserslist.loadConfig({ path: cwd }) ?? browserslist('> 0.2%, last 2 major versions, not dead');
    return browserslistToTargets(browserslist(config));
}
// Transform CSS with LightningCSS
async function handleLightningCSSCompilation(file, minify, prefix, targetsList, sourceMap, type) {
    if (file.isBuffer()) {
        const result = transform({
            targets: type === 'one' ? undefined : prefix ? targetsList : undefined,
            filename: file.basename,
            minify,
            inputSourceMap: type === 'one' ? undefined : sourceMap ? JSON.stringify(file.sourceMap) : undefined,
            sourceMap,
            code: Buffer.from(new TextDecoder().decode(file.contents)),
            projectRoot: type === 'one' ? file.base : undefined,
        });
        file.extname = '.css';
        file.contents = Buffer.from(new TextDecoder().decode(result.code));
        if (result.map)
            file.sourceMap = JSON.parse(new TextDecoder().decode(result.map));
    }
}
// Bundle CSS with LightningCSS
async function handleLightningcssBundle(file, minify, prefix, targetsList, sourceMap) {
    if (file.isBuffer()) {
        const result = bundle({
            targets: prefix ? targetsList : undefined,
            filename: file.path,
            minify,
            sourceMap,
            projectRoot: file.base,
        });
        file.extname = '.css';
        file.contents = Buffer.from(new TextDecoder().decode(result.code));
        if (result.map)
            file.sourceMap = JSON.parse(new TextDecoder().decode(result.map));
    }
}
// Compile sass/scss
async function handleSassCompilation(file, minify, loadPaths, makeSourceMap) {
    if (file.isBuffer()) {
        const result = compileString(parseImport(file), {
            url: pathToFileURL(file.path),
            loadPaths,
            syntax: file.extname === '.sass' ? 'indented' : 'scss',
            style: minify ? 'compressed' : 'expanded',
            sourceMap: makeSourceMap,
            sourceMapIncludeSources: true,
        });
        file.extname = '.css';
        file.contents = Buffer.from(result.css);
        if (makeSourceMap && result.sourceMap) {
            addSourceMap(file, JSON.parse(JSON.stringify(result.sourceMap)));
        }
    }
}
// Add or update source map
function addSourceMap(file, map) {
    if (file.isBuffer()) {
        map.file = file.relative.replace(/\\/g, '/');
        map.sources = map.sources.map((path) => {
            if (path.startsWith('file:')) {
                path = fileURLToPath(path);
            }
            const basePath = file.base;
            path = relative(basePath, path);
            return path.replace(/\\/g, '/');
        });
        file.sourceMap = map;
    }
}
// Resolve file paths via glob
function getFiles(contentArray, ignore) {
    return contentArray.reduce((acc, content) => {
        return [...acc, ...glob.sync(content, { ignore })];
    }, []);
}
// Clean import statements
function parseImport(file) {
    return String(file.contents).replace(/@import +([url(]*)["']([./]*)([a-z-_/]+)\.?(.*)['"]\)?/gi, '@import "$2$3"');
}
// Purge unused CSS
async function purgeTransform(file, options) {
    if (file.isBuffer()) {
        const processedContent = getFiles(options.content, options.skippedContentGlobs);
        const purgedCSSResults = await new PurgeCSS().purge({
            ...options,
            content: processedContent,
            css: [
                {
                    raw: file.contents.toString(),
                },
            ],
            stdin: true,
            sourceMap: false,
        });
        const purge = purgedCSSResults[0];
        const result = options.rejected && purge.rejected ? purge.rejected.join(' {}\n') + ' {}' : purge.css;
        file.contents = Buffer.from(result, 'utf8');
    }
}
