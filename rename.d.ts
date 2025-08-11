/**
 * Gulp plugin for rename file - change extname or/and added suffix
 * @param basename - new file name
 * @param extname - new file extersion
 * @param suffix - new file suffix
 */
export default function rename({ basename, extname, suffix, }?: {
    basename?: string | undefined;
    extname?: string | undefined;
    suffix?: string | undefined;
}): import("stream").Transform;
