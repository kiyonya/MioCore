import EventEmitter from "events";
import path from "path"
import os from 'os'
import fs from 'fs'
import AdmZip from "adm-zip";
import { type ChildProcessWithoutNullStreams } from "child_process";
import { type LaunchOptions, type MinecraftVersionJson, type MinecraftLib, type MinecraftLibClassifiers, type MinecraftLibClassifierIndex, type MinecraftLibClassifieExtractGuide } from "../types/index.ts";
import { existify, mavenToPath } from "../utils/io.ts";
import { checkOSRules, getSystemInfo, type OSInfo } from "../utils/os.ts";
import { FileNotFoundException } from "../error.ts";
import JSONIO from "../utils/jsonIO.ts";
import GameCompletenessChecker from "../check/complete_checker.ts";
import ConcDownloader from "../downloader/downloader.ts";
import DownloadTask from "../downloader/downloadtask.ts";
import Mirror from "../mirror/mirror.ts";
import JavaRuntimeInstaller from "../installer/jrt_installer.ts";
import OptionsIO from "../game/optionsIO.ts";
import JavaVersionDetector, { type JavaVersionInfo } from "../java/java_version_detect.ts";
import { compare, validate } from "compare-versions";
import { distributionHeap } from "../memory/memory_distribution.ts";
import NameMap from "../format/namemap.ts";
import JavaExecutor from "../java/java_exec.ts";
import JDKInstaller from "../java/jdk_installer.ts";
import { randomUUID } from "crypto";


export interface LaunchEvents {
    'progress': (progress: Record<string, number>) => void;
    'speed': (speed: Record<string, number>) => void;
    'stdout': (data: string) => void;
    'stderr': (error: string) => void;
    'close': (code: number | null, signal: string | null) => void;
    'crash': (code: number | null, signal: string | null) => void;
    'failed': (error: Error) => void;
    'canceled': () => void;
}

export interface LauncherCreateOptions {
    minecraftPath: string,
    name: string,
    versionIsolation: boolean
}

export interface LaunchArguments {
    mainClass: string,
    jvmArgs: string[],
    gameArgs: string[]
}

export interface LaunchAuthOptions {
    username: string;
    accessToken: string;
    uuid: string;
}

export default abstract class LaunchBase extends EventEmitter {

    on<K extends keyof LaunchEvents>(
        event: K,
        listener: LaunchEvents[K]
    ): this {
        return super.on(event, listener);
    }

    once<K extends keyof LaunchEvents>(
        event: K,
        listener: LaunchEvents[K]
    ): this {
        return super.once(event, listener);
    }

    emit<K extends keyof LaunchEvents>(
        event: K,
        ...args: Parameters<LaunchEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

    public static DEFAULT_GAME_ARGS = [
        '--username',
        '${auth_player_name}',
        '--version',
        '${version_name}',
        '--gameDir',
        '${game_directory}',
        '--assetsDir',
        '${assets_root}',
        '--assetIndex',
        '${assets_index_name}',
        '--uuid',
        '${auth_uuid}',
        '--accessToken',
        '${auth_access_token}',
        '--userType',
        '${user_type}',
        '--versionType',
        '${version_type}'
    ]

    public static DEFAULT_JVM_ARGS = [
        "-XX:-UseAdaptiveSizePolicy",
        "-XX:-OmitStackTraceInFastThrow",
        "-Djdk.lang.Process.allowAmbiguousCommands=true",
        "-Dfml.ignoreInvalidMinecraftCertificates=True",
        "-Dfml.ignorePatchDiscrepancies=True",
        "-Dlog4j2.formatMsgNoLookups=true",
        "-Dorg.lwjgl.system.SharedLibraryExtractPath=${natives_directory}",
        "-Djava.library.path=${natives_directory}"
    ]

    public OSINFO: OSInfo = getSystemInfo()

    public progress: Record<string, number> = {}
    public speed: Record<string, number> = {}
    public minecraftPath: string
    public versionPath: string
    public versionJson: MinecraftVersionJson
    public versionIsolation: boolean
    public libPath: string
    public assetsPath: string
    public assetsIndexesPath: string
    public assetsObjectsPath: string
    public nativesPath: string
    public minecraftJarPath: string
    public versionJsonPath: string
    public launchOptions: LaunchOptions
    public name: string
    public gameProcess: ChildProcessWithoutNullStreams | null = null
    public launchStatusEmitInterval: NodeJS.Timeout | null = null
    public separator: string = this.OSINFO.platform === 'win32' ? ";" : ":"
    public canceled: boolean = false
    public activeJavaRuntimeInstaller: JavaRuntimeInstaller | JDKInstaller | null = null
    public activeCompleteDownloader: ConcDownloader | null = null

    public javaInfo: JavaVersionInfo | null = null
    public javaExecutablePath: string = ''

    private vmMemDistribution: { xmx?: number, xms?: number } = {
        xmx: undefined,
        xms: undefined,
    }

    constructor(createOptions: LauncherCreateOptions, launchOptions: LaunchOptions) {
        super()

        console.log("系统信息", this.OSINFO)

        this.launchOptions = launchOptions
        this.name = createOptions.name
        this.minecraftPath = createOptions.minecraftPath
        this.versionIsolation = createOptions.versionIsolation
        this.versionPath = createOptions.versionIsolation ? path.join(this.minecraftPath, 'versions', `${this.name}`) : this.minecraftPath

        this.libPath = path.join(this.minecraftPath, 'libraries')
        this.assetsPath = path.join(this.minecraftPath, 'assets')
        this.assetsIndexesPath = path.join(this.assetsPath, 'indexes')
        this.assetsObjectsPath = path.join(this.assetsPath, 'objects')
        this.nativesPath = launchOptions.lwjglNativesDirectory || existify(this.versionPath, `${this.name}-natives-${this.OSINFO.platform}`)
        this.minecraftJarPath = path.join(this.versionPath, `${this.name}.jar`)
        this.versionJsonPath = path.join(this.versionPath, `${this.name}.json`)
        if (!fs.existsSync(this.versionJsonPath)) {
            throw new Error("找不到versionJSON")
        }
        this.versionJson = JSON.parse(fs.readFileSync(this.versionJsonPath, 'utf-8'))
        this.gameProcess = null
    }

    public async checkAndFixGame() {
        //新增进度键
        this.progress['checking'] = 0
        const gameChecker = new GameCompletenessChecker({
            minecraftPath: this.minecraftPath,
            versionIsolation: this.versionIsolation,
            name: this.name
        })
        gameChecker.on('progress', progress => this.progress['checking'] = progress)
        const result = await gameChecker.check()
        this.progress['checking'] = 1
        gameChecker.removeAllListeners()

        if (result.irreparable.length) {
            console.error("有无法修复的错误", result.irreparable)
            throw new Error('无法修复的问题')
        }

        //如果已经取消 则不进行修复
        else if (result.repairable.length && !this.canceled) {
            console.log(result)
            //新增进度键
            this.progress['repair'] = 0
            this.speed['repair'] = 0
            const downloader = new ConcDownloader(30)
            this.activeCompleteDownloader = downloader
            for (const missing of result.repairable) {
                if (!missing.url) {
                    throw new Error('无法修复的问题')
                }
                downloader.add(new DownloadTask(Mirror.getMirrors(missing.url, true), path.normalize(missing.path), missing.sha1))
            }
            downloader.on('progress', p => this.progress['repair'] = p)
            downloader.on('speed', s => this.speed['repair'] = s)
            await downloader.download()
            this.activeCompleteDownloader = null
            downloader.removeAllListeners()
        }
        this.progress['repair'] = 1
        this.speed['repair'] = 0
        return result
    }

    public buildLaunchCommand(authOptions?: LaunchAuthOptions): LaunchArguments {
        if (!authOptions) {
            console.warn("没有玩家认证信息，将生成测试玩家")
            authOptions = this.createTestAuthetication()
        }
        try {
            if (!fs.existsSync(this.versionJsonPath)) {
                throw new FileNotFoundException('缺失版本JSON文件', this.versionJsonPath)
            }
            let requiredLibs = this.versionJson.libraries?.filter(i => i.name && checkOSRules(i.rules)).filter(lib => {
                if (!lib.clientreq || lib.clientreq === true) { return true }
                return false
            })
            const depRequiredLibs: MinecraftLib[] = []
            //根据name去重
            const libMaps: Map<string, { version: string, lib: MinecraftLib }> = new Map()
            for (const lib of requiredLibs) {
                const name = lib.name
                const version = name.split(':').pop() as string
                const libName = lib.name.split(":")[1] as string
                if (name.includes('lwjgl')) {
                    depRequiredLibs.push(lib)
                    continue
                }
                console.log("处理库", name, version)
                if (!validate(version)) {
                    console.warn(`跳过不合法版本号的库 ${name}`)
                    depRequiredLibs.push(lib)
                    continue
                }

                //按照版本号比较 取得最高版本
                if (libMaps.has(libName)) {
                    //比较版本
                    const settledLibData = libMaps.get(libName)
                    const settledVersion = settledLibData?.version
                    if (settledVersion) {
                        if (compare(settledVersion, version, '>=')) {
                            continue
                        }
                        else {
                            //更新
                            libMaps.set(libName, {
                                version: version,
                                lib: lib
                            })
                        }
                    }
                    else {
                        continue
                    }
                }
                else {
                    libMaps.set(libName, {
                        version: version,
                        lib: lib
                    })
                }
            }

            depRequiredLibs.push(...Array.from(libMaps.values()).map(i => i.lib))
            let classPath: string[] = []
            for (const lib of depRequiredLibs) {
                if (lib.downloads?.classifiers && !this.launchOptions.lwjglNativesDirectory) {
                    const nativeJar: string = this.extractNativeFile(lib.downloads?.classifiers, lib.natives as MinecraftLibClassifierIndex, lib.extract as MinecraftLibClassifieExtractGuide)
                    // classPath.push(nativeJar)
                }
                else {
                    lib.name && classPath.push(path.join(this.libPath, mavenToPath(lib.name)))
                }
            }
            classPath.push(this.minecraftJarPath)

            for (const classJar of classPath) {
                if (!fs.existsSync(classJar)) { throw new Error(`EOENT ${classJar}`) }
            }

            classPath = [...new Set(classPath)]

            const vmArguments = this._buildVMArguments()
            const gameArguments = this._buildGameArguments()

            const argumentMap: Map<string, string> = new Map()
            argumentMap.set('natives_directory', this.nativesPath)
            argumentMap.set('launcher_name', this.launchOptions.launcherName ?? 'MML')
            argumentMap.set('launcher_version', this.launchOptions.launcherVersion ?? '1.0.0')
            argumentMap.set('classpath', classPath.join(this.separator))
            argumentMap.set('library_directory', this.libPath)
            argumentMap.set('classpath_separator', this.separator)
            argumentMap.set('auth_player_name', authOptions.username)
            argumentMap.set('version_name', this.name)
            argumentMap.set('game_directory', this.versionPath)
            argumentMap.set('assets_index_name', String(this.versionJson.assets))
            argumentMap.set('assets_root', this.assetsPath)
            argumentMap.set('game_assets', this.assetsPath)
            argumentMap.set('auth_uuid', authOptions.uuid)
            argumentMap.set('auth_access_token', authOptions.accessToken)
            argumentMap.set('client_id', authOptions.uuid)
            argumentMap.set('clientid', authOptions.uuid)
            argumentMap.set('user_type', this.launchOptions.userType ?? 'msa')
            argumentMap.set('version_type', this.launchOptions.versionType ?? 'MML')
            argumentMap.set('user_properties', this.launchOptions.userProperties ? JSON.stringify(this.launchOptions.userProperties) : "{}")
            argumentMap.set('vmxmx', String(this.vmMemDistribution.xmx || 2048))
            argumentMap.set('vmxms', String(this.vmMemDistribution.xms || 2000))
            argumentMap.set('auth_xuid', authOptions.uuid)
            if (!vmArguments.includes('-cp')) {
                vmArguments.push('-cp')
                vmArguments.push('${classpath}')
            }
            const processedJvmArgs: string[] = []
            for (let i = 0; i < vmArguments.length; i++) {
                let value: string = vmArguments[i]
                if (value === '-p') {
                    processedJvmArgs.push('-p')
                    let param = vmArguments[i + 1]
                    const paramSplitedArray = param.split('${classpath_separator}')
                    let modulePathes: string[] = []
                    for (let modulePath of paramSplitedArray) {
                        modulePath = modulePath.replace('${library_directory}', '')
                        modulePath = path.join(this.libPath, modulePath)
                        modulePathes.push(modulePath)
                    }
                    processedJvmArgs.push(modulePathes.join(argumentMap.get('classpath_separator')))
                    i++
                } else {
                    const replacement = this.replaceTemplate(value, argumentMap)
                    processedJvmArgs.push(replacement)
                }
            }
            processedJvmArgs.forEach(jvm => (jvm.includes('=') && jvm.startsWith('-')) && jvm.replaceAll(' ', ''))
            const processedGameArgs: string[] = []
            for (let arg of gameArguments) {
                if (typeof arg !== 'string') {
                    continue
                }
                processedGameArgs.push(this.replaceTemplate(arg, argumentMap))
            }
            const mainClass = this.versionJson.mainClass
            console.log(processedJvmArgs)
            return { mainClass, jvmArgs: processedJvmArgs, gameArgs: processedGameArgs }
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    private _buildVMArguments(): Array<string> {
        const buildJvmArguments: string[] = []
        const versionJvmArguments: string[] = this.versionJson.arguments?.jvm.filter(i => typeof i === 'string') || []
        if (this.OSINFO.platform === 'darwin') {
            versionJvmArguments.push("-XstartOnFirstThread")
        }
        buildJvmArguments.push(...versionJvmArguments)
        // 默认参数
        if (this.launchOptions.useDefaultJvmArguments ?? true) {
            buildJvmArguments.push(...LaunchBase.DEFAULT_JVM_ARGS)
        }
        // 自定义参数
        if (this.launchOptions?.customJvmArguments && this.launchOptions.customJvmArguments.length) {
            for (const arg of this.launchOptions.customJvmArguments) {
                const trimmedArg = arg.trim()
                if (trimmedArg) {
                    buildJvmArguments.push(trimmedArg)
                }
            }
        }
        //是否已经设置了GC
        let isGCSet: boolean = false
        for (const arg of buildJvmArguments) {
            if (/^(-XX:\+?)Use.*(GC)$/.test(arg)) {
                isGCSet = true
                break
            }
        }
        if (!isGCSet) {
            // 当前没有GC设置的时候
            if (this.launchOptions.jvmGC) {
                buildJvmArguments.push(`-XX:+Use${this.launchOptions.jvmGC}`)
            } else {
                buildJvmArguments.push('-XX:+UseG1GC')
            }
        }
        else {
            console.log("参数已经存在GC,默认GC与预设的GC将会被跳过")
        }
        // 设置内存分配 - 默认参数没有，如果自定义参数已经设置了，这里应该会被检测到
        let isXmxSet: boolean = false
        let isXmsSet: boolean = false
        let isXssSet: boolean = false

        for (const arg of buildJvmArguments) {
            if (arg.startsWith('-Xmx')) { isXmxSet = true }
            else if (arg.startsWith('-Xms')) { isXmsSet = true }
            else if (arg.startsWith('-Xss')) { isXssSet = true }
        }

        if (!isXmxSet) { buildJvmArguments.push("-Xmx${vmxmx}M") }
        if (!isXmsSet) { buildJvmArguments.push("-Xms${vmxms}M") }
        if (!isXssSet && this.OSINFO.arch === 'ia32') { buildJvmArguments.push('-Xss1M') }

        return buildJvmArguments
    }

    private _buildGameArguments(): Array<string> {
        const gameArguments: string[] = []

        if (this.versionJson.arguments?.game && Array.isArray(this.versionJson.arguments.game)) {
            gameArguments.push(...this.versionJson.arguments.game)
        }
        else if (this.versionJson.minecraftArguments) {
            gameArguments.push(...this.versionJson.minecraftArguments.split(' ').map(i => i.trim()))
        }
        else {
            gameArguments.push(...LaunchBase.DEFAULT_GAME_ARGS)
        }
        if (this.launchOptions.windowWidth) {
            gameArguments.push('--width', String(this.launchOptions.windowWidth))
        }
        if (this.launchOptions.windowHeight) {
            gameArguments.push('--height', String(this.launchOptions.windowHeight))
        }
        if (this.launchOptions.demo) {
            gameArguments.push('--demo')
        }
        if (this.launchOptions.entryServer) {
            gameArguments.push('--quickPlayMultiplayer', this.launchOptions.entryServer)
        }

        if (this.launchOptions.customGameArguments) {
            for (const [key, value] of Object.entries(this.launchOptions.customGameArguments)) {
                if (!gameArguments.includes(key)) {
                    gameArguments.push(key)
                    value && gameArguments.push(value)
                }
            }
        }

        return gameArguments

    }

    public async resolveJavaRuntime(): Promise<string | null> {

        let requiredJavaRuntimeVersion: string = String(this.versionJson.javaVersion?.majorVersion) || '8'
        let requiredJVMVersion = requiredJavaRuntimeVersion === "8" ? '1.8.0' : requiredJavaRuntimeVersion

        const localJavaExecutablePath = path.join(this.minecraftPath, 'java', `${this.OSINFO.platform}-${this.OSINFO.arch}`, String(requiredJavaRuntimeVersion))

        let javaExecutablePath: string | null = null

        if (this.launchOptions.jvmVersionCheck !== false) {
            this.progress['checking-java'] = 0
            if (this.launchOptions.java) {
                const isUserSelectedJavaAvailable = await JavaExecutor.isJavaValid(this.launchOptions.java, requiredJVMVersion, this.OSINFO.platform, this.OSINFO.arch)
                if (isUserSelectedJavaAvailable) {
                    javaExecutablePath = this.launchOptions.java
                }
            }
        }
        else {
            javaExecutablePath = this.launchOptions.java || null
        }

        if (!javaExecutablePath) {
            //查找或者安装java了
            let localJavaPath: string = ''
            switch (this.OSINFO.platform) {
                case 'win32':
                    localJavaPath = path.join(localJavaExecutablePath, 'bin', 'java.exe')
                    break;
                case 'linux':
                    localJavaPath = path.join(localJavaExecutablePath, 'bin', 'java')
                    break;
                case 'darwin':
                    localJavaPath = path.join(localJavaExecutablePath, 'Contents', 'Home', 'bin', 'java')
                    break;
                default:
                    throw new Error(`不支持的操作系统平台: ${this.OSINFO.platform}`);
            }

            let isLocalJavaAvailable = false

            if (this.launchOptions.jvmVersionCheck !== false) {
                isLocalJavaAvailable = await JavaExecutor.isJavaValid(localJavaPath, requiredJVMVersion, this.OSINFO.platform, this.OSINFO.arch)
            }
            else if (fs.existsSync(localJavaPath)) {
                //保持存在
                isLocalJavaAvailable = true
            }

            if (isLocalJavaAvailable) {
                //本地可用就用本地的了
                javaExecutablePath = localJavaPath
            }
            else {
                //在本地安装java
                if (this.launchOptions.useMojangJavaRuntime) {
                    const runtimeVersion = this.versionJson.javaVersion?.component || 'jre-legacy'
                    const javaRuntimeInstaller = new JavaRuntimeInstaller(runtimeVersion, localJavaExecutablePath, NameMap.getMojangJavaOSIndex(this.OSINFO.platform, this.OSINFO.arch))
                    this.activeJavaRuntimeInstaller = javaRuntimeInstaller
                    javaRuntimeInstaller.on('progress', (p) => { this.progress['install-java'] = p })
                    javaRuntimeInstaller.on('speed', (s) => { this.speed['install-java'] = s })
                    await javaRuntimeInstaller.install()
                    javaRuntimeInstaller.removeAllListeners()
                }
                else {
                    const jdkInstaller = new JDKInstaller(localJavaExecutablePath, requiredJavaRuntimeVersion, this.OSINFO.platform, this.OSINFO.arch)
                    this.activeJavaRuntimeInstaller = jdkInstaller
                    jdkInstaller.on('progress', (p) => { this.progress['install-java'] = p })
                    jdkInstaller.on('speed', (s) => { this.speed['install-java'] = s })
                    await jdkInstaller.install()
                    jdkInstaller.removeAllListeners()
                }

                //检查安装完成的java是否可以用
                if (this.launchOptions.jvmVersionCheck !== false) {
                    const isInstalledJavaExecutablePathAvailable = await JavaExecutor.isJavaValid(localJavaPath, requiredJVMVersion, this.OSINFO.platform, this.OSINFO.arch)
                    if (isInstalledJavaExecutablePathAvailable) {
                        javaExecutablePath = localJavaPath
                    }
                    else {
                        throw new Error("安装的java不可用")
                    }
                }
                else {
                    javaExecutablePath = localJavaPath
                }
            }
        }
        this.progress['checking-java'] = 1
        this.progress['install-java'] = 1
        this.speed['install-java'] = 0

        return javaExecutablePath
    }

    public async createGameProcess(javaExecutablePath: string, jvmArgs: string[], mainClass: string, gameArgs: string[]): Promise<number> {
        this.checkCancelSignal();

        return new Promise((resolve, reject) => {
            const fullArgs = [...jvmArgs, mainClass, ...gameArgs];

            try {

                this.gameProcess = JavaExecutor.spawnProcess(javaExecutablePath, fullArgs, {
                    cwd: this.versionPath,
                    detached: true,
                    stdio: 'overlapped',
                    windowsHide: false
                })
                this.gameProcess.unref()

            } catch (error) {
                return reject(new Error(`进程创建失败: ${error}`));
            }

            this.gameProcess.once('error', (error) => {
                reject(new Error(`进程运行错误: ${error.message}`));
            });

            this.gameProcess.once('spawn', () => {
                if (!this.gameProcess?.pid) {
                    return reject(new Error('进程已启动但无法获取 PID'));
                }
                //进程优先级设置
                if (this.launchOptions.processPriority) {
                    os.setPriority(this.gameProcess.pid, this.launchOptions.processPriority)
                }


                console.log(`游戏进程已启动，PID: ${this.gameProcess.pid}`);
                this.addProcessListener();
                resolve(this.gameProcess.pid);
            });
        });
    }

    public async whenReady(): Promise<void> {
        await this.checkAndFixGame()
        const javaExecutablePath: string | null = await this.resolveJavaRuntime()
        if (!javaExecutablePath) {
            throw new Error("没有可用的java执行目录")
        }
        this.javaInfo = await JavaVersionDetector.getJavaInfo(javaExecutablePath, this.OSINFO.platform)
        console.log("已使用java", javaExecutablePath)
        this.gameMemoryDistribution()
        this.javaExecutablePath = javaExecutablePath
        this.createLaunchDetailLog()
    }

    private gameMemoryDistribution() {
        //最大内存分配
        let XMX: number
        if (this.launchOptions.vmxmx === 'auto' || !this.launchOptions.vmxmx) {
            let modCount = 0
            if (fs.existsSync(path.join(this.versionPath, 'mods'))) {
                modCount = fs.readdirSync(path.join(this.versionPath, 'mods')).filter(i => path.extname(i) === '.jar').length
            }
            const freeMemoryMB = (os.freemem() / 1024 / 1024)
            let distributeMemoryMB = distributionHeap(freeMemoryMB, modCount, Math.min(os.totalmem() / 1024 / 1024 / 4, 2048))
            //32位java无法分配2G以上的内存
            if (!this.javaInfo?.is64bit) {
                distributeMemoryMB = Math.min(distributeMemoryMB, 2048)
            }
            this.vmMemDistribution.xmx = distributeMemoryMB
            XMX = distributeMemoryMB
        }
        else {
            this.vmMemDistribution.xmx = this.launchOptions.vmxmx
            XMX = this.launchOptions.vmxmx
        }
        //初始内存分配
        if (this.launchOptions.vmxms === 'auto' || !this.launchOptions.vmxms) {
            this.vmMemDistribution.xms = XMX
        }
        else {
            this.vmMemDistribution.xms = this.launchOptions.vmxms
        }
    }

    protected failedLaunch(error: Error) {
        console.error(error)
        this.emit('failed', error)
        this.destroy()
    }

    protected addProcessListener() {
        if (this.gameProcess && this.gameProcess.pid && !this.gameProcess.killed) {

            //修改游戏启动时间的记录
            const MMLDir = existify(this.versionPath, 'MML')
            const json = new JSONIO(path.join(MMLDir, 'data.json'))

            const launchedTime = Date.now()

            json.modify('latestRun', launchedTime).save()
            json.modify('latestRunUTC', new Date().toUTCString())

            const updatePlayTime = () => {
                const playTime = json.get('playTime') || 0
                const newPlayTime = Math.floor(playTime + Date.now() - launchedTime)
                json.modify('playTime', newPlayTime).save()
            }

            let playTimeDumpInterval = setInterval(updatePlayTime, 5000);

            this.gameProcess.stdout.addListener('data', (data: Buffer) => {
                this.emit('stdout', data.toString())
            })
            this.gameProcess.stderr.addListener('error', (stderr: Buffer) => {
                this.emit('stderr', stderr.toString())
            })
            this.gameProcess.addListener('close', (code, signal) => {
                updatePlayTime()
                clearInterval(playTimeDumpInterval)
                if (code !== 0) {
                    this.emit('crash', code, signal)
                }
                else {
                    this.emit('close', code, signal)
                }
                this.destroy()
            })
        }
    }

    protected removeProcessListener() {
        if (this.gameProcess && this.gameProcess.pid && !this.gameProcess.killed) {
            this.gameProcess.stdout.removeAllListeners()
            this.gameProcess.stderr.removeAllListeners()
            this.gameProcess.removeAllListeners()
        }
    }

    public destroy() {
        this.canceled = true
        if (this.gameProcess && !this.gameProcess.killed) {
            this.gameProcess.kill('SIGTERM')
        }
        if (this.launchStatusEmitInterval) {
            clearInterval(this.launchStatusEmitInterval)
        }
        this.endStatusInterval()
        this.removeProcessListener()
        this.gameProcess = null
    }

    public killGame() {
        this.destroy()
    }

    public async cancelLaunch() {
        this.canceled = true
        if (this.activeJavaRuntimeInstaller) {
            await this.activeJavaRuntimeInstaller.abort()
        }
        if (this.activeCompleteDownloader) {
            await this.activeCompleteDownloader.abort()
        }
        console.log("已取消启动行为")
        this.emit('canceled')
        this.destroy()
        return true
    }

    protected startStatusInterval(time: number = 50) {
        this.emit('progress', this.progress)
        this.emit('speed', this.speed)
        this.launchStatusEmitInterval = setInterval(() => {
            this.emit('progress', this.progress)
            this.emit('speed', this.speed)
        }, time);
    }

    protected endStatusInterval() {
        this.emit('progress', this.progress)
        this.emit('speed', this.speed)
        if (this.launchStatusEmitInterval) {
            clearInterval(this.launchStatusEmitInterval)
            this.launchStatusEmitInterval = null
        }
    }

    public injectOptionsIO() {
        const gameOptionsIO = new OptionsIO(path.join(this.versionPath, 'options.txt'))
        gameOptionsIO.createEmptyWhenNoFile()
        if (this.launchOptions.useLaunchLanguage) {
            gameOptionsIO.set('lang', this.launchOptions.useLaunchLanguage)
        }
        if (this.launchOptions.useGamaOverride) {
            gameOptionsIO.set('gamma', '10.0')
        }
        else {
            gameOptionsIO.set('gamma', '0.0')
        }
        gameOptionsIO.save()
    }

    protected replaceTemplate(str: string, variables: Map<string, string>): string {
        if (!str?.includes('${')) {
            return str
        }
        return str.replace(/\$\{(\w+)\}/g, (match, key) => {
            const value = variables.get(key);
            return value !== undefined ? value : match;
        })
    }

    protected extractNativeFile(classifiers: MinecraftLibClassifiers, classifiersIndex: MinecraftLibClassifierIndex, extract: MinecraftLibClassifieExtractGuide): string {


        let osIndexKey = NameMap.getMojangNativePlatform(this.OSINFO.platform)
        let indexclassifierKey: string | null = classifiersIndex[osIndexKey] || null

        // only when string , available to index
        if (indexclassifierKey && indexclassifierKey.includes('${arch}')) {
            const mappedArch = NameMap.getArchBit(this.OSINFO.arch)
            indexclassifierKey = indexclassifierKey.replaceAll('${arch}', mappedArch)
        }

        const isNativeAvailable = indexclassifierKey ? classifiers[indexclassifierKey] : null
        if (!isNativeAvailable) {
            console.error(`不支持的系统或者架构，在抽取native文件${classifiers}时查找${osIndexKey},取得的索引值是${indexclassifierKey},这个索引不存在或者不在给出的文件列表之中`)
            return ''
        }

        const nativeJar = path.join(this.libPath, isNativeAvailable.path)
        if (!fs.existsSync(nativeJar)) {
            throw new FileNotFoundException('找不到native文件', nativeJar)
        }
        const jar = new AdmZip(nativeJar)
        const entries = jar.getEntries()

        let toExtractEntries: AdmZip.IZipEntry[] = []

        if (extract.exclude) {
            toExtractEntries = entries.filter((entry) => {
                for (const excludePath of extract.exclude as string[]) {
                    if (entry.entryName.includes(excludePath)) {
                        return false
                    }
                    return true
                }
            })
        }
        else if (extract.include) {
            toExtractEntries = entries.filter((entry) => {
                for (const includePath of extract.include as string[]) {
                    if (entry.entryName.includes(includePath)) {
                        return true
                    }
                    return false
                }
            })
        }
        else {
            toExtractEntries = entries
        }

        for (const entry of toExtractEntries) {
            jar.extractEntryTo(entry, this.nativesPath, false, true)
        }
        return nativeJar
    }

    protected checkCancelSignal() {
        if (this.canceled) {
            console.log("已检测到取消信号，抛出")
            throw "启动终止"
        }
    }

    public createLaunchDetailLog() {
        const launchDetail = {
            platform: this.OSINFO.platform,
            arch: this.OSINFO.arch,
            "64bit": this.OSINFO.is64Bit,
            cpuCount: this.OSINFO.cpus.length,
            cpu: this.OSINFO.cpus[0].model,
            processPriority: this.launchOptions.processPriority,
            minecraft: this.minecraftPath,
            gameJar: this.minecraftJarPath,
            versionPath: this.versionPath,
            java: this.javaExecutablePath,
            javaVersion: this.javaInfo?.version,
            javaVendor: this.javaInfo?.vendor,
            "64bit-java": this.javaInfo?.is64bit,
            lwjgl: this.launchOptions.lwjglNativesDirectory,
            mem: this.vmMemDistribution
        }
        console.log(launchDetail)
        return launchDetail
    }

    private createTestAuthetication(): LaunchAuthOptions {
        /**
         * Hey,Just For Fun
         */
        const nicknames: string[] = [
            "CyberPunk_2077",
            "Neo_Matrix",
            "Zero_Cool",
            "Crypto_Ninja",
            "Quantum_Leap",
            "Binary_Beast",
            "Firewall_Guard",
            "Data_Stream",
            "Cyber_Warrior",
            "Ghost_In_Shell",
            "Dragon_Slayer",
            "Shadow_Walker",
            "Phoenix_Rising",
            "Thunder_God",
            "Moonlight_Wolf",
            "Ice_Queen_07",
            "Dark_Knight_X",
            "Storm_Bringer",
            "Fire_Demon_666",
            "Star_Gazer99",
            "One_Punch_Man",
            "Death_Note_42",
            "Cyberpunk_Edgerunner",
            "Gundam_Wing",
            "Final_Fantasy7",
            "Street_Fighter2",
            "MegaMan_X",
            "Sonic_Hedgehog",
            "Link_Hyrule",
            "Samurai_Jack",
            "Silver_Fox",
            "Red_Panda_007",
            "Black_Panther",
            "Golden_Eagle",
            "Ocean_Whisper",
            "Mountain_Lion",
            "Desert_Fox_99",
            "Arctic_Wolf",
            "Thunder_Bird",
            "Shadow_Cat",
            "Chocolate_Chip",
            "Espresso_Shot",
            "Sushi_Master",
            "Bubble_Tea_88",
            "Hot_Sauce_420",
            "Cookie_Monster",
            "Whiskey_Sour",
            "Pizza_Ninja",
            "Taco_Bandit",
            "Burger_King99",
            "Alpha_Omega",
            "Xenon_548",
            "Z3R0_C00L",
            "V1rus_Total",
            "M4ster_Mind",
            "C0D3_Br34k3r",
            "L33t_H4x0r",
            "N3rd_C0r3",
            "R0b0t_L0v3r",
            "G33k_Squad",
            "Silent_Assassin",
            "Lucky_Charm_77",
            "Crazy_Diamond",
            "Wild_Child_X",
            "Iron_Fist_99",
            "Golden_Touch",
            "Midnight_Rider",
            "Electric_Dream",
            "Cosmic_Joker",
            "Digital_Nomad",
            "Phantom_X",
            "Vortex_9",
            "Nova_Star",
            "Zen_Master",
            "Rogue_One",
            "Blaze_420",
            "Frost_Bite",
            "Viper_Strike",
            "Titan_Prime",
            "Orion_Belt",
            "Error_404",
            "Ctrl_Alt_Del",
            "Stack_Overflow",
            "Infinite_Loop",
            "Syntax_Error",
            "Null_Pointer",
            "Seg_Fault_11",
            "Cache_Miss",
            "Buffer_Overflow",
            "Race_Condition",
            "Iron_Man_3",
            "Batman_2022",
            "Stranger_Things",
            "Game_Of_Thrones",
            "Star_Wars_77",
            "Lord_Of_Rings",
            "Matrix_Reloaded",
            "Pink_Floyd_42",
            "Metallica_Fan",
            "Queen_Band_77",
            "Komeijilune",
            "Kiyonatsuki"
        ];
        const playerName = nicknames[Math.floor(Math.random() * nicknames.length)]
        return {
            accessToken: 'FFFFFFFFFF',
            username: playerName,
            uuid: randomUUID().replaceAll('-', '')
        }
    }
}