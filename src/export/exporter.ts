import EventEmitter from "events";
import path from "path";
import ModrinthAPI from "../community/modrinth.ts";
import HashUtil from "../utils/hash.ts";
import AdmZip from "adm-zip";
import fs from 'fs'
import InstanceUtil, { type InstanceInfoStruct } from "../game/instance_util.ts";
import CurseforgeAPI, { type CurseforgeModFingerprintMatchResult } from "../community/curseforge.ts";
import FileUtil from "../utils/file.ts";
import pLimit from "p-limit";
export interface ModpackInfo {
    packageName: string,
    packageVersion: string,
    packageAuthor: string,
}
export interface ModpackCreateOptions {
    minecraftPath: string,
    versionIsolation: boolean,
    name: string
}
export interface ExportEntry {
    path: string
    isDir: boolean
    entryName: string
}
export interface ExportOptions extends ModpackInfo {
    online: boolean
    ignoreHiddenDir?: boolean
    ignoreDisabledMods?: boolean
}
export type PackageType = 'modrinth' | 'curseforge' | 'extramodrinth' | 'mcbbs'

export interface ModrinthIndexJSON {
    game: "minecraft",
    formatVersion: number,
    versionId: string,
    name: string,
    summary: string,
    dependencies: Record<string, string>
    files: ModrinthModsItem[]
}
export interface CurseforgeManifestJSON {
    minecraft: {
        version: string,
        modLoaders: Array<{
            id: string,
            primary: boolean
        }>,
        recommendedRam?: number
    }
    manifestType: "minecraftModpack",
    manifestVersion: number,
    name: string,
    version: string,
    author?: string,
    files: Array<{
        projectID: number,
        fileID: number,
        required: boolean
    }>
    overrides: "overrides"
}

export interface ModrinthModsItem {
    path: string,
    hashes: {
        "sha1": string,
        "sha512": string
    },
    downloads: string[]
    fileSize: number
}

export interface CurseforgeModItem {
    projectID: number,
    fileID: number,
    required: boolean
}

export interface MCBBSPackFile {
    path: string,
    hash: string,
    force: boolean,
    type: 'addon'
}

export interface MCBBSPackMeta {
    manifestType: "minecraftModpack",
    manifestVersion: number,
    name?: string,
    version?: string,
    author?: string,
    description?: string,
    fileApi?: string,
    url?: string,
    origin?: any[],
    addons: Array<{
        id: string,
        version: string
    }>,
    libraries: any[],
    files: MCBBSPackFile[],
    settings: {
        install_mods: boolean,
        install_resourcepack: boolean,
    },
    launchInfo: {
        minMemory: number,
        launchArgument: string[],
        javaArgument: string[]
    }
}

export interface MatchResultItem { isMatched: boolean, modrinthLike?: ModrinthModsItem, curseforgeLike?: CurseforgeModItem, downloadURL?: string }

export default class ModpackExport extends EventEmitter {
    public minecraftPath: string
    public versionIsolation: boolean
    public versionPath: string
    public name: string
    private curseforgeAPIKey?: string
    private curseforgeAPI: CurseforgeAPI | null = null

    constructor(createOptions: ModpackCreateOptions, curseforgeAPIKey?: string) {
        super()
        this.minecraftPath = createOptions.minecraftPath
        this.versionIsolation = createOptions.versionIsolation
        this.name = createOptions.name
        this.versionPath = this.versionIsolation ? path.join(this.minecraftPath, 'versions', this.name) : this.minecraftPath
        this.curseforgeAPIKey = curseforgeAPIKey
    }

    public getInstanceExportEntries(): ExportEntry[] {

        const entries = fs.readdirSync(this.versionPath).map(i => path.join(this.versionPath, i))
        const exportEntries: ExportEntry[] = []
        for (const entry of entries) {
            const stats = fs.statSync(entry)
            exportEntries.push({
                path: entry,
                isDir: stats.isDirectory(),
                entryName: path.basename(entry)
            })
        }
        return exportEntries
    }
    public createExportEntriesByNames(entryNames: string[]): ExportEntry[] {
        const exportEntries: ExportEntry[] = []
        for (const entryName of entryNames) {
            const entryPath = path.join(this.versionPath, entryName)
            if (fs.existsSync(entryPath)) {
                const stats = fs.statSync(entryPath)
                exportEntries.push({
                    path: entryPath,
                    isDir: stats.isDirectory(),
                    entryName: entryName
                })
            }
        }
        return exportEntries
    }
    public async export(entries: ExportEntry[], packType: PackageType, exportOptions?: ExportOptions): Promise<AdmZip> {
        try {
            const instanceInfo: InstanceInfoStruct = await InstanceUtil.readInstanceOf(this.versionPath, this.minecraftPath, this.versionIsolation)

            console.log(instanceInfo)

            switch (packType) {
                case "modrinth":
                    return await this.modrinthModpackExport(instanceInfo, entries, exportOptions)
                case "curseforge":
                    return await this.curseforgeModpackExport(instanceInfo, entries, exportOptions)
                case "extramodrinth":
                    return await this.extraModrinthModpackExport(instanceInfo, entries, exportOptions)
                case "mcbbs":
                    return await this.mcbbsModpackExport(instanceInfo, entries, exportOptions)
                default:
                    throw new Error("不支持的包类型")
            }

        } catch (error) {
            console.error("导出错误")
            throw error
        }
    }
    //modrinth导出
    private async modrinthModpackExport(instanceInfo: InstanceInfoStruct, exportEntries: ExportEntry[], options?: ExportOptions): Promise<AdmZip> {
        const modrinthIndexJSON: ModrinthIndexJSON = {
            game: 'minecraft',
            formatVersion: 1,
            versionId: '',
            name: instanceInfo.name,
            summary: '',
            files: [],
            dependencies: {
                minecraft: instanceInfo.version,
            }
        }
        const modLoader = instanceInfo.modLoader
        if (modLoader) {
            for (const [loader, version] of Object.entries(modLoader)) {
                switch (loader) {
                    case 'forge':
                        modrinthIndexJSON.dependencies['forge'] = version
                        break
                    case 'fabric':
                        modrinthIndexJSON.dependencies['fabric-loader'] = version
                        break
                    case 'neoforge':
                        modrinthIndexJSON.dependencies['neoforge'] = version
                        break
                    case 'quilt':
                        modrinthIndexJSON.dependencies['quilt-loader'] = version
                        break
                    case 'liteloader':
                        modrinthIndexJSON.dependencies['liteloader'] = version
                        break
                    case 'optifine':
                        modrinthIndexJSON.dependencies['optifine'] = version
                        break
                    default:
                        break
                }
            }
        }

        const zip = new AdmZip()

        for (const entry of exportEntries) {
            if (options?.ignoreHiddenDir ?? true) {
                if (entry.entryName.startsWith('.')) {
                    continue
                }
            }
            if (entry.entryName === 'mods') {
                let modFiles: Array<string> = await InstanceUtil.readModDir(entry.path, options?.ignoreDisabledMods ?? true)
                if (options?.online ?? true) {
                    const matchResult = await this.onlineMatchModrinthMods(modFiles)
                    const dismatched: string[] = []
                    for (const [file, matchItem] of Object.entries(matchResult)) {
                        if (matchItem.isMatched && matchItem.modrinthLike) {
                            modrinthIndexJSON.files.push(matchItem.modrinthLike)
                        }
                        else {
                            dismatched.push(file)
                        }
                    }
                    modFiles = dismatched
                }

                for (const modFile of modFiles) {
                    zip.addLocalFile(modFile, path.join('overrides', 'mods'))
                }
            }
            else {
                if (entry.isDir) {
                    zip.addLocalFolder(entry.path, path.join('overrides', entry.entryName))
                } else {
                    zip.addLocalFile(entry.path, path.join('overrides'))
                }
            }
        }
        zip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(modrinthIndexJSON, null, 2), 'utf-8'))
        return zip
    }
    private async onlineMatchModrinthMods(modFiles: string[]): Promise<Record<string, MatchResultItem>> {

        const matchResult: Record<string, MatchResultItem> = {}
        const hashMapFile: Map<string, string> = new Map()
        for (const file of modFiles) {
            matchResult[file] = { isMatched: false }
        }
        const hashPromise: Promise<string>[] = modFiles.map(i => HashUtil.sha1(i).then(sha1 => {
            hashMapFile.set(sha1, i)
            return sha1
        }))
        const hashes = await Promise.all(hashPromise)
        const matchedFiles = await ModrinthAPI.Common.getVersionsFromFileHashes(hashes, 'sha1')
        for (const [hash, version] of Object.entries(matchedFiles)) {
            for (const file of version.files) {
                const filePath = hashMapFile.get(hash)
                if (filePath) {
                    matchResult[filePath] = {
                        isMatched: true,
                        modrinthLike: {
                            path: path.join('mods', file.filename).replaceAll('\\', '/'),
                            hashes: file.hashes,
                            fileSize: file.size,
                            downloads: [file.url]
                        },
                        downloadURL: file.url
                    }
                }
            }
        }
        return matchResult
    }
    //curseforge的导出
    private async curseforgeModpackExport(instanceInfo: InstanceInfoStruct, exportEntries: ExportEntry[], options?: ExportOptions): Promise<AdmZip> {

        const curseforgeManifestJSON: CurseforgeManifestJSON = {
            minecraft: {
                version: instanceInfo.version,
                modLoaders: []
            },
            manifestType: 'minecraftModpack',
            manifestVersion: 1,
            name: options?.packageName || instanceInfo.name || 'pack',
            version: options?.packageVersion ?? '1.0',
            files: [],
            overrides: 'overrides'
        }

        if (instanceInfo.modLoader) {
            for (const [loader, version] of Object.entries(instanceInfo.modLoader)) {
                curseforgeManifestJSON.minecraft.modLoaders.push({
                    id: `${loader}-${version}`,
                    primary: true
                })
            }
        }
        const zip = new AdmZip()
        for (const entry of exportEntries) {
            if (options?.ignoreHiddenDir ?? true) {
                if (entry.entryName.startsWith('.')) {
                    continue
                }
            }
            if (entry.entryName === 'mods') {
                let modFiles: Array<string> = await InstanceUtil.readModDir(entry.path, options?.ignoreDisabledMods ?? true)
                if (options?.online ?? true) {
                    const matchResult = await this.onlineMatchCurseforgeMods(modFiles)
                    const dismatched: string[] = []
                    for (const [file, matchItem] of Object.entries(matchResult)) {
                        if (matchItem.isMatched && matchItem.curseforgeLike) {
                            curseforgeManifestJSON.files.push(matchItem.curseforgeLike)
                        }
                        else {
                            dismatched.push(file)
                        }
                    }
                    modFiles = dismatched
                }

                for (const modFile of modFiles) {
                    zip.addLocalFile(modFile, path.join('overrides', 'mods'))
                }
            }
            else {
                if (entry.isDir) {
                    zip.addLocalFolder(entry.path, path.join('overrides', entry.entryName))
                } else {
                    zip.addLocalFile(entry.path, path.join('overrides'))
                }
            }
        }
        zip.addFile('manifest.json', Buffer.from(JSON.stringify(curseforgeManifestJSON, null, 2), 'utf-8'))
        return zip
    }
    private async onlineMatchCurseforgeMods(modFiles: string[]): Promise<Record<string, MatchResultItem>> {

        const matchResult: Record<string, MatchResultItem> = {}
        for (const file of modFiles) {
            matchResult[file] = { isMatched: false }
        }
        const murmurHashMapFile: Map<number, string> = new Map()
        const murmurHashes: number[] = await Promise.all(modFiles.map(i => new Promise<number>((resolve) => {
            HashUtil.murmurHashV2(i).then(hash => {
                murmurHashMapFile.set(hash, i)
                resolve(hash)
            })
        }
        )))

        const curseforgeAPI = this.createCurseforgeAPI()
        const matchResp: CurseforgeModFingerprintMatchResult = await curseforgeAPI.getMatchByFingerprintAndGameID(murmurHashes)
        for (const match of matchResp.data.exactMatches) {
            const projectID = match.id
            const fileID = match.file.id
            const murmurHash = match.file.fileFingerprint
            const filePath = murmurHashMapFile.get(murmurHash)
            if (filePath) {
                matchResult[filePath] = {
                    isMatched: true,
                    curseforgeLike: {
                        projectID: projectID,
                        fileID: fileID,
                        required: true
                    },
                    downloadURL: match.file.downloadUrl,
                    modrinthLike: {
                        path: path.join('mods', match.file.fileName).replaceAll('\\', '/'),
                        hashes: {
                            sha1: match.file.hashes.filter(i => i.algo === 1)?.[0].value ?? '',
                            sha512: ''
                        },
                        fileSize: match.file.fileSizeOnDisk,
                        downloads: [match.file.downloadUrl]
                    },
                }
            }
        }
        return matchResult
    }
    private createCurseforgeAPI(): CurseforgeAPI {
        if (!this.curseforgeAPIKey) {
            throw new Error("无效APIKey 无法请求")
        }
        if (!this.curseforgeAPI) {
            this.curseforgeAPI = new CurseforgeAPI(this.curseforgeAPIKey)
        }
        return this.curseforgeAPI
    }
    //组合形Modrinth
    private async extraModrinthModpackExport(instanceInfo: InstanceInfoStruct, exportEntries: ExportEntry[], options?: ExportOptions): Promise<AdmZip> {
        const modrinthIndexJSON: ModrinthIndexJSON = {
            game: 'minecraft',
            formatVersion: 1,
            versionId: '',
            name: instanceInfo.name,
            summary: '',
            files: [],
            dependencies: {
                minecraft: instanceInfo.version,
            }
        }
        const modLoader = instanceInfo.modLoader
        if (modLoader) {
            for (const [loader, version] of Object.entries(modLoader)) {
                switch (loader) {
                    case 'forge':
                        modrinthIndexJSON.dependencies['forge'] = version
                        break
                    case 'fabric':
                        modrinthIndexJSON.dependencies['fabric-loader'] = version
                        break
                    case 'neoforge':
                        modrinthIndexJSON.dependencies['neoforge'] = version
                        break
                    case 'quilt':
                        modrinthIndexJSON.dependencies['quilt-loader'] = version
                        break
                    case 'liteloader':
                        modrinthIndexJSON.dependencies['liteloader'] = version
                        break
                    case 'optifine':
                        modrinthIndexJSON.dependencies['optifine'] = version
                        break
                    default:
                        break
                }
            }
        }

        const zip = new AdmZip()

        for (const entry of exportEntries) {
            if (options?.ignoreHiddenDir ?? true) {
                if (entry.entryName.startsWith('.')) {
                    continue
                }
            }
            if (entry.entryName === 'mods') {
                let modFiles: Array<string> = await InstanceUtil.readModDir(entry.path, options?.ignoreDisabledMods ?? true)
                if (options?.online ?? true) {
                    const modrinthMatchResult = await this.onlineMatchModrinthMods(modFiles)
                    const curseforgeMatchResult = await this.onlineMatchCurseforgeMods(modFiles)
                    const combineResult: Record<string, ModrinthModsItem | undefined> = {}
                    for (const [file, matchItem] of Object.entries(modrinthMatchResult)) {
                        if (!matchItem.isMatched) { combineResult[file] = undefined; continue }
                        combineResult[file] = matchItem.modrinthLike ?? undefined
                    }
                    for (const [file, matchItem] of Object.entries(curseforgeMatchResult)) {
                        if (matchItem.isMatched && matchItem.downloadURL) {
                            if (combineResult[file]) {
                                combineResult[file].downloads.push(matchItem.downloadURL)
                            }
                            else if (matchItem.modrinthLike) {
                                combineResult[file] = matchItem.modrinthLike
                            }
                        }
                    }
                    const dismatched: string[] = []
                    for (const [file, modrinthResult] of Object.entries(combineResult)) {
                        if (modrinthResult) {
                            modrinthIndexJSON.files.push(modrinthResult)
                        }
                        else {
                            dismatched.push(file)
                        }
                    }
                    modFiles = dismatched
                }

                for (const modFile of modFiles) {
                    zip.addLocalFile(modFile, path.join('overrides', 'mods'))
                }
            }
            else {
                if (entry.isDir) {
                    zip.addLocalFolder(entry.path, path.join('overrides', entry.entryName))
                } else {
                    zip.addLocalFile(entry.path, path.join('overrides'))
                }
            }
        }
        zip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(modrinthIndexJSON, null, 2), 'utf-8'))
        return zip
    }
    //MCBBS
    private async mcbbsModpackExport(instanceInfo: InstanceInfoStruct, exportEntries: ExportEntry[], options?: ExportOptions) {

        const mcbbsPackMeta: MCBBSPackMeta = {
            author: options?.packageAuthor,
            name: options?.packageName,
            version: options?.packageVersion,
            manifestType: 'minecraftModpack',
            manifestVersion: 2,
            addons: [],
            libraries: [],
            files: [],
            settings: {
                install_mods: true,
                install_resourcepack: true
            },
            launchInfo: {
                javaArgument: [],
                launchArgument: [],
                minMemory: 0
            }
        }

        const curseforgeCompat: CurseforgeManifestJSON = {
            minecraft: {
                version: instanceInfo.version,
                modLoaders: []
            },
            manifestType: 'minecraftModpack',
            manifestVersion: 1,
            name: options?.packageName || instanceInfo.name || 'pack',
            version: options?.packageVersion ?? '1.0',
            files: [],
            overrides: 'overrides'
        }

        if (instanceInfo.version) {
            mcbbsPackMeta.addons.push({
                id: 'game',
                version: instanceInfo.version
            })
        }
        if (instanceInfo.modLoader) {
            for (const [loader, version] of Object.entries(instanceInfo.modLoader)) {
                mcbbsPackMeta.addons.push({
                    id: loader,
                    version: version
                })
                curseforgeCompat.minecraft.modLoaders.push({
                    id: `${loader}-${version}`,
                    primary: true
                })
            }
        }

        let exportFiles: string[] = []
        const zip = new AdmZip()
        for (const entry of exportEntries) {
            if (options?.ignoreHiddenDir ?? true) {
                if (entry.entryName.startsWith('.')) {
                    continue
                }
            }
            if (entry.isDir) {
                const filesOfDir: string[] = await FileUtil.recursiveDir(entry.path)
                exportFiles.push(...filesOfDir)
                zip.addLocalFolder(entry.path, path.join('overrides', entry.entryName))
            }
            else {
                exportFiles.push(entry.path)
                zip.addLocalFile(entry.path, path.join('overrides'))
            }
        }
        const mcbbsFiles: MCBBSPackFile[] = []
        const computedFileHashPromise = async (filePath: string) => {
            const sha1 = await HashUtil.sha1(filePath)
            const reletivePath = path.relative(this.versionPath,filePath)
            mcbbsFiles.push({
                path: reletivePath.replaceAll('\\','/'),
                hash: sha1,
                force: true,
                type: 'addon'
            })
        }
        const computedLimit = pLimit(32)
        const computedPromises = exportFiles.map(file => computedLimit(() => computedFileHashPromise(file)))
        await Promise.all(computedPromises)

        mcbbsPackMeta.files = mcbbsFiles
        zip.addFile('mcbbs.packmeta', Buffer.from(JSON.stringify(mcbbsPackMeta, null, 2), 'utf-8'))
        zip.addFile('manifest.json', Buffer.from(JSON.stringify(curseforgeCompat, null, 2), 'utf-8'))
        return zip
    }
}