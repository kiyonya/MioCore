import fs from 'fs'
import path from 'path'
import HashUtil from '../utils/hash.ts'
import pLimit from 'p-limit'
import FileUtil from '../utils/file.ts'
import { existify } from '../utils/io.ts'
import MZipWriter from '../utils/mzip/mzip_writer.ts'
import MZipReader from '../utils/mzip/mzip_reader.ts'

export interface CreateBackupOptions {
    ignoreNotExist?: boolean,
    createHashMap?: boolean
}

export interface MioBackupIdentity {
    backupTime: number,
    backupHashes?: Record<string, string>,
    baseDir: string,
    overrides: string
}

export interface MioBackupFile {
    zipEntryName: string,
    originalPath: string
}

export interface MioBackupModifyObject {
    zip:MZipReader,
    modifyMap: Record<'override' | 'delete' | 'create', MioBackupFile[]>,
    needRecover: boolean,
    override: boolean
}

export default class Backup {

    public static DEFAULT_BACKUP_ARCHIVE = "overrides"
    public static DEFAULT_HASHES_CONCURRENCY = 64

    public static async createBackupFromDir(baseDir: string, options?: CreateBackupOptions) {
        const files = await FileUtil.recursiveDir(baseDir, [])
        return await this.createBackup(baseDir, files, options)
    }
    public static async createBackup(baseDir: string, backupFiles: string[], options?: CreateBackupOptions): Promise<MZipWriter> {
        const toBackupFiles: string[] = []
        const baseDirNomalized = path.normalize(baseDir)
        for (const file of backupFiles) {
            if (!fs.existsSync(file)) {
                if (options?.ignoreNotExist ?? false) {
                    throw new Error("No SuchFile Or dir")
                }
                else {
                    continue
                }
            }
            if (fs.statSync(file).isDirectory()) {
                throw new Error("Unsupported Directory")
            }
            if (!path.normalize(file).startsWith(baseDirNomalized)) {
                throw new Error("Not In Same Base Dir")
            }
            toBackupFiles.push(file)
        }
        const hashMap: Record<string, string> = {}
        if (options?.createHashMap ?? true) {
            const computedHash = async (file: string) => {
                const sha1 = await HashUtil.sha1(file)
                const relativePath = path.relative(baseDir, file).replaceAll(/\\/g, '/')
                hashMap[relativePath] = sha1
            }
            const limit = pLimit(this.DEFAULT_HASHES_CONCURRENCY)
            await Promise.all(toBackupFiles.map(file => limit(() => computedHash(file))))
        }
        else {
            console.warn("Warning: Backup created without hash map, recover confirmation will be unavailable.")
            for (const file of toBackupFiles) {
                const relativePath = path.relative(baseDir, file).replaceAll(/\\/g, '/')
                hashMap[relativePath] = ''
            }
        }
        const zip = new MZipWriter()
        for (const file of toBackupFiles) {
            await zip.addLocalFile(file, path.join(this.DEFAULT_BACKUP_ARCHIVE, path.relative(baseDir, file)))
        }
        const backupId: MioBackupIdentity = {
            backupTime: Date.now(),
            baseDir: baseDir,
            backupHashes: hashMap,
            overrides: this.DEFAULT_BACKUP_ARCHIVE
        }
        await zip.addString(JSON.stringify(backupId, null, 4),'backup.json')
        return zip
    }
    public static async createRecoverComfirm(recoverDir: string, backupFile: string) {
        if (!fs.existsSync(backupFile)) {
            throw new Error("没有备份")
        }
        const zip = new MZipReader(backupFile)
        const backupJSONEntry = await zip.readEntry('backup.json')
        let backupJSON: MioBackupIdentity | null = null
        if (backupJSONEntry) {
            backupJSON = await zip.readAsJSON(backupJSONEntry) as MioBackupIdentity
        }
        const hashMap = backupJSON?.backupHashes

        if (hashMap) {
            const currentRecoverDirFiles = await FileUtil.recursiveDir(recoverDir, [])
            const currentFileMap: Record<string, string> = {}
            const computedHash = async (file: string) => {
                const sha1 = await HashUtil.sha1(file)
                const relativePath = path.relative(recoverDir, file).replaceAll(/\\/g, '/')
                currentFileMap[relativePath] = sha1
            }
            const limit = pLimit(this.DEFAULT_HASHES_CONCURRENCY)
            await Promise.all(currentRecoverDirFiles.map(file => limit(() => computedHash(file))))

            const modifyMap: Record<'override' | 'delete' | 'create', MioBackupFile[]> = {
                override: [],
                delete: [],
                create: []
            }

            //计算改变的文件 删除的文件 添加文件
            for (const [relativePath, sha1] of Object.entries(hashMap)) {
                if (currentFileMap[relativePath] && currentFileMap[relativePath] === sha1) {
                    continue
                }
                else if ((currentFileMap[relativePath] && currentFileMap[relativePath] !== sha1) || !sha1) {
                    console.log(`覆盖: ${relativePath}`)
                    modifyMap.override.push({
                        zipEntryName: path.join(Backup.DEFAULT_BACKUP_ARCHIVE, relativePath).replaceAll(/\\/g, '/'),
                        originalPath: path.join(recoverDir, relativePath).replaceAll(/\\/g, '/')
                    })
                }
                else if (!currentFileMap[relativePath]) {
                    console.log(`创建: ${relativePath}`)
                    modifyMap.create.push({
                        zipEntryName: path.join(Backup.DEFAULT_BACKUP_ARCHIVE, relativePath).replaceAll(/\\/g, '/'),
                        originalPath: path.join(recoverDir, relativePath).replaceAll(/\\/g, '/')
                    })
                }
            }
            for (const [relativePath, sha1] of Object.entries(currentFileMap)) {
                if (hashMap[relativePath] === undefined) {
                    console.log(`删除: ${relativePath}`)
                    modifyMap.delete.push({
                        zipEntryName: path.join(Backup.DEFAULT_BACKUP_ARCHIVE, relativePath).replaceAll(/\\/g, '/'),
                        originalPath: path.join(recoverDir, relativePath).replaceAll(/\\/g, '/')
                    })
                }
            }

            const modifyObject: MioBackupModifyObject = {
                zip: zip,
                modifyMap: modifyMap,
                needRecover: modifyMap.override.length + modifyMap.create.length + modifyMap.delete.length > 0,
                override: false
            }
            return modifyObject
        }
        else {
            throw new Error("备份文件缺失")
        }
    }
    public static async recoverFromModifyMap(modifyObject: MioBackupModifyObject) {
        const { zip, modifyMap } = modifyObject
        for (const file of modifyMap.delete) {
            if (fs.existsSync(file.originalPath)) {
                fs.unlinkSync(file.originalPath)
            }
        }
        for (const file of [...modifyMap.override, ...modifyMap.create]) {
            const entry = await zip.readEntry(file.zipEntryName)
            if (entry) {
                existify(path.dirname(file.originalPath))
                await zip.extractEntryTo(entry, path.dirname(file.originalPath),{overwrite:true})
            }
            else {
                throw new Error("备份文件缺失")
            }
        }
    }
}