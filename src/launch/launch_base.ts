import EventEmitter from "events";
import path from "path"
import os from 'os'
import fs from 'fs'
import AdmZip from "adm-zip";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

import { type LaunchOptions, type MinecraftVersionJson, type MinecraftLib, type MinecraftLibClassifiers, type MinecraftLibClassifierIndex, type MinecraftLibClassifieExtractGuide } from "../types/index.ts";
import { existify, mavenToPath } from "../utils/io.ts";
import { checkOSRules, getSystemInfo, type OSInfo } from "../utils/os.ts";
import { FileNotFoundException } from "../error.ts";
import JSONIO from "../utils/jsonIO.ts";
import GameCompletenessChecker from "../game_opration/complete_checker.ts";
import ConcDownloader from "../downloader/downloader.ts";
import DownloadTask from "../downloader/downloadtask.ts";
import Mirror from "../mirror/mirror.ts";
import JavaRuntimeInstaller from "../modules/installer/jrt_installer.ts";
import OptionsIO from "../modules/game/optionsIO.ts";
import JavaVersionDetector, { type JavaVersionInfo } from "../java/java_version_detect.ts";
import { compare } from "compare-versions";
import { JavaRuntimeResolver } from "../java/java_runtime_resolver.ts";
import { distributionHeap } from "../memory/memory_distribution.ts";
import NameMap from "../format/namemap.ts";


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
        "-XX:+UseG1GC",
        "-XX:-UseAdaptiveSizePolicy",
        "-XX:-OmitStackTraceInFastThrow",
        "-Xmx${memory_heap}m",
        "-Xms${memory_low}m",
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
    public activeJavaRuntimeInstaller: JavaRuntimeInstaller | null = null
    public activeCompleteDownloader: ConcDownloader | null = null

    public javaInfo: JavaVersionInfo | null = null
    public javaExecutablePath: string = ''

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
        this.nativesPath = launchOptions.lwjglNativesDirectory || existify(this.versionPath, `${this.name}-natives`)
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
            //新增进度键
            this.progress['repair'] = 0
            this.speed['repair'] = 0
            const downloader = new ConcDownloader(30)
            this.activeCompleteDownloader = downloader
            for (const missing of result.repairable) {
                if (!missing.url) {
                    throw new Error('无法修复的问题')
                }
                downloader.add(new DownloadTask(Mirror.getMirrors(missing.url, true), missing.path, missing.sha1))
                downloader.on('progress', p => this.progress['repair'] = p)
                downloader.on('speed', s => this.speed['repair'] = s)
                await downloader.download()
                this.activeCompleteDownloader = null
                downloader.removeAllListeners()
            }
        }
        this.progress['repair'] = 1
        this.speed['repair'] = 0
        return result
    }

    public buildLaunchCommand(authOptions: { username: string, accessToken: string, uuid: string }): LaunchArguments {
        try {
            if (!fs.existsSync(this.versionJsonPath)) {
                throw new FileNotFoundException('缺失版本JSON文件', this.versionJsonPath)
            }
            const versionJson: MinecraftVersionJson = JSON.parse(fs.readFileSync(this.versionJsonPath, 'utf-8'))
            let requiredLibs = versionJson.libraries?.filter(i => i.name && checkOSRules(i.rules)).filter(lib => {
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
            let gameLaunchArguments: { jvm?: any[]; game?: (string | number)[] } = {}
            gameLaunchArguments.jvm = [
                ...(this.launchOptions.jvmArgumentsHead?.length ? this.launchOptions.jvmArgumentsHead : LaunchBase.DEFAULT_JVM_ARGS),
                ...(versionJson?.arguments?.jvm || [])
            ]

            gameLaunchArguments.game =
                versionJson.arguments?.game ||
                versionJson?.minecraftArguments?.split(' ') ||
                LaunchBase.DEFAULT_GAME_ARGS

            if (this.launchOptions.windowWidth) {
                gameLaunchArguments?.game?.push('--width', this.launchOptions.windowWidth)
            }
            if (this.launchOptions.windowHeight) {
                gameLaunchArguments?.game?.push('--height', this.launchOptions.windowHeight)
            }
            if (this.launchOptions.demo) {
                gameLaunchArguments?.game?.push('--demo')
            }
            if (this.launchOptions.entryServer) {
                gameLaunchArguments.game?.push('--server', this.launchOptions.entryServer)
                gameLaunchArguments.game?.push('--quickPlayMultiplayer', this.launchOptions.entryServer)
            }

            const argumentMap = new Map()
            argumentMap.set('natives_directory', this.nativesPath)
            argumentMap.set('launcher_name', 'MML')
            argumentMap.set('launcher_version', '0.0.5')
            argumentMap.set('classpath', classPath.join(this.separator))
            argumentMap.set('library_directory', this.libPath)
            argumentMap.set('classpath_separator', this.separator)
            argumentMap.set('auth_player_name', authOptions.username)
            argumentMap.set('version_name', this.name)
            argumentMap.set('game_directory', this.versionPath)
            argumentMap.set('assets_index_name', versionJson.assets)
            argumentMap.set('assets_root', this.assetsPath)
            argumentMap.set('game_assets', this.assetsPath)
            argumentMap.set('auth_uuid', authOptions.uuid)
            argumentMap.set('auth_access_token', authOptions.accessToken)
            argumentMap.set('client_id', authOptions.uuid)
            argumentMap.set('clientid', authOptions.uuid)
            argumentMap.set('user_type', 'msa')
            argumentMap.set('version_type', 'MioMinecraftLauncher')
            argumentMap.set('user_properties', '{}')
            argumentMap.set('memory_heap', this.launchOptions.memDistribution)
            argumentMap.set('memory_low', this.launchOptions.memLow || 256)
            argumentMap.set('auth_xuid', authOptions.uuid)
            if (!gameLaunchArguments?.jvm?.includes('-cp')) {
                gameLaunchArguments?.jvm?.push('-cp')
                gameLaunchArguments?.jvm?.push('${classpath}')
            }
            const jvmArgs: string[] = []
            for (let i = 0; i < gameLaunchArguments?.jvm?.length; i++) {
                let value: any = gameLaunchArguments.jvm[i]
                if (typeof value === 'object') {
                    const isPass = checkOSRules(value?.rules)
                    if (isPass) {
                        if (Array.isArray(value.value)) {
                            jvmArgs.push(...value.value)
                        } else {
                            jvmArgs.push(value.value)
                        }
                    }
                } else {
                    //修复forge -p替换以后路径错误的问题
                    if (value === '-p') {
                        jvmArgs.push('-p')
                        let param = gameLaunchArguments.jvm[i + 1]
                        const paramSplitedArray = param.split('${classpath_separator}')
                        let modulePathes: string[] = []
                        for (let modulePath of paramSplitedArray) {
                            modulePath = modulePath.replace('${library_directory}', '')
                            modulePath = path.join(this.libPath, modulePath)
                            modulePathes.push(modulePath)
                        }
                        jvmArgs.push(modulePathes.join(argumentMap.get('classpath_separator')))
                        i++
                    } else {
                        const replacement = this.replaceTemplate(value, argumentMap)
                        jvmArgs.push(replacement)
                    }
                }
            }

            jvmArgs.forEach(jvm => (jvm.includes('=') && jvm.startsWith('-')) && jvm.replaceAll(' ', ''))

            const gameArgs: string[] = []
            for (let arg of gameLaunchArguments?.game || []) {
                if (typeof arg === 'object') {
                    continue
                }
                else if (typeof arg === 'number') {
                    arg = arg.toString()
                }
                gameArgs.push(this.replaceTemplate(arg, argumentMap))
            }
            const mainClass = versionJson.mainClass
            return { mainClass, jvmArgs, gameArgs }

        } catch (error) {
            console.error(error)
            throw error
        }
    }

    public async resolveJavaRuntime(): Promise<string | null> {

        let requiredJavaRuntimeVersion = String(this.versionJson.javaVersion?.majorVersion) || '8'
        let requiredJVMVersion = requiredJavaRuntimeVersion === "8" ? '1.8.0' : requiredJavaRuntimeVersion

        const localJavaExecutablePath = path.join(this.minecraftPath, 'java', `${this.OSINFO.platform}-${this.OSINFO.arch}`, String(requiredJavaRuntimeVersion))

        let javaExecutablePath: string | null = null

        if (this.launchOptions.jvmVersionCheck !== false) {
            this.progress['checking-java'] = 0
            if (this.launchOptions.java) {
                const isUserSelectedJavaAvailable = await JavaRuntimeResolver.isJavaValid(this.launchOptions.java, requiredJVMVersion)
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
            const localJavaPath: string = this.OSINFO.platform === 'win32' ? path.join(localJavaExecutablePath, 'bin', 'java.exe') : localJavaExecutablePath
            const isLocalJavaAvailable = await JavaRuntimeResolver.isJavaValid(localJavaPath, requiredJVMVersion)
            if (isLocalJavaAvailable) {
                //本地可用就用本地的了
                javaExecutablePath = localJavaPath
            }
            else {
                //在本地安装java
                const runtimeVersion = this.versionJson.javaVersion?.component || 'jre-legacy'
                const javaRuntimeInstaller = new JavaRuntimeInstaller(runtimeVersion, localJavaExecutablePath, NameMap.getMojangJavaOSIndex(this.OSINFO.platform,this.OSINFO.arch))
                this.activeJavaRuntimeInstaller = javaRuntimeInstaller
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

    public async createGameProcess(javaExecutablePath: string, jvmArgs: string[], mainClass: string, gameArgs: string[]): Promise<number> {
        this.checkCancelSignal();

        return new Promise((resolve, reject) => {
            const fullArgs = [...jvmArgs, mainClass, ...gameArgs];

            try {
                this.gameProcess = spawn(javaExecutablePath, fullArgs, {
                    cwd: this.versionPath,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    windowsHide: false,

                });
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
        this.javaInfo = await JavaRuntimeResolver.getJavaInfo(javaExecutablePath)
        console.log("已使用java", javaExecutablePath)

        //当设置自动内存分配 或者 没有手动分配内存的时候
        //进行自动内存分配
        if (this.launchOptions.autoMemDistribution || !this.launchOptions.memDistribution) {
            let modCount = 0
            if (fs.existsSync(path.join(this.versionPath, 'mods'))) {
                modCount = fs.readdirSync(path.join(this.versionPath, 'mods')).filter(i => path.extname(i) === '.jar').length
            }
            console.log(modCount)
            const freeMemoryMB = (os.freemem() / 1024 / 1024)
            let distributeMemoryMB = distributionHeap(freeMemoryMB, modCount, Math.min(os.totalmem() / 1024 / 1024 / 4, 2048))
            //32位java无法分配2G以上的内存
            if (!this.javaInfo?.is64bit) {
                distributeMemoryMB = Math.min(distributeMemoryMB, 2048)
            }
            this.launchOptions.memDistribution = distributeMemoryMB
        }
        console.log("内存分配", this.launchOptions.memDistribution)
        this.javaExecutablePath = javaExecutablePath

        this.createLaunchDetailLog()
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
        this.removeAllListeners()
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
            cpus: this.OSINFO.cpus,
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
            memHeap: this.launchOptions.memDistribution,
            memLow: this.launchOptions.memLow,
        }
        console.log(launchDetail)
        return launchDetail
    }
}