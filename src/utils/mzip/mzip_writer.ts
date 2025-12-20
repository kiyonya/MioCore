import path from 'path'
import fs from 'fs'
import archiver, { type ArchiverOptions } from 'archiver'

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

export default class MZipWriter {
    public archive: archiver.Archiver
    private resolvePromise?: (value: string) => void
    private rejectPromise?: (reason: any) => void
    private static readonly DEFAULT_ARCHIVER_OPTIONS: ArchiverOptions = {
        zlib: { level: 9 },
        forceZip64: true,
        comment: ''
    }

    constructor(archiverOptions: ArchiverOptions = MZipWriter.DEFAULT_ARCHIVER_OPTIONS) {
        this.archive = archiver('zip', archiverOptions)
        this.archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err)
            } else {
                if (this.rejectPromise) {
                    this.rejectPromise(err)
                }
            }
        })
        this.archive.on('error', (err) => {
            if (this.rejectPromise) {
                this.rejectPromise(err)
            }
        })
    }

    public async addLocalFile(filePath: string, fileName?: string) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`${filePath} is Not Exist`)
        }
        const afileName = fileName || path.basename(filePath)
        this.archive.file(filePath, { name: afileName })
    }

    public async addLocalDir(dirPath: string) {
        if (!fs.existsSync(dirPath)) {
            throw new Error(`${dirPath} is Not Exist`)
        }
        this.archive.directory(dirPath, false)
    }

    public async addBuffer(buffer: Buffer, fileName: string) {
        this.archive.append(buffer, { name: fileName })
    }

    public async addString(string: string, fileName: string) {
        this.archive.append(string, { name: fileName })
    }

    public async toFile(zipPath: string) {
        ensureDir(path.dirname(zipPath))

        return new Promise<string>((resolve, reject) => {
            this.resolvePromise = resolve
            this.rejectPromise = reject

            const output = fs.createWriteStream(zipPath)

            this.archive.on('finish', () => {
                if (this.resolvePromise) {
                    this.resolvePromise(zipPath)
                }
            })

            output.on('error', (error) => {
                if (this.rejectPromise) {
                    this.rejectPromise(error)
                }
            })
            this.archive.pipe(output)
            this.archive.finalize()
        })
    }
}