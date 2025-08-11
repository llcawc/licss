import { Buffer } from 'node:buffer';
import through2 from 'through2';
import PluginError from 'plugin-error';
/**
 * Gulp plugin for rename file - change extname or/and added suffix
 * @param basename - new file name
 * @param extname - new file extersion
 * @param suffix - new file suffix
 */
export default function rename({ basename = undefined, extname = undefined, suffix = undefined, } = {}) {
    return through2.obj(function (file, _, cb) {
        // empty
        if (file.isNull()) {
            return cb(null, file);
        }
        // rename
        if (file.isBuffer()) {
            try {
                file.contents = Buffer.from(file.contents.toString());
                if (basename) {
                    file.basename = basename;
                }
                const extName = file.extname;
                if (suffix && extname) {
                    file.extname = suffix + extname;
                }
                if (suffix && !extname) {
                    file.extname = suffix + extName;
                }
                if (!suffix && extname) {
                    file.extname = extname;
                }
            }
            catch (err) {
                const opts = Object.assign({}, { basename, extname, suffix, fileName: file.path });
                const error = new PluginError('rename', err, opts);
                cb(error);
            }
        }
        cb(null, file);
    });
}
