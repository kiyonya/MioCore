
import EventEmitter from "events";
import { existify, mavenToPath } from "../utils/io.ts";
import path from "path";
import axios from "axios";
import fs from "fs";
import ConcDownloader from "../downloader/downloader.ts";
import DownloadTask from "../downloader/downloadtask.ts";
import GetForgeInstaller from "../jars/forge_installer.ts";
import { isLegacyForgeInstaller } from "../utils/forge.ts";
import ForgeGather from "../gather/gather_forge.ts";
import ForgeInstaller from "../installer/forge_installer.ts";
import GetNeoForgeInstaller from "../jars/neoforge_installer.ts";
import NeoNeoForgeGather from "../gather/gather_neoforge.ts";
import NeoForgeInstaller from "../installer/neoforge_installer.ts";
import { checkOSRules, getSystemInfo } from "../utils/os.ts";
import FabricGather from "../gather/gather_fabric.ts";
import FabricInstaller from "../installer/fabric_installer.ts";
import QuiltGather from "../gather/gather_quilt.ts";
import QuiltInstaller from "../installer/quilt_installer.ts";
import JavaRuntimeInstaller from "../java/java_runtime_installer.ts";
import Mirror from "../mirror/mirror.ts";
import { LegacyForgeGather } from "../gather/gather_legacyforge.ts";
import LegacyForgeInstaller from "../installer/legacyforge_installer.ts";
import { type MinecraftVersionJson, type MinecraftLib, type DownloadTaskItem } from '../types/index.ts'
import { JavaRuntimeResolver } from "../java/java_runtime_resolver.ts";
import NameMap from "../format/namemap.ts";

type MinecraftAssetsObject = {
    hash: string;
    size: number;
};

export interface MinecraftClientInstallerOptions {
    minecraftPath: string,
    versionIsolation: boolean,
    name: string,
    version: string,
    modLoader?: Partial<Record<"forge" | "fabric" | "neoforge" | "quilt" | 'fabricapi', string>> | null,
    java?: string,
    mirrorFirst?: boolean
}

export interface InstallEvents {
    "progress": (progress: Record<string, number>) => void;
    "speed": (speed: Record<string, number>) => void;
}

export default class MinecraftClientInstaller extends EventEmitter {

    on<K extends keyof InstallEvents>(
        event: K,
        listener: InstallEvents[K]
    ): this {
        return super.on(event, listener);
    }

    once<K extends keyof InstallEvents>(
        event: K,
        listener: InstallEvents[K]
    ): this {
        return super.once(event, listener);
    }

    emit<K extends keyof InstallEvents>(
        event: K,
        ...args: Parameters<InstallEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

    public OSINFO = getSystemInfo()

    public minecraftPath: string;
    public versionPath: string;
    public name?: string;
    public version: string;
    public modLoader?: Partial<Record<"forge" | "fabric" | "neoforge" | "quilt" | 'fabricapi', string>> | null = null
    public assetsPath: string;
    public assetsObjectsPath: string;
    public assetsIndexesPath: string;
    public libPath: string;
    public versionJsonPath: string;
    public nativesPath: string;
    public progress: Record<string, number> = {}
    public speed: Record<string, number> = {}
    public side: "client" = 'client'
    public javaExecutablePath?: string
    public mirrorFirst: boolean = false
    public statusEmitInterval: NodeJS.Timeout | null = null


    constructor(options: MinecraftClientInstallerOptions) {
        super();
        this.minecraftPath = options.minecraftPath;
        this.versionPath = options.versionIsolation ? existify(options.minecraftPath, 'versions', options.name) : options.minecraftPath;
        this.name = options.name;
        this.version = options.version;

        this.assetsPath = existify(options.minecraftPath, "assets");
        this.assetsObjectsPath = existify(options.minecraftPath, "assets", "objects");
        this.assetsIndexesPath = existify(options.minecraftPath, "assets", "indexes");

        this.libPath = existify(options.minecraftPath, "libraries");

        this.nativesPath = existify(this.versionPath, `${options.name}-natives`);
        this.versionJsonPath = path.join(this.versionPath, `${options.name}.json`);

        this.modLoader = options.modLoader;
        this.javaExecutablePath = options.java
        this.mirrorFirst = options.mirrorFirst || false
    }

    public async install() {
        //1.获取版本json
        let versionJson: MinecraftVersionJson = await this.getVersionJson(
            this.version
        );
        //2.版本JSON写入文件

        //3.读取assets版本和索引url
        const assetsId = versionJson.assetIndex.id;
        const assetsIndexURL = versionJson.assetIndex.url;
        //4.获取assetsJSON
        const assetsJson = await this.getAssetsJson(assetsIndexURL);
        //5.写入assetsJson
        const assetsJsonPath = path.join(
            this.assetsIndexesPath,
            `${assetsId}.json`
        );
        fs.writeFileSync(
            assetsJsonPath,
            JSON.stringify(assetsJson, null, 4),
            "utf-8"
        );

        //生成进度表
        this.progress.vanlliaLibs = 0
        this.progress.vanlliaAssets = 0
        this.progress.modLoaderLibs = 0
        if (this.modLoader && Object.keys(this.modLoader || {}).length) {
            for (const key of Object.keys(this.modLoader)) {
                this.progress[`modloader:${key}:install`] = 0
                if (key === 'forge' || key === 'neoforge') {
                    this.progress[`modloader:${key}:getInstaller`] = 0
                }
            }
        }

        this.startStatusEmitInterval()

        //主Promise
        const installPromises: Promise<any>[] = []

        //先开始下载静态资源
        const vanlliaAssetsDownloader = this.createVanlliaAssetsDownloader(assetsJson)
        installPromises.push(vanlliaAssetsDownloader.download())

        //创建支持库的下载器
        const vanlliaLibsDownloader: ConcDownloader = this.createVanlliaLibsDownloader(versionJson)
        const modLoaderLibsDownloader: Promise<ConcDownloader> = this.createModLoaderLibsDownload(versionJson)

        //检查Java
        const javaExecutablePathAvailable = await this.resolveJavaRuntime(versionJson)
        if (!javaExecutablePathAvailable) {
            throw new Error("没有可用的JAVA")
        }
        this.javaExecutablePath = javaExecutablePathAvailable

        //下载和安装Promise
        const mainDownloadAndInstallPromise = new Promise((resolve) => {
            //下载 和 等一会马上来的下载 等
            Promise.all([vanlliaLibsDownloader.download(),
            new Promise((resolve) => {
                modLoaderLibsDownloader.then(downloader => {
                    downloader.download().then(resolve)
                })
            })
            ]).then(() => {
                this.installModLoaders().then(versionFragments => {
                    //分块组合版本JSON
                    for (const frag of versionFragments) {
                        versionJson = this.combineVersionJson(versionJson, frag)
                    }

                    //写入元数据
                    versionJson.id = this.name
                    versionJson.modLoader = this.modLoader
                    versionJson.clientVersion = this.version

                    if (versionJson.inheritsFrom) {
                        delete versionJson.inheritsFrom
                    }

                    //写入版本JSON文件
                    fs.writeFileSync(
                        this.versionJsonPath,
                        JSON.stringify(versionJson, null, 4),
                        "utf-8"
                    );

                    if (this.modLoader) {
                        existify(this.versionPath, 'mods')
                    }

                    resolve('')
                })
            })
        })

        installPromises.push(mainDownloadAndInstallPromise)
        //等待完成
        await Promise.all(installPromises)
        //完成
        this.endStatusEmitInterval()
        for (let key of Object.keys(this.progress)) {
            this.progress[key] = 1
        }
        this.emit('progress', this.progress)
        this.removeAllListeners()

        const MMLDataJson = {
            playTime: 0,
            latestRun: 0,
            modLoader: this.modLoader,
            version: this.version,
            name: this.name,
            installTime: Date.now()
        }

        const versionMMLDir = existify(this.versionPath, 'MML')
        const versionMMLJsonPath = path.join(versionMMLDir, 'data.json')

        fs.writeFileSync(versionMMLJsonPath, JSON.stringify(MMLDataJson, null, 4), 'utf-8')
    }

    protected createModLoaderLibsDownload(versionJson: MinecraftVersionJson): Promise<ConcDownloader> {
        return new Promise((resolve) => {

            const modLoaderInstallerUnpackTasks: Promise<any>[] = []

            if (this.modLoader?.forge) {
                const getForgeInstaller = new GetForgeInstaller({
                    versionPath: this.versionPath,
                    version: this.version,
                    forgeVersion: this.modLoader.forge
                })

                getForgeInstaller.on('progress', (p:number) => {
                    this.progress["modloader:forge:getInstaller"] = p
                })

                getForgeInstaller.on('speed', (speed:number) => {
                    this.speed['forgeinstaller'] = speed
                })

                modLoaderInstallerUnpackTasks.push(getForgeInstaller.getInstaller())
            }
            else if (this.modLoader?.neoforge) {
                const getNeoforgeInstaller = new GetNeoForgeInstaller({
                    versionPath: this.versionPath,
                    version: this.version,
                    neoforgeVersion: this.modLoader.neoforge
                })

                getNeoforgeInstaller.on('progress', (p:number) => {
                    this.progress["modloader:neoforge:getInstaller"] = p
                })

                getNeoforgeInstaller.on('speed', (speed:number) => {
                    this.speed['neoforgeinstaller'] = speed
                })

                modLoaderInstallerUnpackTasks.push(getNeoforgeInstaller.getInstaller())
            }

            const modLoaderGatherPromises: Promise<DownloadTaskItem[]>[] = []

            Promise.all(modLoaderInstallerUnpackTasks).then(() => {
                //收集
                for (let key of Object.keys(this.modLoader || {})) {

                    if (key === 'forge' && this.modLoader?.forge) {
                        const forgeInstallerJar: string = path.join(this.versionPath, '.forge', 'installer.jar')
                        const isLegacyForge: boolean = isLegacyForgeInstaller(forgeInstallerJar, this.version, this.modLoader?.forge)

                        if (isLegacyForge) {
                            const legacyForgeGather = new LegacyForgeGather({
                                forgeWorkDir: path.join(this.versionPath, '.forge'),
                                libPath: this.libPath,
                                side: this.side,
                            })

                            modLoaderGatherPromises.push(legacyForgeGather.gather())

                        }
                        else {
                            const forgeGather = new ForgeGather({
                                forgeWorkDir: path.join(this.versionPath, '.forge'),
                                libPath: this.libPath,
                                version: this.version,
                                side: this.side,
                                mojmapsURL: versionJson.downloads[`${this.side}_mappings`].url,
                                mojmapsSha1: versionJson.downloads[`${this.side}_mappings`].sha1,
                            })
                            modLoaderGatherPromises.push(forgeGather.gather())

                        }
                    }
                    else if (key === 'neoforge' && this.modLoader?.neoforge) {
                        const neoforgeGather = new NeoNeoForgeGather({
                            neoforgeWorkDir: path.join(this.versionPath, '.neoforge'),
                            libPath: this.libPath,
                            side: this.side,
                            mojmapsURL: versionJson.downloads[`${this.side}_mappings`].url,
                            mojmapsSha1: versionJson.downloads[`${this.side}_mappings`].sha1,
                            version: this.version,
                        })

                        modLoaderGatherPromises.push(neoforgeGather.gather())
                    }
                    else if (key === "fabric" && this.modLoader?.fabric) {
                        const fabricGather = new FabricGather({
                            fabricVersion: this.modLoader.fabric,
                            fabricAPIVersion: this.modLoader.fabricapi || undefined,
                            libPath: this.libPath,
                            modsDir: existify(this.versionPath, 'mods'),
                            side: this.side,
                            version: this.version
                        })
                        modLoaderGatherPromises.push(fabricGather.gather())
                    }
                    else if (key === 'quilt' && this.modLoader?.quilt) {
                        const quiltGather = new QuiltGather({
                            libPath: this.libPath,
                            quiltVersion: this.modLoader.quilt,
                            version: this.version
                        })
                        modLoaderGatherPromises.push(quiltGather.gather())
                    }
                }

                Promise.all(modLoaderGatherPromises).then(taskArray => {
                    const flatTasks = taskArray.flat()

                    const modLoaderLibsDownloader = new ConcDownloader(50)

                    modLoaderLibsDownloader.on('progress', (p: number) => {
                        this.progress.modLoaderLibs = p
                    })

                    modLoaderLibsDownloader.on('speed', (speed) => {
                        this.speed['modloaderlib'] = speed
                    })

                    for (const f of flatTasks) {
                        modLoaderLibsDownloader.add(new DownloadTask(Mirror.getMirrors(f.url, this.mirrorFirst), f.path, f.sha1, false))
                    }
                    resolve(modLoaderLibsDownloader)
                })
            })

        })
    }

    protected createVanlliaLibsDownloader(versionJson: any): ConcDownloader {

        const vanlliaLibsTasks: DownloadTaskItem[] = []

        const requiredLibs: MinecraftLib[] = versionJson.libraries.filter((lib: any) => { return checkOSRules(lib?.rules) });

        for (const lib of requiredLibs) {
            //support libs
            if (lib.downloads?.artifact) {
                vanlliaLibsTasks.push({
                    url: lib.downloads?.artifact?.url,
                    path: path.join(this.libPath, mavenToPath(lib.name)),
                    sha1: lib.downloads?.artifact?.sha1 || undefined,
                });
            }
            //lwjgl natives
            if (lib.downloads?.classifiers) {
                for (let natives of Object.values(lib.downloads.classifiers)) {
                    vanlliaLibsTasks.push({
                        path: path.join(this.libPath, natives.path),
                        url: natives.url,
                        sha1: natives.sha1,
                    });
                }
            }
        }

        if (versionJson.downloads[this.side]) {
            const jar = versionJson.downloads[this.side];
            vanlliaLibsTasks.push({
                url: jar?.url as string,
                sha1: jar?.sha1,
                path: path.join(this.versionPath, `${this.name}.jar`),
            })
        }

        const vanlliaLibsDownloader = new ConcDownloader(50)

        vanlliaLibsDownloader.on("progress", (p) => {
            this.progress.vanlliaLibs = p;
        });

        vanlliaLibsDownloader.on('speed', (speed) => {
            this.speed['libs'] = speed
        })

        for (const task of vanlliaLibsTasks) {
            vanlliaLibsDownloader.add(new DownloadTask(Mirror.getMirrors(task.url, this.mirrorFirst), task.path, task.sha1, false))
        }
        return vanlliaLibsDownloader
    }

    protected createVanlliaAssetsDownloader(assetsJson: any): ConcDownloader {

        const vanlliaAssetsTasks: DownloadTaskItem[] = []

        const assetsJsonObjects: { [key: string]: MinecraftAssetsObject } =
            assetsJson.objects || {};
        for (const [key, value] of Object.entries(assetsJsonObjects)) {
            const hash = value.hash;
            vanlliaAssetsTasks.push({
                url: `https://resources.download.minecraft.net/${hash.slice(
                    0,
                    2
                )}/${hash}`,
                path: path.join(this.assetsObjectsPath, hash.slice(0, 2), hash),
                sha1: hash,
            });
        }

        const vanlliaAssetsDownloader = new ConcDownloader(100)

        vanlliaAssetsDownloader.on("progress", (p) => {
            this.progress.vanlliaAssets = p;
        });

        vanlliaAssetsDownloader.on('speed', (speed) => {
            this.speed['assets'] = speed
        })

        for (const task of vanlliaAssetsTasks) {
            vanlliaAssetsDownloader.add(new DownloadTask(Mirror.getMirrors(task.url, this.mirrorFirst), task.path, task.sha1, false))
        }

        return vanlliaAssetsDownloader
    }

    protected async installModLoaders() {
        const modLoaderInstallers: any[] = []
        for (const loader of Object.keys(this.modLoader || {})) {
            if (loader === 'forge' && this.modLoader?.forge) {
                const forgeInstallerJar: string = path.join(this.versionPath, '.forge', 'installer.jar')
                const isLegacyForge: boolean = isLegacyForgeInstaller(forgeInstallerJar, this.version, this.modLoader?.forge)

                if (isLegacyForge) {
                    const legacyForgeInstaller = new LegacyForgeInstaller({
                        libPath: this.libPath,
                        forgeWorkDir: path.join(this.versionPath, '.forge'),
                        side: this.side
                    }).on('progress', (p) => {
                        this.progress["modloader:forge:install"] = p
                    })

                    modLoaderInstallers.push(legacyForgeInstaller)
                }
                else {
                    const forgeInstaller = new ForgeInstaller({
                        forgeWorkDir: path.join(this.versionPath, '.forge'),
                        minecraftJarPath: path.join(this.versionPath, `${this.name}.jar`),
                        libPath: this.libPath,
                        java: this.javaExecutablePath as string,
                        side: this.side
                    })

                    forgeInstaller.on('progress', (p) => {
                        this.progress["modloader:forge:install"] = p
                    })
                    modLoaderInstallers.push(forgeInstaller)

                }
            }
            else if (loader === 'fabric' && this.modLoader?.fabric) {
                const fabricInstaller = new FabricInstaller({
                    fabricVersion: this.modLoader.fabric,
                    version: this.version,
                    libPath: this.libPath,
                    side: this.side
                })
                modLoaderInstallers.push(fabricInstaller)
            }
            else if (loader === 'neoforge') {
                const neoforgeInstaller = new NeoForgeInstaller({
                    neoforgeWorkDir: path.join(this.versionPath, '.neoforge'),
                    minecraftJarPath: path.join(this.versionPath, `${this.name}.jar`),
                    libPath: this.libPath,
                    java: this.javaExecutablePath as string,
                    side: this.side
                })

                neoforgeInstaller.on('progress', (p) => {
                    this.progress["modloader:neoforge:install"] = p
                })
                modLoaderInstallers.push(neoforgeInstaller)

            }
            else if (loader === 'quilt' && this.modLoader?.quilt) {
                const quiltInstaller = new QuiltInstaller({
                    quiltVersion: this.modLoader.quilt,
                    version: this.version,
                    libPath: this.libPath
                })
                modLoaderInstallers.push(quiltInstaller)
            }
        }

        //拼合
        const versionJsonFragments = []
        for (const installer of modLoaderInstallers) {
            const versionJsonFragment = await installer.install()
            versionJsonFragments.push(versionJsonFragment)
        }

        return versionJsonFragments
    }

    protected async getAssetsJson(url: string) {
        const assets = await axios.get(url, {
            responseType: "json",
        });
        return assets.data;
    }

    protected async getVersionJson(
        version: string
    ): Promise<MinecraftVersionJson> {
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

    protected combineVersionJson(baseJson: any, extraJson: any) {

        const result = { ...baseJson };
        for (const [key, extraValue] of Object.entries(extraJson)) {
            if (extraValue === undefined || extraValue === null) {
                continue;
            }
            const baseValue = result[key];
            if (Array.isArray(extraValue)) {
                if (Array.isArray(baseValue)) {
                    result[key] = [...baseValue, ...extraValue];
                } else {
                    result[key] = baseValue !== undefined ? [baseValue, ...extraValue] : [...extraValue];
                }
            } else if (typeof extraValue === 'object' && extraValue !== null && !Array.isArray(extraValue)) {
                if (typeof baseValue === 'object' && baseValue !== null && !Array.isArray(baseValue)) {
                    result[key] = this.combineVersionJson(baseValue, extraValue);
                } else {
                    result[key] = { ...extraValue };
                }
            }
            else if (key === 'minecraftArguments') {
                if (typeof baseValue === 'string' && typeof extraValue === 'string') {
                    const baseArgs = this.parseArguments(baseValue);
                    const extraArgs = this.parseArguments(extraValue);
                    const combinedArgs = { ...baseArgs, ...extraArgs };
                    result[key] = this.stringifyArguments(combinedArgs);
                }
            }
            else {
                result[key] = extraValue;
            }
        }
        return result;
    }

    protected parseArguments(argsString: string) {
        const args: { [key: string]: string } = {};
        const tokens = argsString.trim().split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.startsWith("--")) {
                const nextToken = tokens[i + 1];
                if (nextToken && !nextToken.startsWith("--")) {
                    args[token] = nextToken;
                    i++;
                } else {
                    args[token] = "";
                }
            }
        }
        return args;
    }

    protected stringifyArguments(argsObj: { [key: string]: string }) {
        return Object.entries(argsObj)
            .map(([key, value]) => value ? `${key} ${value}` : key)
            .join(" ");
    }

    private async resolveJavaRuntime(versionJson: MinecraftVersionJson): Promise<string | null> {

        let requiredJavaRuntimeVersion = String(versionJson.javaVersion?.majorVersion) || '8'
        let requiredJVMVersion = requiredJavaRuntimeVersion === "8" ? '1.8.0' : requiredJavaRuntimeVersion

        const localJavaExecutablePath = path.join(this.minecraftPath, 'java', `${this.OSINFO.platform}-${this.OSINFO.arch}`, String(requiredJavaRuntimeVersion))

        let javaExecutablePath: string | null = null

        if (this.javaExecutablePath) {
            this.progress['checking-java'] = 0
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

                javaRuntimeInstaller.on('progress', (p) => { this.progress['install-java'] = p })
                javaRuntimeInstaller.on('speed', (s) => { this.speed['install-java'] = s })
                const installedJavaHome: string = await javaRuntimeInstaller.install()
                javaRuntimeInstaller.removeAllListeners()
                //检查安装完成的java是否可以用
                const isInstalledJavaExecutablePathAvailable = await JavaRuntimeResolver.isJavaValid(localJavaPath, requiredJVMVersion)
                if (isInstalledJavaExecutablePathAvailable) {
                    javaExecutablePath = localJavaPath
                }
            }
        }
        this.progress['checking-java'] = 1
        this.progress['install-java'] = 1
        this.speed['install-java'] = 0

        return javaExecutablePath
    }

    private startStatusEmitInterval() {
        this.emit('progress', this.progress)
        this.emit('speed', this.speed)
        this.statusEmitInterval = setInterval(() => {
            this.emit('progress', this.progress)
            this.emit('speed', this.speed)
        }, 100);
    }

    private endStatusEmitInterval() {
        this.emit('progress', this.progress)
        this.emit('speed', this.speed)
        if (this.statusEmitInterval) {
            clearInterval(this.statusEmitInterval)
        }
        this.statusEmitInterval = null
    }
}
