
import {  type ChildProcessWithoutNullStreams, spawn, type SpawnOptionsWithoutStdio } from 'child_process';
import { compare } from 'compare-versions';
import fs from 'fs'
import path from 'path';
import JavaVersionDetector from './java_version_detect.ts';

export default class JavaExecutor {

    public static chmodJavaSync(javaExecutablePath: string): boolean {
        try {
            fs.accessSync(javaExecutablePath, fs.constants.X_OK);
            return true
        } catch (accessErr) {
            if (process.platform !== 'win32') {
                try {
                    fs.chmodSync(javaExecutablePath, 0o755);
                    return true
                } catch (chmodErr) {
                    console.error(chmodErr)
                    return false
                }
            }
            else {
                return false
            }
        }
    }

    public static async spawnCommand(javaExecutablePath: string, args: string[], options?: SpawnOptionsWithoutStdio) {
        return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
            try {
                const access = JavaExecutor.chmodJavaSync(javaExecutablePath)
                if (!access) {
                    reject(new Error("EACESS"))
                }
                const process = spawn(javaExecutablePath, args, options)
                const rmListener = () => {
                    process.removeAllListeners('error')
                    process.removeAllListeners('close')
                    process.stdout.removeAllListeners('data')
                }
                let std = {
                    stdout: '',
                    stderr: ''
                }
                process.once('spawn', () => {
                    if (!process.pid) {
                        reject(new Error("创建进程失败"))
                    }
                    process.stdout.on('data', (data: Buffer) => {
                        std.stdout += data.toString()
                    })
                    process.stderr.on('data', (data: Buffer) => {
                        std.stderr += data.toString()
                    })
                })
                process.once('error', (error) => {
                    rmListener()
                    reject(error)
                })
                process.once('close', (code, signal) => {
                    rmListener()
                    resolve(std)
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    public static spawnProcess(javaExecutablePath: string, args: string[], options?: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
        const accessable = this.chmodJavaSync(javaExecutablePath)
        if (!accessable) {
            throw new Error("java路径权限不足")
        }
        const process: ChildProcessWithoutNullStreams = spawn(javaExecutablePath, args, options)
        return process
    }

    public static async isJavaValid(javaExecutablePath: string, requireMajorVersion: string, platform: NodeJS.Platform, arch: NodeJS.Architecture): Promise<boolean> {

        try {
            if (!fs.existsSync(javaExecutablePath)) {
                return false
            }
            if (platform === 'win32') {
                if (path.extname(javaExecutablePath) !== '.exe' && path.extname(javaExecutablePath) != '.EXE') {
                    console.error("win平台java为设定为exe文件 如果你指定了javahome 请查看bin/java.exe")
                    return false
                }
            }
            let javaInfo = await JavaVersionDetector.getJavaInfo(javaExecutablePath, platform)
            console.log("检测到的java信息", javaInfo)
            if (!javaInfo) {
                return false
            }
            const processedVersion = javaInfo.version?.split('_')[0]
            if (!requireMajorVersion) { requireMajorVersion = "0.0.1" }
            if (compare(processedVersion, requireMajorVersion, '<')) {
                console.warn(`java版本过低,需要${requireMajorVersion},实际${processedVersion}`)
                return false
            }
            if ((arch === 'x64' || arch === 'arm64') && !javaInfo.is64bit) {
                console.warn("我们推荐你使用64位的java运行你的minecraft")
            }
            if ((arch === 'ia32' || arch === 'arm') && javaInfo.is64bit) {
                console.error("当前是32为系统，无法使用64为java")
                return false
            }
            return true
        } catch (error) {
            console.error(error)
            return false
        }
    }
}