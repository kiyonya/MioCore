import path from 'path'
import fs from 'fs'
import AdmZip from 'adm-zip'
import toml from '@iarna/toml'
import pLimit from 'p-limit'
import workerpool from 'workerpool'

import HashUtil from '../utils/hash.ts'
import { DirNotFoundException, FileNotFoundException } from '../error.ts'
import INI from '../utils/ini.ts'
import { type MinecraftVersionJson } from '../types/index.ts'
import { existify, getDirSize, getFileNameFromPath } from '../utils/io.ts'
import ModActions from './mod_actions.ts'
import { fileURLToPath } from 'url'



export interface InstanceInfo {
    icon: string | null
    name: string
    path: string
    modsCount: number
    screenshotsCount: number
    modLoader?: Record<string, string> | null
    ok?: boolean
    canInstallMod: boolean
    installTime: number
    background: string | null
    latestRun: number
    playTime: number
    saves: SaveInfo[]
    pathMD5: string
    minecraftPath: string
    versionIsolation: boolean
    version: string,
    moments: string[],
    pathes: Partial<Record<"mods" | "version" | "screenshots" | "saves", string>>
}

type SaveInfo = {
    name: string
    latestPlay: number
    createTime: number
    icon: string | null
    size: number
}

export interface ModInfoWithNoHashIdentity {
    name: string
    modId: string
    version: string
    description: string
    authors: string[]
    dependencies: string[]
    displayName: string
    icon: Buffer | null
    loader: string
    license: string
}

export interface ModInfo extends ModInfoWithNoHashIdentity {
    path: string,
    sha1: string
}

type ForgeModTomlLike = {
    mods: Array<{
        modId: string
        version: string
        displayName: string
        description: string
        authors: string
        logoFile: string
    }>
    dependencies: Record<string, Array<{
        modId: string
        mandatory: boolean
        versionRange: string
        ordering: string
        side: string
        versionEndInclusive?: boolean
    }>>
    license: string
    loaderVersion: string
    modLoader: string
}


type ResourcePackInfo = {
    description: string,
    name: string,
    path: string,
    icon: Buffer | null
}

export interface ScreenshotInfo {
    path: string,
    name: string,
    size: number,
    thumbnail?: string,
    createTime: number,
    sha1?: string,
}

export interface IMMLID {
    modLoader?: Record<string, string> | null,
    gameVersion?: string,
    name?: string,
    installTime?: number,
    playTime?: number,
    latestRun?: number,
}


export default abstract class InstanceManager {

    public static readonly IMG_EXTEND_NAME = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']

    public static ModActions = ModActions

    public static async getInstancesInfo(
        minecraftPath: string,
        versionIsolation: boolean = true
    ) {
        const versionsPath = versionIsolation ? path.join(minecraftPath, 'versions') : minecraftPath
        if (!fs.existsSync(versionsPath)) {
            throw new DirNotFoundException('versions文件夹不存在', versionsPath)
        }
        const instanceDirs = (await fs.promises.readdir(versionsPath))
            .filter(instanceName =>
                fs.existsSync(
                    path.join(versionsPath, instanceName, `${instanceName}.json`)
                )
            )
            .map(i => path.join(versionsPath, i))

        const limit = pLimit(100)
        const processInstancePromises = instanceDirs.map((dir: string) =>
            limit(() => this.getInstanceInfo(dir, minecraftPath, versionIsolation))
        )
        const result = await Promise.all(processInstancePromises)
        return result
    }

    public static async getInstanceInfo(instanceDir: string, minecraftPath: string, versionIsolation: boolean = true): Promise<InstanceInfo> {
        if (!fs.existsSync(instanceDir)) {
            throw new DirNotFoundException('无效文件夹')
        }
        const instanceName = path.basename(instanceDir)
        const instanceInfo: InstanceInfo = {
            name: instanceName,
            path: instanceDir.replaceAll('\\', '/'),
            pathMD5: HashUtil.md5OfString(instanceDir),
            modsCount: 0,
            installTime: 0,
            screenshotsCount: 0,
            background: null,
            latestRun: -1,
            playTime: -1,
            saves: [],
            icon: null,
            ok: false,
            canInstallMod: false,
            minecraftPath: path.resolve(minecraftPath).replaceAll('\\', '/'),
            versionIsolation: versionIsolation,
            version: '',
            moments: [],
            pathes: {
                version: instanceDir.replaceAll('\\', '/')
            },
        }
        //获取图标
        const iconPathes = this.IMG_EXTEND_NAME.map(extendName => path.join(instanceDir, `icon${extendName}`))
        for (const iconPath of iconPathes) {
            if (fs.existsSync(iconPath)) {
                instanceInfo.icon = iconPath.replaceAll('\\', '/')
                break
            }
        }
        //模组统计
        if (fs.existsSync(path.join(instanceDir, 'mods'))) {
            const mods = await this.readModDir(path.join(instanceDir, 'mods'))
            instanceInfo.modsCount = mods.length
            instanceInfo.pathes.mods = path.join(instanceDir, 'mods').replaceAll('\\', '/')
        }
        //截图统计
        if (fs.existsSync(path.join(instanceDir, 'screenshots'))) {

            //先检查截图个数
            const screenshots = fs
                .readdirSync(path.join(instanceDir, 'screenshots'))
                .filter(i => ['.png', '.jpg', '.jpeg'].includes(path.extname(i)))
                .map(i => path.join(instanceDir, 'screenshots', i)).reverse()

            instanceInfo.screenshotsCount = screenshots.length
            instanceInfo.background = screenshots?.[0] || null
            instanceInfo.moments = screenshots.slice(0, 4)
            instanceInfo.pathes.screenshots = path.join(instanceDir, 'screenshots').replaceAll('\\', '/')
        }
        //存档统计
        if (fs.existsSync(path.join(instanceDir, 'saves'))) {
            const savesDir = path.join(instanceDir, 'saves')
            const saves = await this.readSavesFromDir(savesDir)
            instanceInfo.saves = saves
            instanceInfo.pathes.saves = path.join(instanceDir, 'saves').replaceAll('\\', '/')
        }
        //检查基本文件是否存在
        if (fs.existsSync(path.join(instanceDir, `${instanceName}.json`)) &&
            fs.existsSync(path.join(instanceDir, `${instanceName}.jar`))) {
            instanceInfo.ok = true
        }
        else {
            return instanceInfo
        }
        //之后需要读取versionJSON
        const versionJsonPath = path.join(instanceDir, `${instanceName}.json`)
        const versionJsonStat = fs.statSync(versionJsonPath)
        const versionJson: MinecraftVersionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))

        let mmlidResult: IMMLID = {}

        let mmlidFromVersionJson: IMMLID = {}
        let mmlidFromPCLINI: IMMLID = {}
        let mmlidFromHMCLPatches: IMMLID = {}

        if (versionJson.mmlid && Object.keys(versionJson.mmlid).length) {
            //使用mio-core安装的版本
            mmlidFromVersionJson = versionJson.mmlid
        }
        if (versionJson.patches && versionJson.patches.length) {
            //使用HMCL安装的版本
            const mmlid = this.getMMLIDFromHCMLPatches(versionJson)
            mmlidFromHMCLPatches = mmlid
        }
        if (fs.existsSync(path.join(instanceDir, 'PCL', 'Setup.ini'))) {
            //使用PCL安装的版本
            const mmlid = this.getMMLIDFromPCL(path.join(instanceDir, 'PCL', 'Setup.ini'))
            mmlidFromPCLINI = mmlid
        }

        mmlidResult = mmlidFromVersionJson
        //只有空值替换，如果没有 此时的mmlid是 {} 也就意味着皆空
        //PCL优先，然后再这个基础上再补充HMCL
        //这你可能会问
        //那要是 PCL 有的某个值 HMCL 有不一样的值怎么办，异议了怎么办
        //有道理
        //那只能请哈基仙了
        for (const [k, v] of Object.entries(mmlidFromPCLINI)) {
            if (!Boolean(mmlidResult[k as keyof IMMLID])) {
                mmlidResult[k as keyof IMMLID] = v
            }
        }
        for (const [k, v] of Object.entries(mmlidFromHMCLPatches)) {
            if (!Boolean(mmlidResult[k as keyof IMMLID])) {
                mmlidResult[k as keyof IMMLID] = v
            }
        }

        //补全信息
        if (!mmlidResult.gameVersion && versionJson.clientVersion) {
            mmlidResult.gameVersion = versionJson.clientVersion
        }
        if (!mmlidResult.name) {
            mmlidResult.name = instanceName
        }
        if (!mmlidResult.installTime) {
            mmlidResult.installTime = versionJsonStat.birthtime.getTime()
        }
        //写入结果
        instanceInfo.modLoader = mmlidResult.modLoader
        instanceInfo.installTime = mmlidResult.installTime ?? versionJsonStat.birthtime.getTime()
        instanceInfo.version = mmlidResult.gameVersion ?? 'unknown'
        instanceInfo.latestRun = mmlidResult.latestRun ?? -1
        instanceInfo.playTime = mmlidResult.playTime ?? -1
        //回写信息
        versionJson.mmlid = mmlidResult
        fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 4), 'utf-8')
        //确认是否可安装模组
        if (instanceInfo.modLoader && Object.keys(instanceInfo.modLoader).length) {
            instanceInfo.canInstallMod = true
        }
        return instanceInfo
    }

    public static async readModDir(
        modsDir: string,
        ignoreDisabled: boolean = false
    ) {
        if (!fs.existsSync(modsDir)) {
            throw new DirNotFoundException('mods文件夹不存在', modsDir)
        }
        let mods = (await fs.promises.readdir(modsDir))
            .filter(f =>
                ['.jar', ...(ignoreDisabled ? ['.disabled'] : [])].includes(
                    path.extname(f)
                )
            )
            .map(i => path.join(modsDir, i))
        return mods
    }

    /**
     * @deprecated
     * @param modsDir 
     * @param useWorker 
     * @returns 
     */
    public static async readModInfoFromDir(modsDir: string, useWorker: boolean = true): Promise<ModInfo[]> {
        if (!fs.existsSync(modsDir)) {
            throw new DirNotFoundException('mods文件夹不存在', modsDir)
        }
        let mods = await this.readModDir(modsDir, true)
        return this.readModInfos(mods, useWorker)
    }

    public static async readModInfos(modFiles: string[], useWorker: boolean = true): Promise<ModInfo[]> {
        const limit = pLimit(32);
        let modInfoPromises: Promise<ModInfo>[];

        if (useWorker) {
            const __filename: string = fileURLToPath(import.meta.url)
            const __dirname: string = path.dirname(__filename)
            const pool = workerpool.pool(path.resolve(__dirname, 'workers/modreader.ts'), {
                maxWorkers: 8,
                minWorkers: 1
            });
            try {
                modInfoPromises = modFiles.map(modFile =>
                    limit(() => pool.exec('modReaderWorker', [modFile]).then(result => result as ModInfo))
                );
                const modInfos: ModInfo[] = await Promise.all(modInfoPromises);
                return modInfos;
            } finally {
                await pool.terminate();
            }
        } else {
            modInfoPromises = modFiles.map(modFile =>
                limit(() => this.readModInfoOf(modFile))
            );

            const modInfos: ModInfo[] = await Promise.all(modInfoPromises);
            return modInfos;
        }
    }

    public static async readModInfoOf(modFile: string): Promise<ModInfo> {
        if (!fs.existsSync(modFile)) {
            throw new FileNotFoundException('mod文件不存在', modFile)
        }
        const sha1 = await HashUtil.sha1(modFile)
        const zip = new AdmZip(modFile)
        try {
            if (zip.getEntry('META-INF/mods.toml')) {
                //forge mod
                return {
                    ...await this.forgeModInfoReader(zip),
                    sha1: sha1,
                    path: modFile
                }
            }
            else if (zip.getEntry('fabric.mod.json')) {
                //fabric mod
                return {
                    ...await this.fabricModInfoReader(zip),
                    sha1: sha1,
                    path: modFile
                }
            }
            else throw new Error("未知的模组类型")
        } catch (error) {
            console.warn(modFile, error)
            const displayName = path.basename(modFile).replace(path.extname(modFile), '')
            return {
                icon: null,
                modId: displayName,
                version: '',
                displayName: displayName,
                name: displayName,
                description: '',
                authors: [],
                dependencies: [],
                loader: '',
                license: "unknown",
                path: modFile,
                sha1: sha1
            }
        }
    }

    public static async readSavesFromDir(
        savesDir: string,
        countSize: boolean = false
    ): Promise<SaveInfo[]> {
        const saves: SaveInfo[] = await Promise.all(
            fs
                .readdirSync(savesDir)
                .map(i => path.join(savesDir, i))
                .filter(i => fs.statSync(i).isDirectory())
                .filter(i => fs.existsSync(path.join(i, 'level.dat')))
                .map(async save => {
                    const stat = fs.statSync(save)
                    const icon = fs.existsSync(path.join(save, 'icon.png'))
                        ? path.join(save, 'icon.png')
                        : null
                    const size = countSize ? await getDirSize(save) : 0
                    return {
                        name: path.basename(save),
                        latestPlay: stat.mtime.getTime(),
                        createTime: stat.birthtime.getTime(),
                        icon: icon,
                        size: size
                    }
                })
        )
        return saves
    }

    public static async readResourcePacksDir(resourcePacksDir: string): Promise<string[]> {
        if (!fs.existsSync(resourcePacksDir)) {
            throw new DirNotFoundException('找不到文件夹', resourcePacksDir)
        }
        const resourcePacks = fs.readdirSync(resourcePacksDir).map(i => path.join(resourcePacksDir, i)).filter(p => [".zip"].includes(path.extname(p)))

        return resourcePacks
    }

    public static async readResourcePacksInfoFromDir(resourcePacksDir: string): Promise<ResourcePackInfo[]> {
        const resourcePacks = await this.readResourcePacksDir(resourcePacksDir)

        const limit = pLimit(16)
        const resourcePackInfoPromises = resourcePacks.map(rp => limit(() => this.readResourcePackInfoOf(rp)))
        const resourcePacksInfo = await Promise.all(resourcePackInfoPromises)
        return resourcePacksInfo
    }

    public static async readResourcePackInfoOf(resourcePackPath: string): Promise<ResourcePackInfo> {
        if (!fs.existsSync(resourcePackPath)) {
            throw new FileNotFoundException('找不到文件', resourcePackPath)
        }
        const zip = new AdmZip(resourcePackPath)

        const resourcePackInfo: ResourcePackInfo = {
            name: getFileNameFromPath(resourcePackPath),
            description: '',
            icon: null,
            path: resourcePackPath
        }
        const mcmetaJSONEntry = zip.getEntry('pack.mcmeta')
        if (mcmetaJSONEntry) {
            const meta = JSON.parse(zip.readAsText(mcmetaJSONEntry, 'utf-8'))
            resourcePackInfo.description = meta.description || ''
        }
        const iconEntry = zip.getEntry('pack.png')
        if (iconEntry) {
            resourcePackInfo.icon = zip.readFile(iconEntry) || null
        }

        return resourcePackInfo
    }

    public static async readScreenshotsFromDir(screenshotsDir: string): Promise<ScreenshotInfo[]> {
        if (!fs.existsSync(screenshotsDir)) {
            throw new DirNotFoundException('找不到文件夹', screenshotsDir)
        }
        const screenshots = fs.readdirSync(screenshotsDir).filter(i => ['.jpg', '.png'].includes(path.extname(i))).map(i => path.join(screenshotsDir, i))
        const result: ScreenshotInfo[] = []
        for (const screenshot of screenshots) {
            const stats = await fs.promises.stat(screenshot)
            const info: ScreenshotInfo = {
                path: screenshot,
                createTime: stats.birthtime.getTime(),
                size: stats.size,
                name: getFileNameFromPath(screenshot),
            }
            result.push(info)
        }
        return result
    }

    public static async readShaderpacksFromDir(shaderpacksDir: string): Promise<string[]> {
        if (!fs.existsSync(shaderpacksDir)) {
            throw new DirNotFoundException('找不到文件夹', shaderpacksDir)
        }
        const shaderpacks = fs.readdirSync(shaderpacksDir).filter(i => path.extname(i) === '.zip').map(i => path.join(shaderpacksDir, i))
        return shaderpacks
    }

    public static async createBackup(rawPath: string, backupsPath: string) {

        if (fs.existsSync(backupsPath) && !fs.statSync(backupsPath).isDirectory()) {
            throw new Error("无法存储到非目录")
        }
        if (!fs.existsSync(rawPath)) {
            throw new DirNotFoundException("找不到目录", rawPath)
        }

        existify(backupsPath)

        const zip = new AdmZip()
        await zip.addLocalFolderPromise(rawPath, {})
        const backupFile = path.join(backupsPath, `${Date.now()}.zip`)
        await zip.writeZipPromise(backupFile)

        return backupFile
    }

    private static async forgeModInfoReader(modJarInstance: AdmZip): Promise<ModInfoWithNoHashIdentity> {
        const tomlText = modJarInstance.readAsText(modJarInstance.getEntry('META-INF/mods.toml') as AdmZip.IZipEntry, 'utf-8')
        const forgeModInfo: ForgeModTomlLike = toml.parse(tomlText) as ForgeModTomlLike
        const mainMod = forgeModInfo.mods[0]
        const mainID = mainMod.modId

        const iconPath = mainMod.logoFile ? mainMod.logoFile : null
        let iconData: Buffer | null = null

        if (iconPath && modJarInstance.getEntry(iconPath)) {
            iconData = modJarInstance.readFile(modJarInstance.getEntry(iconPath) as AdmZip.IZipEntry) || null
        }

        const modInfo: ModInfoWithNoHashIdentity = {
            name: mainMod.displayName,
            modId: mainID,
            version: mainMod.version,
            description: mainMod.description,
            authors: (mainMod.authors && typeof mainMod.authors === 'string') ? mainMod?.authors?.split(',').map(i => i.trim()) : [],
            dependencies: forgeModInfo?.dependencies?.[mainID] ? forgeModInfo.dependencies[mainID].map(i => i.modId) : [],
            displayName: mainMod.displayName,
            icon: iconData,
            loader: forgeModInfo.modLoader,
            license: forgeModInfo.license || '',
        }
        return modInfo
    }

    private static async fabricModInfoReader(modJarInstance: AdmZip): Promise<ModInfoWithNoHashIdentity> {
        const fabricIndexJson = JSON.parse(modJarInstance.readAsText(modJarInstance.getEntry('fabric.mod.json') as AdmZip.IZipEntry, 'utf-8'))

        const iconEntry = fabricIndexJson.icon || null
        let iconData: Buffer | null = null

        if (iconEntry && modJarInstance.getEntry(iconEntry)) {
            iconData = modJarInstance.readFile(modJarInstance.getEntry(iconEntry) as AdmZip.IZipEntry) || null
        }

        const modInfo: ModInfoWithNoHashIdentity = {
            name: fabricIndexJson.name,
            modId: fabricIndexJson.id,
            version: fabricIndexJson.version,
            description: fabricIndexJson.description || '',
            authors: fabricIndexJson.authors || [],
            dependencies: fabricIndexJson.depends ? Object.keys(fabricIndexJson.depends) : [],
            displayName: fabricIndexJson.name,
            icon: iconData,
            loader: 'fabric',
            license: fabricIndexJson.license || '',
        }

        return modInfo
    }

    private static getMMLIDFromPCL(PCLSetupINI: string): IMMLID {
        const PCLSetup = INI.parse(fs.readFileSync(PCLSetupINI, 'utf-8'))

        let transformedModLoader: Record<string, string> | null = {}

        const mmlid: IMMLID = {
            gameVersion: PCLSetup.VersionOriginal as string,
        }

        const PCLReadKey = {
            VersionForge: 'forge',
            VersionFabric: 'fabric',
            VersionOptifine: 'optifine',
            VersionNeoForge: 'neoforge'
        }

        for (const [key, mapV] of Object.entries(PCLReadKey)) {
            if (PCLSetup[key]) {
                transformedModLoader[mapV] = PCLSetup[key] as string
            }
        }
        if (!Object.keys(transformedModLoader).length) {
            transformedModLoader = null
        }
        mmlid.modLoader = transformedModLoader
        return mmlid
    }

    private static getMMLIDFromHCMLPatches(versionJson: MinecraftVersionJson): IMMLID {
        const mmlid: IMMLID = {}
        if (versionJson.patches) {
            for (const patch of versionJson.patches) {
                if (patch.id === 'game' && patch.version) {
                    mmlid.gameVersion = patch.version
                } else if (['forge', 'neoforge', 'fabric', 'quilt', 'liteloader', 'optifine'].includes(patch.id) && patch.version) {
                    if (!mmlid.modLoader) {
                        mmlid.modLoader = {}
                        //先初始化
                    }
                    mmlid.modLoader[patch.id] = patch.version
                }
            }
        }
        console.log(mmlid)
        return mmlid
    }

}
