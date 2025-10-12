
import AdmZip from "adm-zip";
import { existify } from "./utils/io.ts";
import MinecraftClientInstaller from "./client.ts";
import axios from "axios";
import ConcDownloader from "./downloader/downloader.ts";
import DownloadTask from "./downloader/downloadtask.ts";
import path from "path";
import EventEmitter from "events";
import crypto from 'crypto'
import { type CurseForgeManifestJson, type ModrinthIndexJson } from './types/index.ts'

interface ModPackInstallerOptions {
    name: string,
    minecraftPath: string,
    versionIsolation: boolean,
    java?: string,
}

export default class ModpackInstaller extends EventEmitter {

    public versionPath: string
    public minecraftPath: string
    public java?: string
    public name?: string
    public progress: { [key: string]: number }
    public speed: { [key: string]: number }

    protected statsEmitter: NodeJS.Timeout | null

    constructor(options: ModPackInstallerOptions) {
        super()
        this.minecraftPath = options.minecraftPath
        this.versionPath = options.versionIsolation ? existify(options.minecraftPath, 'versions', options.name) : options.minecraftPath;
        this.java = options.java
        this.name = options.name
        this.progress = {}
        this.speed = {}

        this.statsEmitter = null
    }

    public static modpackTypeDecoder(jar: AdmZip): 'curseforge' | 'modrinth' | 'unk' {
        if (jar.getEntry('manifest.json') && jar.getEntry('modlist.html')) {
            return 'curseforge'
        }
        else if (jar.getEntry('modrinth.index.json')) {
            return 'modrinth'
        }
        else return 'unk'
    }

    public async install(modpack: string) {
        const installPromises: Promise<any>[] = []
        const zip = new AdmZip(modpack)
        const modpackType = ModpackInstaller.modpackTypeDecoder(zip)

        this.progress.unpack = 0
        this.progress.downloadMods = 0

        this.startEmitStats()

        const unpackPromise = new Promise((resolve) => {
            const entries = zip.getEntries().filter(i => i.entryName.startsWith('overrides/')).filter(i => !i.isDirectory)

            const total = entries.length
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i]
                const relativePath = entry.entryName.substring('overrides/'.length);
                const targetPath = path.join(this.versionPath, relativePath);
                zip.extractEntryTo(entry, path.dirname(targetPath), false, true)

                this.progress.unpack = (i + 1) / total
            }
            resolve('')
        })

        installPromises.push(unpackPromise)

        if (modpackType === 'curseforge') {
            const manifestJsonText: string = zip.readAsText(zip.getEntry('manifest.json') as any)
            const manifestJson: CurseForgeManifestJson = JSON.parse(manifestJsonText)
            const installer = this.createCurseForgeModpackClientInstaller(manifestJson)

            installer.on('progress', (progress) => {
                this.progress = { ...this.progress, ...progress }
            })

            installer.on('speed', (speed) => {
                this.speed['installer'] = speed
            })

            installPromises.push(installer.install())

            const downloadPromise = new Promise((resolve) => {
                this.createCurseForgeModsDownloader(manifestJson).then(downloader => {
                    downloader.on('progress', (progress) => {
                        this.progress.downloadMods = progress
                    })

                    downloader.on('speed', (speed) => {
                        this.speed['downloadMods'] = speed
                    })
                    downloader.download().then(resolve)
                })
            })
            installPromises.push(downloadPromise)
        }
        else if (modpackType === 'modrinth') {
            const indexJsonText: string = zip.readAsText(zip.getEntry('modrinth.index.json') as any)
            const indexJson: ModrinthIndexJson = JSON.parse(indexJsonText)
            const installer = this.createModrinthModpackClientInstaller(indexJson)
            const downloader = this.createModrinthModpackModsDownloader(indexJson)

            installer.on('progress', (progress) => {
                this.progress = { ...this.progress, ...progress }
            })
            installer.on('speed', (speed) => {
                this.speed['installer'] = speed
            })
            downloader.on('progress', (progress) => {
                this.progress.downloadMods = progress
            })
            downloader.on('speed', (speed) => {
                this.speed['downloadMods'] = speed
            })

            installPromises.push(installer.install())
            installPromises.push(downloader.download())
        }
        await Promise.all(installPromises)

        this.clearEmitStats()

    }

    public async installFromURL(url: string) {
        const tempUUID = crypto.randomUUID()
        const modpackTempZip = path.join(this.versionPath, `${this.name}.zip`)
        const modpackDownloadTask = new DownloadTask([url], modpackTempZip)

        modpackDownloadTask.on('speed', (speed: number) => { this.speed['downloadModpack'] = speed })
        modpackDownloadTask.on('progress', (progress: number) => {
            this.progress.downloadModpack = progress
        })

        const modpackFile = await modpackDownloadTask.download()

        console.log('整合包下载完成')

        this.speed['downloadModpack'] = 0
        this.progress.downloadModpack = 1

        if (modpackFile) {
            await this.install(modpackFile)
            // fs.rmSync(modpackFile)
            this.clearEmitStats()
        }
        else {
            // fs.existsSync(modpackTempZip) && fs.rmSync(modpackTempZip)
            this.clearEmitStats()
            throw new Error('cannot get modpack')
        }
    }

    protected startEmitStats() {
        if (this.statsEmitter) { return }
        let stackTime = 0
        const emit = () => {
            this.emit('progress', this.progress)
            let totalSpeed = 0
            for (const [key, value] of Object.entries(this.speed)) {
                totalSpeed += value
            }
            this.emit('speed', totalSpeed)
            if (totalSpeed <= 1 * 1024 * 1024) {
                stackTime++
            }
            else {
                stackTime = 0
            }
            if (stackTime > 10) {
                console.log("%cSorry:P Maybe it's too slow to download because we noticed that your speed lower than 1MB/s in 5 seconds. Retry maybe useful,the part you have done won't download second time", 'color:orange')
            }
            console.log(this.speed)
        }
        this.statsEmitter = setInterval(emit, 500);
        emit()
    }

    protected clearEmitStats() {
        for (const key of Object.keys(this.progress)) {
            this.progress[key] = 1
        }
        this.emit('progress', this.progress)
        this.emit('speed', 0)
        this.statsEmitter && clearInterval(this.statsEmitter)
        this.statsEmitter = null
        this.removeAllListeners()
    }

    protected createModrinthModpackClientInstaller(indexJson: ModrinthIndexJson): MinecraftClientInstaller {
        const modLoaderMiaoFormat: { [key: string]: string } = {}
        for (const [key, value] of Object.entries(indexJson.dependencies)) {
            if (key === 'forge') { modLoaderMiaoFormat['forge'] = value }
            else if (key === 'fabric-loader') { modLoaderMiaoFormat['fabric'] = value }
            else if (key === 'neoforge') { modLoaderMiaoFormat['neoforge'] = value }
            else if (key === 'quilt-loader') { modLoaderMiaoFormat['quilt'] = value }
        }

        const version = indexJson.dependencies.minecraft
        const modpackName = this.name || indexJson.name

        const clientInstaller = new MinecraftClientInstaller({
            java: this.java,
            version: version,
            versionIsolation: true,
            minecraftPath: this.minecraftPath,
            modLoader: Object.keys(modLoaderMiaoFormat).length ? modLoaderMiaoFormat : null,
            name: modpackName
        })
        return clientInstaller
    }

    protected createModrinthModpackModsDownloader(indexJson: ModrinthIndexJson): ConcDownloader {
        const downloader = new ConcDownloader(64)
        for (const file of indexJson.files) {
            downloader.add(new DownloadTask([file.downloads?.[0]], path.join(this.versionPath, file.path), file.hashes.sha1))
        }
        return downloader
    }

    protected createCurseForgeModpackClientInstaller(manifestJson: CurseForgeManifestJson): MinecraftClientInstaller {
        const minecraft = manifestJson.minecraft

        const version = minecraft.version
        const modLoadersMiaoFormat: { [key: string]: string } = {}

        const modpackName = manifestJson.name as string

        for (const i of minecraft.modLoaders || []) {
            const loader = i.id.split('-')[0]
            const version = i.id.split('-')[1]
            modLoadersMiaoFormat[loader] = version
        }

        const clientInstaller = new MinecraftClientInstaller({
            minecraftPath: this.minecraftPath,
            version: version,
            versionIsolation: true,
            java: this.java,
            name: this.name || modpackName,
            modLoader: modLoadersMiaoFormat
        })
        return clientInstaller
    }

    protected async createCurseForgeModsDownloader(manifestJson: CurseForgeManifestJson): Promise<ConcDownloader> {
        try {
            const fileIds: number[] = manifestJson.files.map(i => i.fileID)

            const makeRequestWithRetry = async (fileIds: number[], maxRetries = 10) => {

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        const req = await axios.post("https://api.curseforge.com/v1/mods/files",
                            { fileIds: fileIds },
                            {
                                headers: {
                                    'Host': 'api.curseforge.com',
                                    'Content-Type': 'application/json',
                                    'x-api-key': '$2a$10$GXzIANYhdqiVSvSZcnVqEuiG8W9T3DFjeM04q6ul8D1yLSwzCyd7O',
                                    'Referer': 'api.kiyuu.cn',
                                },
                                timeout: 10000
                            }
                        );
                        return req;

                    } catch (error) {
                        if (attempt === maxRetries) {
                            break;
                        }
                        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                        console.log(`等待 ${delay}ms 后重试...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                throw new Error(`请求失败:无法获取Curseforge模组下载地址列表,这通常可能是网络问题造成的连接超时，您可以切换网络连接或者稍后重试`);
            }

            const req = await makeRequestWithRetry(fileIds, 10)

            const curseforgeModsResults: { fileName: string, hashes: { value: string, algo: number }[], downloadUrl: string, id: number }[] = req.data?.data

            const modsDir = existify(this.versionPath, 'mods')
            const downloader = new ConcDownloader(30)

            console.log(curseforgeModsResults)

            for (const mod of curseforgeModsResults) {
                const sha1: string | undefined = mod.hashes.filter(i => i.algo === 1)?.[0].value || undefined
                const id: number = mod.id

                const idHead = id.toString().slice(0, 4)
                const idTail = id.toString().slice(4)

                const url = mod.downloadUrl || `https://edge.forgecdn.net/files/${idHead}/${idTail}/${mod.fileName}`

                downloader.add(new DownloadTask([url], path.join(modsDir, mod.fileName), sha1))
            }
            return downloader

        } catch (error) {
            console.error(error)
            throw new Error('Fail to create Downloader Due To the Network Error | 无法连接到Curseforge服务器 请检查网络连接稍后再试')
        }
    }

    protected async getCurseForgeRedirectFile(projectID: number, fileID: number): Promise<string> {
        try {
            const mcimirrorURL = `https://mod.mcimirror.top/curseforge/v1/mods/${projectID}/files/${fileID}/download-url`
            console.log(mcimirrorURL)
            const req = await axios.get<any>(mcimirrorURL, { responseType: 'json' })
            const url: string = req.data.data
            return url
        } catch (error) {
            console.log(error)
            throw new Error('get url failed')
        }
    }
}



