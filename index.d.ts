import { UserDefinedOptions } from 'purgecss';
import rename from './rename.js';
export { rename };
/**
 * Gulp plugin for style transformation - bundles, compiles, minimizes, and cleans up sass, scss, css, and postcss style sheets.
 * @param options
 */
export default function licss(options?: {
    minify?: boolean | undefined;
    loadPaths?: string[] | undefined;
    purgeOptions?: UserDefinedOptions | undefined;
}): import("stream").Transform;
