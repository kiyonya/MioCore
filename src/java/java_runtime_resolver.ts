import path from "path"
import fs from 'fs'
import os from 'os'
import JavaVersionDetector, { type JavaVersionInfo } from "./java_version_detect.ts"
import { compare } from "compare-versions"
import { type MinecraftVersionJson } from "../types/index.ts"
import { EventEmitter } from "events"
import JavaRuntimeInstaller from "./java_runtime_installer.ts"

export interface JavaResolveStatuEvents {
    "checking-progress": (progress: number) => void;
    "install-progress": (progress: number) => void;
    "speed": (speed: number) => void;
}

abstract class JavaRuntimeResolverBase extends EventEmitter {
    on<K extends keyof JavaResolveStatuEvents>(
        event: K,
        listener: JavaResolveStatuEvents[K]
    ): this {
        return super.on(event, listener);
    }

    once<K extends keyof JavaResolveStatuEvents>(
        event: K,
        listener: JavaResolveStatuEvents[K]
    ): this {
        return super.once(event, listener);
    }

    emit<K extends keyof JavaResolveStatuEvents>(
        event: K,
        ...args: Parameters<JavaResolveStatuEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

    public static readonly platform = os.platform()
    public static readonly arch = os.arch()

    public static async getJavaInfo(javaExecutablePath: string): Promise<JavaVersionInfo | null> {
        if (this.platform === 'win32') {
            return await JavaVersionDetector.getWindowsJavaVersion(javaExecutablePath)
        }
        else if (this.platform === 'linux') {
            return await JavaVersionDetector.getLinuxJavaVersion(javaExecutablePath)
        }
        else if (this.platform === 'darwin') {
            return await JavaVersionDetector.getMacOSJavaVersion(javaExecutablePath)
        }
        return null
    }

    public static async isJavaValid(javaExecutablePath: string, requireMajorVersion: string): Promise<boolean> {
        try {
            if (!fs.existsSync(javaExecutablePath)) {
                return false
            }
            if (this.platform === 'win32') {
                if (path.extname(javaExecutablePath) !== '.exe' && path.extname(javaExecutablePath) != '.EXE') {
                    console.error("win平台java为设定为exe文件 如果你指定了javahome 请查看bin/java.exe")
                    return false
                }
            }
            let javaInfo: JavaVersionInfo | null = await this.getJavaInfo(javaExecutablePath)
            if (!javaInfo) {
                return false
            }
            const processedVersion = javaInfo.version?.split('_')[0]
            if (!requireMajorVersion) { requireMajorVersion = "0.0.1" }
            if (compare(processedVersion, requireMajorVersion, '<')) {
                console.warn(`java版本过低,需要${requireMajorVersion},实际${processedVersion}`)
                return false
            }
            if ((this.arch === 'x64' || this.arch === 'arm64') && !javaInfo.is64bit) {
                console.warn("我们推荐你使用64位的java运行你的minecraft")
            }
            if ((this.arch === 'ia32' || this.arch === 'arm') && javaInfo.is64bit) {
                console.error("当前是32为系统，无法使用64为java")
                return false
            }
            return true
        } catch (error) {
            console.error(error)
            return false
        }
    }

    public static getMojangJavaPlatform() {
        if (this.platform === 'linux') {
            if (this.arch === 'ia32') {
                return 'linux-i386';
            }
            else {
                return 'linux'
            }
        } else if (this.platform === 'darwin') {
            return this.arch === 'arm64' ? 'mac-os-arm64' : 'mac-os';
        } else if (this.platform === 'win32') {
            if (this.arch === 'x64') {
                return 'windows-x64';
            } else if (this.arch === 'arm64') {
                return 'windows-arm64';
            } else if (this.arch === 'ia32') {
                return 'windows-x86';
            }
        }
        throw new Error('Unsupported platform or architecture');
    }
}
/**
 * 自动检查java是否可用,如果java不存在可以自动下载
 * @example 如果presetjavapath不存在 或者版本不符合 架构不符合 就会从本地安装的java路径里查找，如果安装了会检查本地的是否可用，如果本地的不可用或者根本不存在的话，根据版本json查找对应的java并且自动安装到本地的安装目录，resolve方法一定会返回一个可用的win64的java.exe绝对路径
 * @example 兼容了检查和自动安装的方法的类，他永远会从你给一个或者两个的地方 找到或者安装新的java
 */
export class JavaRuntimeResolver extends JavaRuntimeResolverBase {

    public versionJson: MinecraftVersionJson
    public presetJavaPath: string | undefined
    public activeJavaRuntimeInstaller: JavaRuntimeInstaller | null = null
    public localJavaInstallPath: string
    public aborted: boolean = false

    /**
     * 
     * @param versionJson 版本JSON内容
     * @param localJavaInstallPath 本地安装的java路径，如果第三项预设不存在或者不可用，将会获取或安装java运行环境到本路径
     * @win64 安装目录自动查找 bin/java.exe
     * @param presetJavaPath 预设java路径，用于检测的java
     */
    constructor(versionJson: MinecraftVersionJson, localJavaInstallPath: string, presetJavaPath?: string) {
        super()
        this.versionJson = versionJson
        this.presetJavaPath = presetJavaPath
        this.localJavaInstallPath = localJavaInstallPath
    }

    public async resolve(): Promise<{javaInfo:JavaVersionInfo,javaExecutablePath:string}> {
        if (this.aborted) {
            throw "已取消"
        }
        let javaExecutablePath: string = ''
        this.emit('checking-progress', 0)
        const requiredJavaRuntimeVersion = this.versionJson.javaVersion?.majorVersion || 8
        let checkJavaPath: string[] = []
        if (this.presetJavaPath) {
            checkJavaPath.push(this.presetJavaPath)
        }
        const localJavaExecutablePath = path.join(this.localJavaInstallPath, 'bin', 'java.exe')
        if (fs.existsSync(localJavaExecutablePath)) {
            checkJavaPath.push(localJavaExecutablePath)
        }

        for (const javaPath of checkJavaPath) {
            const isJavaAvailable: boolean = await JavaRuntimeResolver.isJavaValid(javaPath, requiredJavaRuntimeVersion === 8 ? "1.8.0" : String(requiredJavaRuntimeVersion))
            if (isJavaAvailable) {
                javaExecutablePath = javaPath
                break
            }
        }
        this.emit('checking-progress', 1)

        //旧版本没有javaVersion这个字段 此时安装java8
        if (!javaExecutablePath && !this.aborted) {

            const platformAndArchIndex = JavaRuntimeResolver.getMojangJavaPlatform()

            console.error("需要安装java")
            this.emit('install-progress', 0)
            this.emit('speed', 0)
            const installVersion = this.versionJson.javaVersion?.component || 'jre-legacy'
            console.log("安装JAVA运行时,在", this.localJavaInstallPath)

            const javaRuntimeInstaller = new JavaRuntimeInstaller(installVersion, this.localJavaInstallPath, platformAndArchIndex)

            javaRuntimeInstaller.on('progress', (p) => this.emit('install-progress', p))
            javaRuntimeInstaller.on('speed', (s) => this.emit('speed', s))
            this.activeJavaRuntimeInstaller = javaRuntimeInstaller
            await javaRuntimeInstaller.install()
            this.activeJavaRuntimeInstaller = null
            javaRuntimeInstaller.removeAllListeners()
            const executablePath = path.join(this.localJavaInstallPath, 'bin', 'java.exe')

            const isNewJavaAvailable = await JavaRuntimeResolver.isJavaValid(executablePath, requiredJavaRuntimeVersion === 8 ? "1.8.0" : String(requiredJavaRuntimeVersion))

            if (!isNewJavaAvailable) {
                throw new Error(`无法获取可以运行的java,需要${requiredJavaRuntimeVersion}`)
            }
            javaExecutablePath = executablePath
        }
        this.emit('checking-progress', 1)
        this.emit('install-progress', 1)
        this.emit('speed', 0)
        this.removeAllListeners()
        const javaInfo = await JavaRuntimeResolver.getJavaInfo(javaExecutablePath) as JavaVersionInfo
        return {javaExecutablePath,javaInfo}
    }

    public async abort() {
        this.aborted = true
        if (this.activeJavaRuntimeInstaller) { await this.activeJavaRuntimeInstaller.abort() }
        fs.rmSync(this.localJavaInstallPath)
    }
}
