import path from 'path'
import fs from 'fs'
import yauzl from 'yauzl'

export interface MMZipExtractOptions {
    overwrite?: boolean,
}

function ensureDir(...args: string[]): string {
    const fullPath = path.join(...args)
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
    }
    return fullPath
}

export default class MZipReader {
    public zipPath: string
    public zipFile: yauzl.ZipFile | null = null
    private _entriesCache: yauzl.Entry[] | null = null

    constructor(zipPath: string) {
        this.zipPath = zipPath
        if (!fs.existsSync(zipPath)) {
            throw new Error("不存在")
        }
    }

    public async open(): Promise<yauzl.ZipFile> {
        return new Promise<yauzl.ZipFile>((resolve, reject) => {
            if (this.zipFile && this.zipFile?.isOpen) {
                resolve(this.zipFile)
            }
            else {
                yauzl.open(this.zipPath, { lazyEntries: true, autoClose: true }, (openError, zipFile: yauzl.ZipFile) => {
                    if (openError) {
                        reject(openError)
                    }
                    this.zipFile = zipFile
                    resolve(zipFile)
                })
            }
        })
    }

    public async readAllEntries(): Promise<yauzl.Entry[]> {
        if (this._entriesCache) {
            return this._entriesCache
        }
        const zipFile = await this.open();
        const entries: yauzl.Entry[] = [];
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                zipFile.removeListener('entry', onEntry);
                zipFile.removeListener('end', onEnd);
                zipFile.removeListener('error', onError);
            };
            const onEntry = (entry: yauzl.Entry) => {
                if (!entry.fileName.endsWith('/')) {
                    entries.push(entry);
                }
                zipFile.readEntry();
            };
            const onEnd = () => {
                cleanup();
                this._entriesCache = entries
                resolve(entries);
            };
            const onError = (err: Error) => {
                cleanup();
                reject(err);
            };
            zipFile.on('entry', onEntry);
            zipFile.on('end', onEnd);
            zipFile.on('error', onError);
            zipFile.readEntry();
        });
    }

    public async readEntry(entry: string): Promise<yauzl.Entry | null> {
        if (entry.startsWith('/')) {
            entry = entry.substring(1)
        }
        const entries = await this.readAllEntries()
        for (const e of entries) {
            if (e.fileName === entry) {
                return e
            }
        }
        return null
    }

    public async readAsBuffer(entry: string | yauzl.Entry): Promise<Buffer> {
        const targetEntry = await this._getEntry(entry)
        return this._readEntry(targetEntry)
    }

    public async readAsText(entry: string | yauzl.Entry, encoding: BufferEncoding = 'utf-8'): Promise<string> {
        const buffer = await this.readAsBuffer(entry)
        return buffer.toString(encoding)
    }

    public async readAsJSON(entry: string | yauzl.Entry, encoding: BufferEncoding = 'utf-8'): Promise<Record<any, any>> {
        const text = await this.readAsText(entry, encoding)
        return JSON.parse(text)
    }

    public async extractEntryTo(entry: yauzl.Entry, destDir: string, extractOptions?: MMZipExtractOptions): Promise<string> {
        const targetFileName = path.basename(entry.fileName)
        const targetPath = path.join(destDir, targetFileName)
        if (extractOptions?.overwrite === false && fs.existsSync(targetPath)) {
            throw new Error("文件已存在")
        }
        return this._extractEntry(entry, targetPath)
    }

    public async extractAllTo(destDir: string, extractOptions?: MMZipExtractOptions): Promise<void> {
        const entries = await this.readAllEntries()
        for (const entry of entries) {
            const targetPath = path.join(destDir, entry.fileName)
            if (extractOptions?.overwrite === false && fs.existsSync(targetPath)) {
                throw new Error("文件已存在")
            }
            await this._extractEntry(entry, targetPath)
        }
    }

    private async _extractEntry(entry: yauzl.Entry, targetPath: string) {
        const dirName = path.dirname(targetPath)
        ensureDir(dirName)
        const zipFile = await this.open()
        return new Promise<string>((resolve, reject) => {
            zipFile.openReadStream(entry, (openStreamError, readableStream) => {
                if (openStreamError || !readableStream) {
                    reject(openStreamError)
                }
                else {
                    const writableStream = fs.createWriteStream(targetPath)
                    writableStream.once('close', () => {
                        resolve(targetPath)
                    })
                    writableStream.once('error', (writeError) => {
                        reject(writeError)
                    })
                    readableStream.pipe(writableStream)
                }
            })
        })
    }

    private async _readEntry(entry: yauzl.Entry): Promise<Buffer> {
        const zipFile = await this.open()
        return new Promise<Buffer>((resolve, reject) => {
            zipFile.openReadStream(entry, (openStreamError, readableStream) => {
                if (openStreamError || !readableStream) {
                    reject(openStreamError)
                }
                else {
                    const chunks: Buffer[] = [];
                    let totalSize = 0;
                    const onData = (chunk: Buffer) => {
                        chunks.push(chunk);
                        totalSize += chunk.length;
                    }
                    readableStream.on('data', onData);
                    readableStream.once('end', () => {
                        const buffer = Buffer.concat(chunks, totalSize);
                        readableStream.off('data', onData);
                        resolve(buffer);
                    });
                    readableStream.once('error', (streamError: Error) => {
                        readableStream.off('data', onData);
                        reject(streamError);
                    });
                }
            })
        })
    }

    private async _getEntry(entry: string | yauzl.Entry): Promise<yauzl.Entry> {
        if (typeof entry === 'string') {
            const readEntry = await this.readEntry(entry)
            if (readEntry) {
                return readEntry
            }
            else {
                throw new Error("不存在这个入口")
            }
        }
        else if (entry instanceof yauzl.Entry) {
            return entry
        }
        else throw new Error("不支持的entry类型")
    }
}