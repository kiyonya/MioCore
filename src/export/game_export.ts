import fs from 'fs'
import path from 'path'
import InstanceUtil, { type InstanceInfoStruct } from '../game/instance_util.ts'
import HashUtil from '../utils/hash.ts'
import ModrinthAPI from '../community/modrinth.ts'
import AdmZip from 'adm-zip'

interface GameExportDefaultBinding {
    versionPath: string
    minecraftPath: string
    versionIsolation: boolean
}

type ExportEntry = {
    path: string
    isDir: boolean
    entryName: string
}

type ModrinthModsItem = {

    path: string,
    hashes: {
        "sha1": string,
        "sha512": string
    },
    downloads: string[]
    fileSize: number
}

export type ModrinthIndexJSON = {
    game: "minecraft",
    formatVersion: number,
    versionId: string,
    name: string,
    summary: string,
    dependencies: Record<string, string>
    files: ModrinthModsItem[]
}

export type ModpackExportOptions = {
    ignoreHiddenDir?: boolean
    ignoreDisabledMods?: boolean
    online?: boolean
}

export type CurseforgeManifestJSON = {
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


/**
 * @deprecated
 */
export default class GameExport {

    public versionPath: string
    public minecraftPath: string
    public versionIsolation: boolean

    constructor(options: GameExportDefaultBinding) {
        this.versionPath = options.versionPath
        this.minecraftPath = options.minecraftPath
        this.versionIsolation = options.versionIsolation
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

    public async exportToModpack(exportEntries: ExportEntry[], modpackType: 'modrinth' | 'curseforge' = 'modrinth', options: ModpackExportOptions = {}): Promise<AdmZip | null> {

        const instanceInfo: InstanceInfoStruct = await InstanceUtil.readInstanceOf(this.versionPath, this.minecraftPath, this.versionIsolation)
        console.log(instanceInfo)

        let zip: AdmZip | null = null

        if (modpackType === 'modrinth') {
            zip = await this.modrinthModpackExport(instanceInfo, exportEntries, options)
        }
        else if(modpackType === 'curseforge'){
            zip = await this.curseforgeModpackExport(instanceInfo,exportEntries,options)
        }

        return zip
    }

    public async modrinthModpackExport(instanceInfo: InstanceInfoStruct, exportEntries: ExportEntry[], options?: { online?: boolean, ignoreHiddenDir?: boolean, ignoreDisabledMods?: boolean }): Promise<AdmZip> {

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
                    const { modrinthOnlineFiles, localFiles } = await this.onlineMatchModrinthMods(modFiles)
                    modrinthIndexJSON.files.push(...modrinthOnlineFiles)
                    modFiles = localFiles
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

    public async curseforgeModpackExport(instanceInfo: InstanceInfoStruct, exportEntries: ExportEntry[], options?: { online?: boolean, ignoreHiddenDir?: boolean, ignoreDisabledMods?: boolean }): Promise<AdmZip> {

        const curseforgeManifestJSON: CurseforgeManifestJSON = {
            minecraft: {
                version: instanceInfo.version,
                modLoaders: []
            },
            manifestType: 'minecraftModpack',
            manifestVersion: 1,
            name: instanceInfo.name,
            version: "1.0",
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
                if (options?.online ?? true) { }
            }
        }
        return zip
    }


    protected async onlineMatchModrinthMods(modFiles: string[]): Promise<{ modrinthOnlineFiles: ModrinthModsItem[], localFiles: string[] }> {
        const hashMap: Map<string, ModrinthModsItem | string> = new Map()
        const hashPromise = modFiles.map(i => HashUtil.sha1(i).then(sha1 => {
            hashMap.set(sha1, i)
            return sha1
        }))
        const hashes = await Promise.all(hashPromise)
        const matchedFiles = await ModrinthAPI.Common.getVersionsFromFileHashes(hashes, 'sha1')

        for (const [hash, version] of Object.entries(matchedFiles)) {
            for (const file of version.files) {
                hashMap.set(hash, {
                    path: path.join('mods', file.filename).replaceAll('\\', '/'),
                    hashes: file.hashes,
                    fileSize: file.size,
                    downloads: [file.url]
                })
            }
        }

        const modrinthOnlineFiles: ModrinthModsItem[] = [...hashMap.values()].filter(i => typeof i !== 'string')
        const localFiles: string[] = [...hashMap.values()].filter(i => typeof i === 'string')
        return { modrinthOnlineFiles, localFiles }
    }

    protected async onlineMatchCurseforgeMods(modFiles: string[]): Promise<void> {
        const hashMap: Map<number, string> = new Map()
        const murmurHashes: number[] = await Promise.all(modFiles.map(i => new Promise<number>((resolve) => {
            HashUtil.murmurHashV2(i).then(hash => {
                hashMap.set(hash, i)
                resolve(hash)
            })
        }
        )))
    }
}   