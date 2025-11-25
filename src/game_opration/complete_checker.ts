import path from "path"
import fs from 'fs'
import { existify, mavenToPath } from "../utils/io.ts"
import { type MinecraftAssetsJson, type MinecraftVersionJson } from "../types/index.ts"
import { checkOSRules } from "../utils/os.ts"
import Request from "../utils/request.ts"
import HashUtil from "../utils/hash.ts"
import pLimit from "p-limit"
import InstanceUtil from "../modules/game/instance_util.ts"
import EventEmitter from "events"

export interface GameCompletenessCheckerOptions {
    minecraftPath: string,
    name: string,
    versionIsolation: boolean,
    skips?: Partial<Record<'lwjgl' | 'assets', boolean>>
}

type CheckEvents = {
    'progress': (progress: number) => void;
    'oncheck': (checked: string) => void;
}

export interface MissingFile {
    url?: string,
    path: string,
    sha1?: string,
    type?: string,
    msg?: string
}

interface IGameFileCheckResult {
    repairable: MissingFile[],
    irreparable: MissingFile[],
}

export default class GameCompletenessChecker extends EventEmitter {

    on<K extends keyof CheckEvents>(
        event: K,
        listener: CheckEvents[K]
    ): this {
        return super.on(event, listener);
    }

    once<K extends keyof CheckEvents>(
        event: K,
        listener: CheckEvents[K]
    ): this {
        return super.once(event, listener);
    }

    emit<K extends keyof CheckEvents>(
        event: K,
        ...args: Parameters<CheckEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

    public minecraftPath: string
    public name: string
    public versionIsolation: boolean
    //
    public libPath: string
    public assetsPath: string
    public assetsIndexesPath: string
    public assetsObjectsPath: string
    public versionPath: string
    public versionJSONPath: string
    public side: 'client' | 'server' = 'client'
    public skips: Record<string, boolean>

    constructor(options: GameCompletenessCheckerOptions) {
        super()
        this.minecraftPath = options.minecraftPath
        this.name = options.name
        this.versionIsolation = options.versionIsolation
        //
        this.libPath = path.join(this.minecraftPath, 'libraries')
        this.versionPath = this.versionIsolation ? path.join(this.minecraftPath, 'versions', this.name) : this.minecraftPath
        //
        const assetsPath = existify(this.minecraftPath, 'assets')
        this.assetsPath = assetsPath
        this.assetsIndexesPath = existify(assetsPath, 'indexes')
        this.assetsObjectsPath = existify(assetsPath, 'objects')
        //
        this.versionJSONPath = path.join(this.versionPath, `${this.name}.json`)
        //
        this.skips = { ...options.skips }
    }

    public async check(concurrency: number = 64): Promise<IGameFileCheckResult> {

        const checkFileResult: IGameFileCheckResult = {
            repairable: [],
            irreparable: [],
        }

        const checkFiles: { url?: string, path: string, sha1?: string, type?: string }[] = []

        if (!fs.existsSync(this.versionJSONPath)) {
            console.log('缺少版本json,请尝试重新安装游戏')
            throw new Error('Missing version json')
        }

        const instanceInfo = await InstanceUtil.readInstanceOf(this.versionPath, this.minecraftPath, this.versionIsolation)
        const versionJSON: MinecraftVersionJson = JSON.parse(fs.readFileSync(this.versionJSONPath, 'utf-8'))

        //GameJar
        const gameJarPath = path.join(this.versionPath, `${this.name}.jar`)
        const gameJarDownload = versionJSON.downloads[this.side]
        const gameJarURL = gameJarDownload.url
        const gameJarSha1 = gameJarDownload.sha1
        checkFiles.push({
            url: gameJarURL,
            path: gameJarPath,
            sha1: gameJarSha1,
            type: 'gamejar'
        })
        //Check Libs
        const requiredLibs = versionJSON.libraries.filter(lib => checkOSRules(lib.rules))
        for (const lib of requiredLibs) {
            //support libs
            if (lib.downloads?.artifact) {
                checkFiles.push({
                    url: lib.downloads?.artifact?.url || (lib.url + mavenToPath(lib.name)).replaceAll('\\', '/'),
                    path: path.join(this.libPath, mavenToPath(lib.name)),
                    sha1: lib.downloads?.artifact?.sha1 || undefined,
                    type: 'runtimelibs'
                });
            }
            //lwjgl natives
            if (lib.downloads?.classifiers && !this.skips.lwjgl) {
                for (let natives of Object.values(lib.downloads.classifiers)) {
                    checkFiles.push({
                        path: path.join(this.libPath, natives.path),
                        url: natives.url,
                        sha1: natives.sha1,
                        type: 'nativelibs'
                    });
                }
            }
        }

        //如果是forge或者neoforge,缺少universal存储位置的时候停止检查，因为这个文件是通过编译得到的，无法通过url下载，如果丢了只能重新安装或者覆盖修复
        //一般来说universal的位置是 libraries/net/minecraftforge/forge/{gameVersion}-{version}/forge-{version}-universal.jar
        //或者用maven路径 net.minecraftforge:forge:游戏版本-forge版本:universal
        //在legacyforge里 forge版本结尾同样是游戏版本，请务必携带

        const modLoader = instanceInfo?.modLoader
        if (modLoader) {
            this.emit('oncheck', 'checking-modloader')
            if (modLoader['forge']) {
                const forgeVersion = modLoader['forge']
                const gameVersion = instanceInfo.version
                const buildUniversalFolder = path.join(this.libPath, 'net', 'minecraftforge', 'forge', `${gameVersion}-${forgeVersion}`)
                const buildUniversalFolderLegacy = path.join(this.libPath, 'net', 'minecraftforge', 'forge', `${gameVersion}-${forgeVersion}-${gameVersion}`)

                if ([buildUniversalFolder, buildUniversalFolderLegacy].every(folder => !fs.existsSync(folder))) {
                    checkFileResult.irreparable.push({
                        path: buildUniversalFolder,
                        msg: '缺失forge构建目录'
                    })
                }
            }
            else if (modLoader['neoforge']) {
                const neoforgeVersion = modLoader['forge']
                const buildUniversalFolder = path.join(this.libPath, 'net', 'neoforged', 'neoforge', `${neoforgeVersion}`)
                if (!fs.existsSync(buildUniversalFolder)) {
                    checkFileResult.irreparable.push({
                        path: buildUniversalFolder,
                        msg: '缺失neoforge构建目录'
                    })
                }
            }
        }
        //check assets
        if (!this.skips['assets']) {
            const assetsId = versionJSON.assetIndex.id
            const assetsIndexJsonPath = path.join(this.assetsIndexesPath, `${assetsId}.json`)
            if (!fs.existsSync(assetsIndexJsonPath)) {
                const assetsJsonDownloadURL = versionJSON.assetIndex.url
                const req = await Request.get<MinecraftAssetsJson>(assetsJsonDownloadURL, { responseType: 'json' })
                fs.writeFileSync(assetsIndexJsonPath, JSON.stringify(req.data as any), 'utf-8')
            }
            const assetsJson: MinecraftAssetsJson = JSON.parse(fs.readFileSync(assetsIndexJsonPath, 'utf-8'))
            for (const [filename, value] of Object.entries(assetsJson.objects)) {
                const hash = value.hash
                checkFiles.push({
                    url: `https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`,
                    path: path.join(this.assetsObjectsPath, hash.slice(0, 2), hash),
                    sha1: hash,
                    type: 'assets'
                })
            }
        }

        const limit = pLimit(concurrency)

        const totalFiles = checkFiles.length
        let checkedFiles = 0

        await Promise.all(checkFiles.map(file => limit(async () => {
            const isValid = await this.isFileValid(file.path, file.sha1)
            checkedFiles++
            this.emit('oncheck', file.path)
            this.emit('progress', checkedFiles / totalFiles)
            if (!isValid) {
                if (file.url) {
                    checkFileResult.repairable.push(file)
                }
                else {
                    checkFileResult.irreparable.push(file)
                }
            }
        })
        ))

        this.emit('progress', 1)
        this.removeAllListeners()
        return checkFileResult
    }

    private async isFileValid(filePath: string, sha1?: string): Promise<boolean> {
        if (!fs.existsSync(filePath)) {
            return false
        }
        if (!sha1) { return true }
        const fileSha1 = await HashUtil.sha1(filePath)
        return fileSha1 === sha1
    }
}