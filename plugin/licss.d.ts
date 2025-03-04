import { UserDefinedOptions } from 'purgecss';
export default function licss(options?: {
    minify?: boolean | undefined;
    loadPaths?: string[] | undefined;
    purgeOptions?: UserDefinedOptions | undefined;
}): import("stream").Transform;
