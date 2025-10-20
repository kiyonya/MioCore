import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

import HashUtil from '../../utils/hash.ts'
import { DirNotFoundException, FileNotFoundException } from '../../error.ts'
import pLimit from 'p-limit'
import JSONIO from '../../utils/jsonIO.ts'

import INI from '../../utils/ini.ts'
import { type MMLDataJson } from '../../types/index.ts'
import { existify, getDirSize } from '../../utils/io.ts'

import toml from 'toml'



type InstanceInfoStruct = {
  icon: string | null
  name: string
  path: string
  modsCount: number
  screenshotsCount: number
  modLoaders?: Record<string, string> | null
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

export default abstract class InstanceUtil {

  public static async getInstanceFrom(
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

    let st = Date.now()

    const processInstancePromises = instanceDirs.map((dir: string) =>
      limit(() => this.getInstanceOf(dir, minecraftPath, versionIsolation))
    )
    const result = await Promise.all(processInstancePromises)
    let et = Date.now()

    console.log(result)
    console.log(et - st)
  }

  public static async getInstanceOf(
    instanceDir: string,
    minecraftPath: string,
    versionIsolation: boolean = true
  ): Promise<InstanceInfoStruct> {
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
      versionIsolation: versionIsolation
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

      instanceInfo.latestRun = mmlDataJson.latestRun || -1
      instanceInfo.playTime = mmlDataJson.playTime || -1
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
      instanceInfo.modLoaders = MMLDataJson.modLoader
      instanceInfo.installTime = MMLDataJson.installTime
    }
    //模组统计
    if (fs.existsSync(path.join(instanceDir, 'mods'))) {
      const mods = await this.getModListOfDir(path.join(instanceDir, 'mods'))
      instanceInfo.modsCount = mods.length
    }
    //截图统计
    if (fs.existsSync(path.join(instanceDir, 'screenshots'))) {
      //先检查截图个数
      const screenshots = fs
        .readdirSync(path.join(instanceDir, 'screenshots'))
        .filter(i => ['.png', '.jpg', '.jpeg'].includes(path.extname(i)))
        .map(i => path.join(instanceDir, 'screenshots', i))

      instanceInfo.screenshotsCount = screenshots.length
      instanceInfo.background = screenshots?.[0] || null
    }
    //存档统计
    if (fs.existsSync(path.join(instanceDir, 'saves'))) {
      const savesDir = path.join(instanceDir, 'saves')
      const saves = await this.getSavesOf(savesDir)
      instanceInfo.saves = saves
    }

    //
    if (instanceInfo.modLoaders) {
      instanceInfo.canInstallMod = true
    }

    return instanceInfo
  }

  public static async getModListOfDir(
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

  public static async getModInfoOfDir(modsDir: string) {

    if (!fs.existsSync(modsDir)) {
      throw new DirNotFoundException('mods文件夹不存在', modsDir)
    }
    const mods = await this.getModListOfDir(modsDir, true)

    let st = Date.now()
    const limit = pLimit(32)
    const modInfoPromises = mods.map(modFile => limit(() => this.getModInfoOf(modFile)))
    const modInfos = await Promise.all(modInfoPromises)
    let et = Date.now()

    console.log(`读取${mods.length}个模组信息耗时${et - st}ms`)

    console.log(modInfos)

    return modInfos

  }

  public static async getModInfoOf(modFile: string) {
    if (!fs.existsSync(modFile)) {
      throw new FileNotFoundException('mod文件不存在', modFile)
    }

    const zip = new AdmZip(modFile)

    if (zip.getEntry('META-INF/mods.toml')) {
      //forge mod
      return this.forgeModInfoReader(zip)
    }
    // else if(zip.getEntry('fabric.mod.json')){
    //   //fabric mod
    // }
    // else if(zip.getEntry('quilt.mod.json')){
    //   //quilt mod
    // }
    else return {} as ModInfo
  }


  public static async getSavesOf(
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

  protected static getMMLDataFromPCL(
    instanceDir: string,
    PCLSetupINI: string
  ): MMLDataJson {
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
}

