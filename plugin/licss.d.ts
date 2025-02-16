import { RawSourceMap } from 'source-map';
import File from 'vinyl';
export interface mapFile extends File {
    sourceMap: string | RawSourceMap | undefined | null;
}
export default function licss(options?: {
    minify?: boolean;
}): import("stream").Transform;
