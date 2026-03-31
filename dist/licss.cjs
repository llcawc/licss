Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let node_buffer = require("node:buffer");
let node_path = require("node:path");
let node_stream = require("node:stream");
let node_url = require("node:url");
let browserslist = require("browserslist");
browserslist = __toESM(browserslist);
let colors = require("colors");
colors = __toESM(colors);
let fancy_log = require("fancy-log");
fancy_log = __toESM(fancy_log);
let lightningcss = require("lightningcss");
let plugin_error = require("plugin-error");
plugin_error = __toESM(plugin_error);
let purgecss = require("purgecss");
let sass_embedded = require("sass-embedded");
let tinyglobby = require("tinyglobby");
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
	const stream = new node_stream.Transform({ objectMode: true });
	stream._transform = async (file, _enc, cb) => {
		if (file.isNull()) return cb(null, file);
		if (file.isStream()) return cb(new plugin_error.default("licss", "Streams are not supported"));
		if (file.stem.startsWith("_")) return cb();
		if (file.isBuffer()) try {
			if (!loadPaths) loadPaths = [(0, node_path.dirname)(file.path), (0, node_path.join)(file.cwd, "node_modules")];
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
			throw new plugin_error.default("licss", err instanceof Error ? err : new Error(String(err)), {
				fileName: file.path,
				showStack: true
			});
		}
		else throw new plugin_error.default("licss", { message: "File not found!" });
	};
	return stream;
}
function mess(message, file) {
	return (0, fancy_log.default)(colors.default.cyan("licss ") + colors.default.red("★ ") + colors.default.magenta(message + " ") + colors.default.blue(file.relative));
}
function getTargets(cwd) {
	return (0, lightningcss.browserslistToTargets)((0, browserslist.default)(browserslist.default.loadConfig({ path: cwd }) ?? (0, browserslist.default)("> 0.2%, last 2 major versions, not dead")));
}
async function transformLightningCSS(file, minify, targetsList, isSourceMap) {
	if (file.isBuffer()) {
		const result = (0, lightningcss.transform)({
			targets: minify ? targetsList : void 0,
			filename: file.basename,
			minify,
			inputSourceMap: isSourceMap ? JSON.stringify(file.sourceMap) : void 0,
			sourceMap: isSourceMap,
			code: file.contents,
			projectRoot: file.base
		});
		file.extname = ".css";
		file.contents = node_buffer.Buffer.from(result.code);
		if (result.map) file.sourceMap = JSON.parse(textDecoder.decode(result.map));
	} else throw new Error("transformLightningCSS: File not found!");
}
async function bundleLightningCSS(file, minify, targetsList, isSourceMap) {
	if (file.isBuffer()) {
		const result = (0, lightningcss.bundle)({
			targets: minify ? targetsList : void 0,
			filename: file.path,
			minify,
			sourceMap: isSourceMap,
			projectRoot: file.base
		});
		file.extname = ".css";
		file.contents = node_buffer.Buffer.from(result.code);
		if (result.map) file.sourceMap = JSON.parse(textDecoder.decode(result.map));
	} else throw new Error("bundleLightningCSS: File not found!");
}
async function bundleSASS(file, loadPaths, isSourceMap) {
	if (file.isBuffer()) try {
		const result = await (0, sass_embedded.compileStringAsync)(parseImport(file), {
			url: (0, node_url.pathToFileURL)(file.path),
			loadPaths,
			syntax: file.extname === ".sass" ? "indented" : "scss",
			sourceMap: isSourceMap,
			sourceMapIncludeSources: true
		});
		file.extname = ".css";
		file.contents = node_buffer.Buffer.from(result.css);
		if (result.sourceMap && isSourceMap) cleanSourceMap(file, JSON.parse(JSON.stringify(result.sourceMap)));
	} catch (err) {
		throw new plugin_error.default("lscss", err instanceof Error ? err : new Error(String(err)), {
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
		if (path.startsWith("file:")) path = (0, node_url.fileURLToPath)(path);
		path = (0, node_path.relative)(basePath, path);
		return path.replace(/\\/g, "/");
	});
	file.sourceMap = map;
}
async function getFiles(contentArray, ignore) {
	return await (0, tinyglobby.glob)(contentArray, { ignore });
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
		const purge = (await new purgecss.PurgeCSS().purge({
			...options,
			content: processedContent,
			css: [{ raw: textDecoder.decode(file.contents) }],
			stdin: true,
			sourceMap: mapOptions
		}))[0];
		const rejected = options.rejected && purge.rejected && purge.rejected.length > 0 ? purge.rejected.join(" {}\n") + " {}" : "";
		const result = rejected ? rejected : purge.css;
		file.contents = node_buffer.Buffer.from(result, "utf8");
		if (isSourceMap) if (purge.sourceMap) file.sourceMap = JSON.parse(purge.sourceMap);
		else (0, fancy_log.default)(colors.default.yellow("licss ") + colors.default.red("⚠ ") + colors.default.magenta("Source map not generated by PurgeCSS for file: ") + colors.default.blue(file.relative));
	} else throw new Error("purgeTransform: File not found!");
}
/**
* Gulp plugin for rename file - change extname or/and added suffix
* @param basename - new file name (file stem and file extension)
* @param extname - new file extension
* @param suffix - new file suffix
*/
function rename({ basename = void 0, extname = void 0, suffix = void 0 } = {}) {
	const stream = new node_stream.Transform({ objectMode: true });
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
			throw new plugin_error.default("licss", err instanceof Error ? err : new Error(String(err)), {
				fileName: sameFile.path,
				showStack: true
			});
		}
		else callback(null, sameFile);
	};
	return stream;
}
//#endregion
exports.licss = licss;
exports.rename = rename;
