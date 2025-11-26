import axios from "axios";
import EventEmitter from "events";
import fs from 'fs'
import path from "path";
import DownloadTask from "../downloader/downloadtask.ts";
import AdmZip from "adm-zip";
import { existify } from "../utils/io.ts";
import GetForgeInstaller from "../jars/forge_installer.ts";
import GetNeoForgeInstaller from "../jars/neoforge_installer.ts";
import FabricGather from "../gather/gather_fabric.ts";
import ConcDownloader from "../downloader/downloader.ts";
import FabricServerInstaller from "../installer/server/fabric_server_installer.ts";
import ForgeGather from "../gather/gather_forge.ts";
import ForgeServerInstaller from "../installer/server/forge_server_installer.ts";
import NeoNeoForgeGather from "../gather/gather_neoforge.ts";
import NeoForgeServerInstaller from "../installer/server/neoforge_server_installer.ts";
import JavaRuntimeInstaller from "../java/java_runtime_installer.ts";

import { type MinecraftVersionJson, type DownloadTaskItem } from '../types/index.ts'
import { getSystemInfo } from "../utils/os.ts";
import { JavaRuntimeResolver } from "../java/java_runtime_resolver.ts";
import NameMap from "../format/namemap.ts";

interface MinecraftServerInstallerOptions {
    java?: string,
    serverPath: string,
    name: string,
    version: string,
    modLoader?:
    Partial<Record<"forge" | "fabric" | "neoforge" | "quilt" | 'fabricapi', string>> | null,
}

export default class MinecraftServerInstaller extends EventEmitter {
    public OSINFO = getSystemInfo()
    public javaExecutablePath?: string
    public serverPath: string
    public name: string
    public version: string
    modLoader?:
       Partial<Record<"forge" | "fabric" | "neoforge" | "quilt" | 'fabricapi', string>> | null = null
    public libPath: string
    public versionPath: string
    public side: 'server'


    constructor(options: MinecraftServerInstallerOptions) {
        console.log(options)
        super()
        this.javaExecutablePath = options.java
        this.serverPath = options.serverPath
        this.version = options.version
        this.name = options.name
        this.modLoader = options.modLoader

        console.log(options)

        this.libPath = existify(this.serverPath, 'libraries')
        this.versionPath = existify(this.serverPath, 'versions')

        this.side = 'server'
    }

    async install() {
        //生成EULA
        const eulaText = "eula=true"
        fs.writeFileSync(path.join(this.serverPath, 'eula.txt'), eulaText, 'utf-8')

        //获取版本JSON
        const versionJson = await this.getVersionJson(this.version)

        //检查Java
        const javaExecutablePathAvailable = await this.resolveJavaRuntime(versionJson)
        if (!javaExecutablePathAvailable) {
            throw new Error("没有可用的JAVA")
        }
        this.javaExecutablePath = javaExecutablePathAvailable

        //下载服务端
        const downloadAndUnpackServerPromise: Promise<string> = new Promise((resolve, reject) => {
            const serverCoreURL = versionJson.downloads.server.url
            const serverCoreSha1 = versionJson.downloads.server.sha1
            const downloadTask = new DownloadTask([serverCoreURL], path.join(this.serverPath, 'server.jar'), serverCoreSha1, false)
            downloadTask.download().then(serverJar => {
                if (!serverJar) { reject('No Server Jar') }
                else {
                    const jarFile = new AdmZip(serverJar)

                    const libFiles = jarFile.getEntries().filter(i => i.entryName.startsWith('META-INF/libraries/')) || [];
                    for (const lib of libFiles) {
                        if (lib.isDirectory) { continue }
                        const relativePath = lib.entryName.substring('META-INF/libraries/'.length);
                        const targetPath = path.join(this.libPath, relativePath);
                        jarFile.extractEntryTo(lib, path.dirname(targetPath), false, true);
                    }

                    const versionFiles = jarFile.getEntries().filter(v => v.entryName.startsWith('META-INF/versions/')) || [];
                    for (const version of versionFiles) {
                        if (version.isDirectory) { continue }
                        const relativePath = version.entryName.substring('META-INF/versions/'.length);
                        const targetPath = path.join(this.versionPath, relativePath);

                        jarFile.extractEntryTo(version, path.dirname(targetPath), false, true, false);
                    }

                }
                resolve('u')
            })
        })
        const modLoaderLibsDownloader: Promise<ConcDownloader> = this.createModLoaderLibsDownloader(versionJson)

        const mainDownloadAndInstallPromise: Promise<any> = new Promise((resolve) => {
            Promise.all([downloadAndUnpackServerPromise,
                new Promise((resolve) => {
                    modLoaderLibsDownloader.then(downloader => {
                        downloader.download().then(resolve)
                    })
                })
            ]).then(() => {
                this.installModLoader().then(resolve)
            })
        })

        await mainDownloadAndInstallPromise

        console.log('DONE')

    }

    protected async getVersionJson(version: string): Promise<MinecraftVersionJson> {
        interface ManifestJson {
            versions: { id: string; url: string }[];
        }
        try {
            const manifestJson: ManifestJson = (
                await axios.get<ManifestJson>(
                    "https://piston-meta.mojang.com/mc/game/version_manifest.json",
                    {
                        responseType: "json",
                    }
                )
            ).data;

            const versionJsonURL = manifestJson.versions?.filter(
                (i) => i.id === version
            )?.[0].url;
            if (versionJsonURL) {
                const versionJson: MinecraftVersionJson = (
                    await axios.get<MinecraftVersionJson>(versionJsonURL, { responseType: "json" })
                ).data;
                return versionJson;
            } else {
                throw new Error("No Version Found");
            }
        } catch (error) {
            throw error;
        }
    }

    protected async createModLoaderLibsDownloader(versionJson: MinecraftVersionJson): Promise<ConcDownloader> {

        const modLoaderInstallerUnpackTasks: Promise<any>[] = []

        if (this.modLoader?.forge) {
            const getForgeInstaller = new GetForgeInstaller({
                versionPath: this.serverPath,
                version: this.version,
                forgeVersion: this.modLoader.forge
            })

            modLoaderInstallerUnpackTasks.push(getForgeInstaller.getInstaller())
        }
        else if (this.modLoader?.neoforge) {
            const getNeoforgeInstaller = new GetNeoForgeInstaller({
                versionPath: this.serverPath,
                version: this.version,
                neoforgeVersion: this.modLoader.neoforge
            })

            modLoaderInstallerUnpackTasks.push(getNeoforgeInstaller.getInstaller())
        }

        await Promise.all(modLoaderInstallerUnpackTasks)

        const modLoaderGatherPromises: Promise<DownloadTaskItem[]>[] = []

        console.log(this.modLoader)

        for (let key of Object.keys(this.modLoader || {})) {

            if (key === 'fabric' && this.modLoader?.fabric) {

                const fabricGather = new FabricGather({
                    fabricVersion: this.modLoader.fabric,
                    fabricAPIVersion: this.modLoader.fabricapi || undefined,
                    libPath: this.libPath,
                    modsDir: existify(this.serverPath, 'mods'),
                    side: this.side,
                    version: this.version
                })

                modLoaderGatherPromises.push(fabricGather.gather())
            }
            else if (key === 'forge' && this.modLoader?.forge) {

                const forgeGather = new ForgeGather({
                    forgeWorkDir: path.join(this.serverPath, '.forge'),
                    version: this.version,
                    libPath: this.libPath,
                    side: this.side,
                    mojmapsURL: versionJson.downloads[`${this.side}_mappings`].url,
                    mojmapsSha1: versionJson.downloads[`${this.side}_mappings`].sha1,
                })

                modLoaderGatherPromises.push(forgeGather.gather())
            }
            else if (key === 'neoforge' && this.modLoader?.neoforge) {

                const neoforgeGarher = new NeoNeoForgeGather({
                    neoforgeWorkDir: path.join(this.serverPath, '.neoforge'),
                    libPath: this.libPath,
                    side: this.side,
                    version: this.version,
                    mojmapsURL: versionJson.downloads[`${this.side}_mappings`].url,
                    mojmapsSha1: versionJson.downloads[`${this.side}_mappings`].sha1,
                })

                modLoaderGatherPromises.push(neoforgeGarher.gather())
            }
        }

        const libs = (await Promise.all(modLoaderGatherPromises)).flat()
        console.log(libs)

        const modLoaderLibsDownloader = new ConcDownloader(50)
        for (const lib of libs) {
            modLoaderLibsDownloader.add(new DownloadTask([lib.url], lib.path, lib.sha1, false))
        }
        return modLoaderLibsDownloader
    }

    protected async installModLoader() {
        const modLoaderInstallers: any[] = []
        for (const key of Object.keys(this.modLoader || {})) {
            if (key === 'fabric' && this.modLoader?.fabric) {

                const fabricServerInstaller = new FabricServerInstaller({
                    version: this.version,
                    serverPath: this.serverPath,
                    fabricVersion: this.modLoader.fabric,
                    serverJarPath: path.join(this.serverPath, 'server.jar')
                })

                modLoaderInstallers.push(fabricServerInstaller)
            }
            else if (key === 'forge' && this.modLoader?.forge) {
                const forgeServerInstaller = new ForgeServerInstaller({
                    forgeWorkDir: path.join(this.serverPath, '.forge'),
                    java: this.javaExecutablePath as string,
                    libPath: this.libPath,
                    serverPath: this.serverPath,
                    serverJarPath: path.join(this.serverPath, 'server.jar')
                })

                modLoaderInstallers.push(forgeServerInstaller)
            }
            else if (key === 'neoforge' && this.modLoader?.neoforge) {

                const neoforgeServerInstaller = new NeoForgeServerInstaller({
                    neoforgeWorkDir: path.join(this.serverPath, '.neoforge'),
                    java: this.javaExecutablePath as string,
                    libPath: this.libPath,
                    serverPath: this.serverPath,
                    serverJarPath: path.join(this.serverPath, 'server.jar')
                })

                modLoaderInstallers.push(neoforgeServerInstaller)
            }
        }

        for (const installer of modLoaderInstallers) {
            await installer.install()
        }
    }

    private async resolveJavaRuntime(versionJson: MinecraftVersionJson): Promise<string | null> {

        let requiredJavaRuntimeVersion = String(versionJson.javaVersion?.majorVersion) || '8'
        let requiredJVMVersion = requiredJavaRuntimeVersion === "8" ? '1.8.0' : requiredJavaRuntimeVersion

        const localJavaExecutablePath = path.join(this.serverPath, 'java', `${this.OSINFO.platform}-${this.OSINFO.arch}`, String(requiredJavaRuntimeVersion))

        let javaExecutablePath: string | null = null

        if (this.javaExecutablePath) {
            const isUserSelectedJavaAvailable = await JavaRuntimeResolver.isJavaValid(this.javaExecutablePath, requiredJVMVersion)
            if (isUserSelectedJavaAvailable) {
                javaExecutablePath = this.javaExecutablePath
            }
        } else {
            //查找或者安装java了
            const localJavaPath: string = this.OSINFO.platform === 'win32' ? path.join(localJavaExecutablePath, 'bin', 'java.exe') : localJavaExecutablePath
            const isLocalJavaAvailable = await JavaRuntimeResolver.isJavaValid(localJavaPath, requiredJVMVersion)
            if (isLocalJavaAvailable) {
                //本地可用就用本地的了
                javaExecutablePath = localJavaPath
            }
            else {
                //在本地安装java
                const runtimeVersion = versionJson.javaVersion?.component || 'jre-legacy'
                const javaRuntimeInstaller = new JavaRuntimeInstaller(runtimeVersion, localJavaExecutablePath, NameMap.getMojangJavaOSIndex(this.OSINFO.platform, this.OSINFO.arch))
                const installedJavaHome: string = await javaRuntimeInstaller.install()
                javaRuntimeInstaller.removeAllListeners()
                //检查安装完成的java是否可以用
                const isInstalledJavaExecutablePathAvailable = await JavaRuntimeResolver.isJavaValid(localJavaPath, requiredJVMVersion)
                if (isInstalledJavaExecutablePathAvailable) {
                    javaExecutablePath = localJavaPath
                }
            }
        }
        return javaExecutablePath
    }
}