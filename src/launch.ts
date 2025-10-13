import EventEmitter from "events"
import path from "path"
import os from 'os'
import fs from 'fs'
import crypto from 'crypto'
import { type MinecraftVersionJson, type LaunchOptions, type MinecraftLib } from "./types/index.ts"
import { mavenToPath } from "../src/utils/io.ts"
import AdmZip from "adm-zip"
import { existify } from "./utils/io.ts"
import { checkOSRules } from "./utils/os.ts"
import { checkFiles } from "./modules/check/file_checker.ts"
import { type ChildProcessWithoutNullStreams, spawn } from "child_process"
import JavaRuntimeInstaller from "./modules/installer/jrt_installer.ts"
import ConcDownloader from "./downloader/downloader.ts"
import DownloadTask from "./downloader/downloadtask.ts"
import Mirror from "./modules/mirror/mirror.ts"
import OptionsIO from "./modules/game/optionsIO.ts"
import WinCppAddon from "./addon/wincpp/index.ts"
import { compareVersions } from "./utils/v.ts"

interface LauncherCreateOptions {
    minecraftPath: string,
    name: string,
    versionIsolation: boolean
}

export default class ClientLauncher extends EventEmitter {

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

    public static DEFUALT_JVM_ARGS = [
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

    public progress: { [K: string]: number }
    public minecraftPath: string
    public versionPath: string
    public libPath: string
    public assetsPath: string
    public assetsIndexesPath: string
    public assetsObjectsPath: string
    public nativesPath: string
    public minecraftJarPath: string

    public launchOptions: LaunchOptions
    public name: string

    public java?: string
    public isWindows: boolean

    public speed: { [K: string]: number }

    public gameProcess: ChildProcessWithoutNullStreams | null

    constructor(createOptions: LauncherCreateOptions, launchOptions: LaunchOptions) {
        super()
        this.launchOptions = launchOptions
        this.name = createOptions.name
        this.progress = {}
        this.speed = {}

        this.minecraftPath = createOptions.minecraftPath
        this.versionPath = createOptions.versionIsolation ? path.join(this.minecraftPath, 'versions', `${this.name}`) : this.minecraftPath

        this.libPath = path.join(this.minecraftPath, 'libraries')
        this.assetsPath = path.join(this.minecraftPath, 'assets')
        this.assetsIndexesPath = path.join(this.assetsPath, 'indexes')
        this.assetsObjectsPath = path.join(this.assetsPath, 'objects')
        this.nativesPath = launchOptions.lwjglNativesDirectory || existify(this.versionPath, `${this.name}-natives`)
        this.minecraftJarPath = path.join(this.versionPath, `${this.name}.jar`)

        this.isWindows = os.platform() === 'win32'

        this.java = launchOptions.java
        this.gameProcess = null
    }

    public async launch(authOptions: { username: string, accessToken: string, uuid: string }):Promise<number> {
        const versionJsonPath = path.join(this.versionPath, `${this.name}.json`)
        if (!fs.existsSync(versionJsonPath)) {
            throw new Error('缺失版本json文件')
        }
        const versionJson: MinecraftVersionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))

        const loses = await checkFiles({ versionJsonPath: versionJsonPath, libPath: this.libPath, assetsPath: this.assetsPath, minecraftJar: this.minecraftJarPath })

        if (!this.java) {
            //检查目录
            const requiredJavaVersion = versionJson.javaVersion?.majorVersion || 8
            const javaEXEInMinecraftDir = path.join(this.minecraftPath, 'java', String(requiredJavaVersion), 'bin', 'java.exe')
            if (fs.existsSync(javaEXEInMinecraftDir)) {
                this.java = javaEXEInMinecraftDir
            }
            else {
                //下载了只能
                const javaRuntimeInstaller = new JavaRuntimeInstaller(versionJson.javaVersion?.component || 'jre-legacy', path.join(this.minecraftPath, 'java', String(requiredJavaVersion)))

                this.progress.installJava = 0

                javaRuntimeInstaller.on('progress', (p) => this.progress.installJava = p)
                javaRuntimeInstaller.on('speed', (speed) => { this.speed['java'] = speed })

                const javaEXE = await javaRuntimeInstaller.install()
                this.java = javaEXE
            }
        }

        if (loses.length) {
            this.progress['complete'] = 0

            const completeDownloader = new ConcDownloader(50)

            for (const lose of loses) {
                if (lose.url) {
                    completeDownloader.add(new DownloadTask(Mirror.getMirrors(lose.url), lose.path, lose.sha1))
                }
                else {
                    throw new Error(`无法补全文件 在：${lose.path}`)
                }
            }

            completeDownloader.on('progress', (p) => this.progress['complete'] = p)
            completeDownloader.on('speed', (s) => this.speed.complete = s)

            await completeDownloader.download()

            this.progress['complete'] = 1
            this.speed.complete = 0
        }

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

        const { mainClass, jvmArgs, gameArgs } = this.createLaunchCommand(versionJson, authOptions)

        console.log(mainClass)

        const cmd = `"${this.java}" ${jvmArgs.join(' ')} ${mainClass} ${gameArgs.join(' ')}\n\npause`
        fs.writeFileSync(path.join(this.versionPath, 'latestlaunch.bat'), cmd, 'utf-8')

        this.gameProcess = spawn(this.java as string, [
            ...jvmArgs,
            mainClass,
            ...gameArgs
        ], {
            cwd: this.versionPath,
        })

        this.gameProcess.on('error', (error) => {
            this.onGameLaunchFailed(error)
            throw error
        })

        if (!this.gameProcess.pid) {
            this.onGameLaunchFailed(new Error('游戏进程启动失败'))
            throw new Error('游戏进程启动失败')
        }
        else {
            this.addProcessListener()
            
            const isWindowCreate = new Promise<boolean>((resolve, reject) => {
                if (!this.gameProcess?.pid) {
                    resolve(false)
                }
                else {
                    let maxWaitTimeout: NodeJS.Timeout = setTimeout(() => {
                        resolve(false)
                        clearTimeout(maxWaitTimeout)

                    }, 3 * 60 * 1000);

                    let queryInterval: NodeJS.Timeout = setInterval(() => {

                        const hasWindow: boolean = WinCppAddon.isPidHasWindow(this.gameProcess?.pid as number)
                        console.log(hasWindow)

                        if (hasWindow) {
                            resolve(true)
                            clearInterval(queryInterval)
                            clearTimeout(maxWaitTimeout)
                        }
                    }, 100);
                }
            })
            await isWindowCreate

            if (this.launchOptions.title) {
                WinCppAddon.modifyWinTitle(this.gameProcess.pid, this.launchOptions.title)
            }
        }

        return this.gameProcess.pid
    }

    protected createLaunchCommand(versionJson: MinecraftVersionJson, authOptions: { username: string, accessToken: string, uuid: string }) {
        let requiredLibs = versionJson.libraries?.filter(i => i.name && checkOSRules(i.rules)).filter(lib => {
            //处理旧版forge的clientreq
            if (!lib.clientreq || lib.clientreq === true) { return true }
            return false
        })

        console.warn(requiredLibs)

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
                    const latestVersion = compareVersions(version, settledVersion)
                    if (latestVersion === settledVersion) {
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
            if (lib.downloads?.classifiers) {
                for (const [os, natives] of Object.entries(lib.downloads.classifiers)) {
                    const nativeJarPath = path.join(this.libPath, natives.path)
                    classPath.push(nativeJarPath)
                    if (!fs.existsSync(nativeJarPath)) {
                        throw new Error('不存在的Native文件')
                    }
                    const nativeJar = new AdmZip(nativeJarPath)
                    const entries = nativeJar.getEntries().filter(i => i.entryName.toLowerCase().endsWith('.dll'))
                    for (const entry of entries) {
                        nativeJar.extractEntryTo(entry, this.nativesPath, false, true)
                    }
                }
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

        console.warn(classPath)

        let gameLaunchArguments: { jvm?: any[]; game?: (string | number)[] } = {}
        gameLaunchArguments.jvm = [
            ...(this.launchOptions.jvmArgumentsHead?.length ? this.launchOptions.jvmArgumentsHead : ClientLauncher.DEFUALT_JVM_ARGS),
            ...(versionJson?.arguments?.jvm || [])
        ]

        gameLaunchArguments.game =
            versionJson.arguments?.game ||
            versionJson?.minecraftArguments?.split(' ') ||
            ClientLauncher.DEFAULT_GAME_ARGS

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
        argumentMap.set('classpath', classPath.join(this.isWindows ? ';' : ':'))
        argumentMap.set('library_directory', this.libPath)
        argumentMap.set('classpath_separator', this.isWindows ? ';' : ':')
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
        argumentMap.set('memory_heap', this.launchOptions.memDistribution || 4096)
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

    public addProcessListener() {
        if (this.gameProcess && this.gameProcess.pid && !this.gameProcess.killed) {
            this.gameProcess.stdout.addListener('data', (data: Buffer) => {
                this.emit('stdout', data.toString())
            })
            this.gameProcess.stderr.addListener('error', (stderr: Buffer) => {
                this.emit('stderr', stderr.toString())
            })
            this.gameProcess.addListener('exit', (code, signal) => {
                this.emit('exit', code, signal)
                if (code !== 0) {
                    this.emit('crash', code, signal)
                }
            })
            this.gameProcess.addListener('close', (code, signal) => {
                this.emit('close', code, signal)
                if (code !== 0) {
                    this.emit('crash', code, signal)
                }
            })
        }
    }

    public removeProcessListener() {
        if (this.gameProcess && this.gameProcess.pid && !this.gameProcess.killed) {
            this.gameProcess.stdout.removeAllListeners()
            this.gameProcess.stderr.removeAllListeners()
            this.gameProcess.removeAllListeners()
        }
    }

    public killProcess(): null | number {
        if (this.gameProcess && !this.gameProcess.killed) {
            this.gameProcess.kill("SIGTERM")
            const exitCode = this.gameProcess.exitCode
            this.gameProcess = null
            return exitCode
        }
        return null
    }

    protected onGameLaunchFailed(error: Error) {
        this.emit('failed', error)
        this.removeProcessListener()
        this.gameProcess = null
    }
}