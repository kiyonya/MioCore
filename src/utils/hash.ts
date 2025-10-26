import fs from 'fs'
import crypto from 'crypto'

export default class HashUtil {

    public static sha1Sync(file: string) {
        const buffer = fs.readFileSync(file)
        const hash = crypto.createHash('sha1')
        hash.update(buffer)
        return hash.digest('hex')
    }

    public static sha1(file: string) {
        return new Promise<string>((resolve, reject) => {
            const hash = crypto.createHash('sha1')
            const stream = fs.createReadStream(file)
            stream.on('data', (chunk) => {
                hash.update(chunk)
            })
            stream.on('end', () => {
                const fileHash = hash.digest('hex')
                stream.destroy()
                resolve(fileHash)
            })
            stream.on('error', (err) => {
                stream.destroy()
                reject(err)
            })
        })
    }

    public static sha1OfSync(data: Buffer | string) {
        const hash = crypto.createHash('sha1')
        hash.update(data)
        return hash.digest('hex')
    }

    public static md5Sync(file: string) {
        const buffer = fs.readFileSync(file)
        const hash = crypto.createHash('md5')
        hash.update(buffer)
        return hash.digest('hex')
    }

    public static md5(file: string) {
        return new Promise<string>((resolve, reject) => {
            const hash = crypto.createHash('md5')
            const stream = fs.createReadStream(file)
            stream.on('data', (chunk) => {
                hash.update(chunk)
            })
            stream.on('end', () => {
                const fileHash = hash.digest('hex')
                stream.destroy()
                resolve(fileHash)
            })
            stream.on('error', (err) => {
                stream.destroy()
                reject(err)
            })
        })
    }

    public static md5OfString(string: string) {
        const hash = crypto.createHash('md5')
        hash.update(Buffer.from(string))
        return hash.digest('hex')
    }

    public static murmurHashV2(file: string, seed = 1): Promise<number> {

        const m = 0x5bd1e995;
        const r = 24;
        const isWhitespace = (b: number) => b === 0x09 || b === 0x0a || b === 0x0d || b === 0x20;

        const countNormalizedLength = (): Promise<number> => {
            return new Promise((resolve, reject) => {
                const stream = fs.createReadStream(file);
                let len = 0;
                stream.on('data', (chunk: Buffer | string) => {
                    typeof chunk === 'string' && (chunk = Buffer.from(chunk));
                    for (let i = 0; i < chunk.length; i++) {
                        if (!isWhitespace(chunk[i])) len++;
                    }
                });
                stream.on('end', () => { stream.destroy(); resolve(len); });
                stream.on('error', (err) => { stream.destroy(); reject(err); });
            });
        };

        return new Promise(async (resolve, reject) => {
            let normalizedLength: number;
            try {
                normalizedLength = await countNormalizedLength();
            } catch (err) {
                return reject(err);
            }

            const stream = fs.createReadStream(file);
            let h = (seed ^ normalizedLength) >>> 0;
            let temp = 0;
            let tempBits = 0;

            stream.on('data', (chunk: Buffer | string) => {
                typeof chunk === 'string' && (chunk = Buffer.from(chunk));
                for (let i = 0; i < chunk.length; i++) {
                    const b = chunk[i];
                    if (!isWhitespace(b)) {
                        temp |= (b << tempBits);
                        tempBits += 8;
                        if (tempBits === 32) {
                            let k = temp >>> 0;
                            k = Math.imul(k, m);
                            k ^= (k >>> r);
                            k = Math.imul(k, m);
                            h = Math.imul(h, m);
                            h ^= k;
                            temp = 0;
                            tempBits = 0;
                        }
                    }
                }
            });

            stream.on('end', () => {
                try {
                    if (tempBits > 0) {
                        h = Math.imul(h ^ temp, m);
                    }
                    h ^= (h >>> 13);
                    h = Math.imul(h, m);
                    h ^= (h >>> 15);
                    stream.destroy();
                    resolve(h >>> 0);
                } catch (err) {
                    stream.destroy();
                    reject(err);
                }
            });

            stream.on('error', (err) => {
                stream.destroy();
                reject(err);
            });
        });
    }
}
