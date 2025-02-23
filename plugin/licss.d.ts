export default function licss(options?: {
    minify?: boolean | undefined;
    loadPaths?: string[] | undefined;
}): import("stream").Transform;
