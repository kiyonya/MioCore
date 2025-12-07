import path from 'path'
import fs from 'fs'
import AdmZip from 'adm-zip'
import toml from 'toml'
import pLimit from 'p-limit'

import HashUtil from '../utils/hash.ts'
import { DirNotFoundException, FileNotFoundException } from '../error.ts'
import JSONIO from '../utils/jsonIO.ts'
import INI from '../utils/ini.ts'
import { type MMLDataJson } from '../types/index.ts'
import { existify, getDirSize, getFileNameFromPath } from '../utils/io.ts'
import ModActions from './mod_actions.ts'
import os from 'os'

export type InstanceInfoStruct = {
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

type ModInfo = {
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


export default abstract class InstanceUtil {

  public static ModActions = ModActions

  public static async readInstanceFrom(
    minecraftPath: string,
    versionIsolation: boolean = true
  ) {
    const versionsPath = versionIsolation
      ? path.join(minecraftPath, 'versions')
      : minecraftPath

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
      limit(() => this.readInstanceOf(dir, minecraftPath, versionIsolation))
    )
    const result = await Promise.all(processInstancePromises)
    return result
  }

  public static async readInstanceOf(
    instanceDir: string,
    minecraftPath: string,
    versionIsolation: boolean = true
  ): Promise<InstanceInfoStruct> {

    if (!fs.existsSync(instanceDir) || !fs.existsSync(minecraftPath)) {
      throw new DirNotFoundException('无效文件夹')
    }

    const instanceName = path.basename(instanceDir)

    const instanceInfo: InstanceInfoStruct = {
      name: instanceName,
      path: instanceDir,
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
      minecraftPath: minecraftPath,
      versionIsolation: versionIsolation,
      version: '',
      moments: [],
      pathes: {
        version: instanceDir
      },
    }

    if (
      fs.existsSync(path.join(instanceDir, `${instanceName}.json`)) &&
      fs.existsSync(path.join(instanceDir, `${instanceName}.jar`))
    ) {
      instanceInfo.ok = true
    }

    if (fs.existsSync(path.join(instanceDir, 'icon.png'))) {
      instanceInfo.icon = path.join(instanceDir, 'icon.png')
    }

    existify(instanceDir, 'MML')
    const MMLDataJsonPath = path.join(instanceDir, 'MML', 'data.json')

    if (fs.existsSync(MMLDataJsonPath)) {
      const mmlDataJson: MMLDataJson = new JSONIO(MMLDataJsonPath)
        .open()
        .toObject() as MMLDataJson
      const modLoader = mmlDataJson['modLoader'] || null
      instanceInfo.installTime = mmlDataJson.installTime
      instanceInfo.version = mmlDataJson.version
      instanceInfo.latestRun = mmlDataJson.latestRun || -1
      instanceInfo.playTime = mmlDataJson.playTime || -1
      instanceInfo.modLoader = modLoader
    } else if (fs.existsSync(path.join(instanceDir, 'PCL', 'Setup.ini'))) {
      const MMLDataJson = this.getMMLDataFromPCL(
        instanceDir,
        path.join(instanceDir, 'PCL', 'Setup.ini')
      )
      fs.writeFileSync(
        MMLDataJsonPath,
        JSON.stringify(MMLDataJson, null, 4),
        'utf-8'
      )
      instanceInfo.modLoader = MMLDataJson.modLoader
      instanceInfo.installTime = MMLDataJson.installTime
      instanceInfo.version = MMLDataJson.version
    }
    //模组统计
    if (fs.existsSync(path.join(instanceDir, 'mods'))) {
      const mods = await this.readModDir(path.join(instanceDir, 'mods'))
      instanceInfo.modsCount = mods.length
      instanceInfo.pathes.mods = path.join(instanceDir, 'mods')
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
      instanceInfo.pathes.screenshots = path.join(instanceDir, 'screenshots')
    }
    //存档统计
    if (fs.existsSync(path.join(instanceDir, 'saves'))) {
      const savesDir = path.join(instanceDir, 'saves')
      const saves = await this.readSavesFromDir(savesDir)
      instanceInfo.saves = saves
      instanceInfo.pathes.saves = path.join(instanceDir, 'saves')
    }

    //
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

  public static async readModInfoFromDir(modsDir: string): Promise<ModInfo[]> {

    if (!fs.existsSync(modsDir)) {
      throw new DirNotFoundException('mods文件夹不存在', modsDir)
    }

    let mods = await this.readModDir(modsDir, true)

    const limit = pLimit(16)
    const modInfoPromises = mods.map(modFile => limit(() => this.readModInfoOf(modFile)))
    const modInfos = await Promise.all(modInfoPromises)

    console.log(modInfos)
    return modInfos
  }

  public static async readModInfoOf(modFile: string) {
    if (!fs.existsSync(modFile)) {
      throw new FileNotFoundException('mod文件不存在', modFile)
    }
    const zip = new AdmZip(modFile)

    if (zip.getEntry('META-INF/mods.toml')) {
      //forge mod
      return this.forgeModInfoReader(zip)
    }
    else if (zip.getEntry('fabric.mod.json')) {
      //fabric mod
      return this.fabricModInfoReader(zip)
    }
    else return {} as ModInfo
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

  protected static getMMLDataFromPCL(instanceDir: string, PCLSetupINI: string): MMLDataJson {
    const PCLSetup = INI.parse(fs.readFileSync(PCLSetupINI, 'utf-8'))

    const versionName = path.basename(instanceDir)
    const versionJson = path.join(instanceDir, `${versionName}.json`)
    const installTime = fs.statSync(versionJson).birthtime.getTime()

    let transformedModLoader: Record<string, string> | null = {}

    const MMLDataJson: MMLDataJson = {
      version: PCLSetup.VersionOriginal as string,
      name: versionName,
      mmlVersion: 1,
      installTime: installTime,
      installTimeUTC: new Date(installTime).toUTCString()
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
    MMLDataJson.modLoader = transformedModLoader

    return MMLDataJson
  }

  protected static async forgeModInfoReader(modJarInstance: AdmZip): Promise<ModInfo> {
    const tomlText = modJarInstance.readAsText(modJarInstance.getEntry('META-INF/mods.toml') as AdmZip.IZipEntry, 'utf-8')
    const forgeModInfo: ForgeModTomlLike = toml.parse(tomlText)
    const mainMod = forgeModInfo.mods[0]
    const mainID = mainMod.modId

    const iconPath = mainMod.logoFile ? mainMod.logoFile : null
    let iconData: Buffer | null = null

    if (iconPath && modJarInstance.getEntry(iconPath)) {
      iconData = modJarInstance.readFile(modJarInstance.getEntry(iconPath) as AdmZip.IZipEntry) || null
    }

    const modInfo: ModInfo = {
      name: mainMod.displayName,
      modId: mainID,
      version: mainMod.version,
      description: mainMod.description,
      authors: (mainMod.authors && typeof mainMod.authors === 'string') ? mainMod?.authors?.split(',').map(i => i.trim()) : [],
      dependencies: forgeModInfo?.dependencies?.[mainID] ? forgeModInfo.dependencies[mainID].map(i => i.modId) : [],
      displayName: mainMod.displayName,
      icon: iconData,
      loader: forgeModInfo.modLoader,
      license: forgeModInfo.license || ''
    }
    return modInfo
  }

  protected static async fabricModInfoReader(modJarInstance: AdmZip): Promise<ModInfo> {
    const fabricIndexJson = JSON.parse(modJarInstance.readAsText(modJarInstance.getEntry('fabric.mod.json') as AdmZip.IZipEntry, 'utf-8'))

    const iconEntry = fabricIndexJson.icon || null
    let iconData: Buffer | null = null

    if (iconEntry && modJarInstance.getEntry(iconEntry)) {
      iconData = modJarInstance.readFile(modJarInstance.getEntry(iconEntry) as AdmZip.IZipEntry) || null
    }

    const modInfo: ModInfo = {
      name: fabricIndexJson.name,
      modId: fabricIndexJson.id,
      version: fabricIndexJson.version,
      description: fabricIndexJson.description || '',
      authors: fabricIndexJson.authors || [],
      dependencies: fabricIndexJson.depends ? Object.keys(fabricIndexJson.depends) : [],
      displayName: fabricIndexJson.name,
      icon: iconData,
      loader: 'fabric',
      license: fabricIndexJson.license || ''
    }

    return modInfo
  }

}
