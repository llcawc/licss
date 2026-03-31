import { Buffer } from "node:buffer";
import { dirname, join, relative } from "node:path";
import { Transform } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import browserslist from "browserslist";
import colors from "colors";
import log from "fancy-log";
import { browserslistToTargets, bundle, transform } from "lightningcss";
import PluginError from "plugin-error";
import { PurgeCSS } from "purgecss";
import { compileStringAsync } from "sass-embedded";
import { glob } from "tinyglobby";
//#region src/licss.ts
const textDecoder = new TextDecoder();
/**
* Gulp plugin for style transformation - bundles, compiles, minimizes, and cleans up sass, scss, css, and postcss style sheets.
* @param compiler use SASS/SCSS or LightningCSS compiler for CSS files
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
function licss({ compiler = "lightningcss", minify = true, loadPaths, purgeCSSoptions, verbose = false } = {}) {
	const stream = new Transform({ objectMode: true });
	stream._transform = async (file, _enc, cb) => {
		if (file.isNull()) return cb(null, file);
		if (file.isStream()) return cb(new PluginError("licss", "Streams are not supported"));
		if (file.stem.startsWith("_")) return cb();
		if (file.isBuffer()) try {
			if (!loadPaths) loadPaths = [dirname(file.path), join(file.cwd, "node_modules")];
			const extname = file.extname.split(".").pop()?.toLowerCase() ?? "";
			if (!/^(css|scss|sass|pcss)$/i.test(extname)) throw new Error("• \"licss\": Unsupported file extension. Supported: .css, .scss, .sass, .pcss");
			if (!/^(sass|lightningcss)$/i.test(compiler)) throw new Error("• \"licss\": Unsupported \"compiler\" option.\nSupported: \"sass\", \"lightningcss\" or undefined. Default: \"sass\"");
			const targetsList = getTargets(file.cwd);
			const isPurge = !!purgeCSSoptions;
			const isSourceMap = file.sourceMap ? true : false;
			const isCssFile = /^css$/i.test(extname);
			const isSassFile = /^(sass|scss)$/i.test(extname);
			if (verbose) mess(`options: compiler: ${compiler}, minify: ${minify}, purge: ${isPurge}, sourcemap: ${isSourceMap}, file:`, file);
			if (isSassFile || isCssFile && compiler === "sass") {
				if (verbose) mess("Run SASS compiler for file:", file);
				await bundleSASS(file, loadPaths, isSourceMap);
				if (minify) {
					if (verbose) mess("LightningCSS minify file:", file);
					await transformLightningCSS(file, minify, targetsList, isSourceMap);
				}
			} else {
				if (verbose) mess("Run LightningCSS Bundle compiler for file:", file);
				await bundleLightningCSS(file, minify, targetsList, isSourceMap);
			}
			if (isPurge) {
				if (verbose) mess("Purge unused CSS in file:", file);
				await purgeTransform(file, purgeCSSoptions, isSourceMap);
			}
			cb(null, file);
		} catch (err) {
			throw new PluginError("licss", err instanceof Error ? err : new Error(String(err)), {
				fileName: file.path,
				showStack: true
			});
		}
		else throw new PluginError("licss", { message: "File not found!" });
	};
	return stream;
}
function mess(message, file) {
	return log(colors.cyan("licss ") + colors.red("★ ") + colors.magenta(message + " ") + colors.blue(file.relative));
}
function getTargets(cwd) {
	return browserslistToTargets(browserslist(browserslist.loadConfig({ path: cwd }) ?? browserslist("> 0.2%, last 2 major versions, not dead")));
}
async function transformLightningCSS(file, minify, targetsList, isSourceMap) {
	if (file.isBuffer()) {
		const result = transform({
			targets: minify ? targetsList : void 0,
			filename: file.basename,
			minify,
			inputSourceMap: isSourceMap ? JSON.stringify(file.sourceMap) : void 0,
			sourceMap: isSourceMap,
			code: file.contents,
			projectRoot: file.base
		});
		file.extname = ".css";
		file.contents = Buffer.from(result.code);
		if (result.map) file.sourceMap = JSON.parse(textDecoder.decode(result.map));
	} else throw new Error("transformLightningCSS: File not found!");
}
async function bundleLightningCSS(file, minify, targetsList, isSourceMap) {
	if (file.isBuffer()) {
		const result = bundle({
			targets: minify ? targetsList : void 0,
			filename: file.path,
			minify,
			sourceMap: isSourceMap,
			projectRoot: file.base
		});
		file.extname = ".css";
		file.contents = Buffer.from(result.code);
		if (result.map) file.sourceMap = JSON.parse(textDecoder.decode(result.map));
	} else throw new Error("bundleLightningCSS: File not found!");
}
async function bundleSASS(file, loadPaths, isSourceMap) {
	if (file.isBuffer()) try {
		const result = await compileStringAsync(parseImport(file), {
			url: pathToFileURL(file.path),
			loadPaths,
			syntax: file.extname === ".sass" ? "indented" : "scss",
			sourceMap: isSourceMap,
			sourceMapIncludeSources: true
		});
		file.extname = ".css";
		file.contents = Buffer.from(result.css);
		if (result.sourceMap && isSourceMap) cleanSourceMap(file, JSON.parse(JSON.stringify(result.sourceMap)));
	} catch (err) {
		throw new PluginError("lscss", err instanceof Error ? err : new Error(String(err)), {
			message: "Error! Sass compiler: ",
			fileName: file.path,
			showStack: true
		});
	}
	else throw new Error("bundleSASS: File not found!");
}
function cleanSourceMap(file, map) {
	const basePath = file.base;
	map.file = file.relative.replace(/\\/g, "/");
	map.sources = map.sources.map((path) => {
		if (path.startsWith("file:")) path = fileURLToPath(path);
		path = relative(basePath, path);
		return path.replace(/\\/g, "/");
	});
	file.sourceMap = map;
}
async function getFiles(contentArray, ignore) {
	return await glob(contentArray, { ignore });
}
function parseImport(file) {
	if (file.isBuffer()) return textDecoder.decode(file.contents).replace(/@import +([url(]*)["']([./]*)([a-z-_/]+)\.?(.*)['"]\)?/gi, "@import \"$2$3\"");
	else throw new Error("parseImport: File not found!");
}
async function purgeTransform(file, options, isSourceMap) {
	if (!options || typeof options !== "object" || Array.isArray(options)) throw new Error("Error! Check the type PurgeCSS options.");
	if (!options.content || !Array.isArray(options.content) || options.content.length === 0) throw new Error("Error! PurgeCSS requires a non-empty \"content\" array.");
	if (file.isBuffer()) {
		const mapOptions = {
			inline: false,
			annotation: false,
			prev: isSourceMap ? file.sourceMap : false,
			sourcesContent: true
		};
		const processedContent = await getFiles(options.content, options.skippedContentGlobs);
		const purge = (await new PurgeCSS().purge({
			...options,
			content: processedContent,
			css: [{ raw: textDecoder.decode(file.contents) }],
			stdin: true,
			sourceMap: mapOptions
		}))[0];
		const rejected = options.rejected && purge.rejected && purge.rejected.length > 0 ? purge.rejected.join(" {}\n") + " {}" : "";
		const result = rejected ? rejected : purge.css;
		file.contents = Buffer.from(result, "utf8");
		if (isSourceMap) if (purge.sourceMap) file.sourceMap = JSON.parse(purge.sourceMap);
		else log(colors.yellow("licss ") + colors.red("⚠ ") + colors.magenta("Source map not generated by PurgeCSS for file: ") + colors.blue(file.relative));
	} else throw new Error("purgeTransform: File not found!");
}
/**
* Gulp plugin for rename file - change extname or/and added suffix
* @param basename - new file name (file stem and file extension)
* @param extname - new file extension
* @param suffix - new file suffix
*/
function rename({ basename = void 0, extname = void 0, suffix = void 0 } = {}) {
	const stream = new Transform({ objectMode: true });
	stream._transform = async (sameFile, _enc, callback) => {
		if (sameFile.isNull()) return callback(null, sameFile);
		if (sameFile.isBuffer()) try {
			const file = sameFile.clone({ contents: false });
			if (basename) file.basename = basename;
			const extName = file.extname;
			if (suffix && extname) file.extname = suffix + extname;
			else if (suffix && !extname) file.extname = suffix + extName;
			else if (!suffix && extname) file.extname = extname;
			if (file.sourceMap) file.sourceMap.file = file.relative;
			callback(null, file);
		} catch (err) {
			throw new PluginError("licss", err instanceof Error ? err : new Error(String(err)), {
				fileName: sameFile.path,
				showStack: true
			});
		}
		else callback(null, sameFile);
	};
	return stream;
}
//#endregion
export { licss, rename };
