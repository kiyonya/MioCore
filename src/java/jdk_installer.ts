import os from 'os'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import path from 'path'
import fs from 'fs'
import { extract } from 'tar'
import AdmZip from 'adm-zip'
import { JSDOM } from 'jsdom'
import EventEmitter from 'events'
import { existify } from '../utils/io.ts'
import DownloadTask from '../downloader/downloadtask.ts'


export type TsingHuaMirrorJavaArch = 'aarch64' | 'arm' | 'ppc64' | 'ppc64le' | 'x32' | 'x64'
export type TsingHuaMirrorJavaPlatform = 'windows' | 'linux' | 'mac'

export interface JavaInstallerEvents {
    "progress": (progress: number) => void;
    "speed": (speed: number) => void;
}

export default class JDKInstaller extends EventEmitter {

    on<K extends keyof JavaInstallerEvents>(
        event: K,
        listener: JavaInstallerEvents[K]
    ): this {
        return super.on(event, listener);
    }

    once<K extends keyof JavaInstallerEvents>(
        event: K,
        listener: JavaInstallerEvents[K]
    ): this {
        return super.once(event, listener);
    }

    emit<K extends keyof JavaInstallerEvents>(
        event: K,
        ...args: Parameters<JavaInstallerEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }


    public installPath: string
    public javaVersion: string
    public platform: NodeJS.Platform
    public arch: NodeJS.Architecture

    public axiosClient = axios.create({
        timeout: 10000
    })

    public activeDownloadTask: DownloadTask | null = null
    public aborted: boolean = false

    constructor(installPath: string, javaVersion: string, platform?: NodeJS.Platform, arch?: NodeJS.Architecture) {
        super()
        this.installPath = existify(installPath)
        this.javaVersion = javaVersion
        this.platform = platform || os.platform()
        this.arch = arch || os.arch()
        axiosRetry(this.axiosClient, { retries: 10 })
        const isInstallPathEmpty = fs.readdirSync(this.installPath).length === 0
        if (!isInstallPathEmpty) {
            throw new Error("安装路径不是空文件夹，可能意味着里面存在已经安装完成的文件，请指定一个空文件夹进行安装")
        }
    }

    /**
     * 
     * @param rmpack 是否删除安装包，默认删除
     * @returns 安装后的Java路径
     * @throws Error 找不到合适的Java安装包或安装过程中出错
     */

    public async install(rmpack: boolean = true): Promise<string> {

        const mirrorArch = this.mapTsingHuaMirrorJavaArch(this.arch)
        const mirrorPlatform = this.mapTsingHuaMirrorJavaPlatform(this.platform)
        this.checkAbort()
        const downloadURL = await this.getTsinghuaMirrorFile(this.javaVersion, mirrorArch, mirrorPlatform)
        if (!downloadURL) {
            throw new Error("找不到合适的java")
        }
        const installPackFilename: string = downloadURL.split('/').pop() || 'jdkpack.zip'
        const installPackPath = path.join(this.installPath, installPackFilename)
        this.activeDownloadTask = new DownloadTask([downloadURL], installPackPath, undefined, false)

        this.activeDownloadTask.on('progress', progress => this.emit('progress', progress))
        this.activeDownloadTask.on('speed', speed => this.emit('speed', speed))

        this.checkAbort()
        const pack = await this.activeDownloadTask.download()
        this.activeDownloadTask.removeAllListeners()
        console.log(pack)

        if (path.extname(pack) === '.gz') {
            const extractTempDir = existify(this.installPath, 'extract')
            await this.extractTarGz(pack, extractTempDir)
            const dirs = fs.readdirSync(extractTempDir).map(i => path.join(extractTempDir, i)).filter(i => fs.statSync(i).isDirectory())
            if (dirs.length === 1) {
                await this.copyDirectory(dirs[0], this.installPath)
            }
            else await this.copyDirectory(extractTempDir, this.installPath)
            fs.rmSync(extractTempDir, { recursive: true })
        }
        else if (path.extname(pack) === '.zip') {
            this.extractZipSkipLevels(pack, this.installPath, 1)
        }
        else {
            throw new Error("无法识别的Java安装包格式")
        }
        if (rmpack) {
            fs.rmSync(pack, { force: true })
        }
        this.removeAllListeners()
        return this.installPath
    }

    public async abort() {
        this.aborted = true
        if (this.activeDownloadTask) {
            await this.activeDownloadTask.abort()
            if (fs.existsSync(this.installPath)) {
                try {
                    fs.rmSync(this.installPath, { recursive: true, force: true })
                } catch (error) {
                    console.warn("删除源文件失败")
                }
            }
        }
    }

    private checkAbort() {
        if (this.aborted) {
            throw new Error("已取消Java安装")
        }
    }

    private async getTsinghuaMirrorFile(version: string, arch: TsingHuaMirrorJavaArch, platform: TsingHuaMirrorJavaPlatform): Promise<string | null> {
        try {

            if (!Number(version)) {
                return null
            }

            const indexURI = `https://mirrors.tuna.tsinghua.edu.cn/Adoptium/${version}/jdk/${arch}/${platform}/`
            const resp = await this.axiosClient.get<string>(indexURI, {
                responseType: 'text',
                responseEncoding: 'utf-8',
            })
            const document = resp.data
            const dom = new JSDOM(document)
            const tbody = dom.window.document.querySelector('tbody')
            const links = tbody?.querySelectorAll('a')
            let fileuri: string = ''
            links?.forEach(link => {
                if (link.title && link.href) {
                    if (platform === 'windows' && link.href.endsWith('.zip')) {
                        fileuri = link.href
                    }
                    else if (link.href.endsWith('.gz')) {
                        fileuri = link.href
                    }
                }
            })
            if (!fileuri) {
                return null
            }
            const fullPath = indexURI + fileuri
            return fullPath

        } catch (error) {
            console.error(error)
            return null
        }
    }

    private mapTsingHuaMirrorJavaArch(arch: NodeJS.Architecture): TsingHuaMirrorJavaArch {
        switch (arch) {
            case 'arm':
                return 'arm'
            case 'arm64':
                return 'aarch64'
            case 'x64':
                return 'x64'
            case 'ia32':
                return 'x32'
            case 'ppc64':
                return 'ppc64'
            default:
                throw new Error("找不到可用的Java架构")
        }
    }

    private mapTsingHuaMirrorJavaPlatform(platform: NodeJS.Platform): TsingHuaMirrorJavaPlatform {
        switch (platform) {
            case 'darwin':
                return 'mac'
            case 'linux':
                return 'linux'
            case 'win32':
                return 'windows'
            default:
                throw new Error("找不到可用的Java架构")
        }
    }

    private async extractTarGz(tarGzPath: string, outputDir: string) {
        return new Promise<string>((resolve, reject) => {
            fs.createReadStream(tarGzPath)
                .pipe(extract({

                    cwd: outputDir
                }))
                .on('finish', () => {
                    console.log('解压完成！');
                    resolve(outputDir);
                })
                .on('error', (error) => {
                    console.error('解压失败:', error);
                    reject(error);
                });
        });
    }

    private async copyDirectory(src: string, dest: string) {
        try {
            existify(dest)
            const items = await fs.promises.readdir(src);
            for (const item of items) {
                const srcPath = path.join(src, item);
                const destPath = path.join(dest, item);
                const stat = await fs.promises.stat(srcPath);
                if (stat.isDirectory()) {
                    await this.copyDirectory(srcPath, destPath);
                } else {
                    await fs.promises.copyFile(srcPath, destPath);
                }
            }
            console.log(`成功拷贝 ${src} 到 ${dest}`);
        } catch (error) {
            throw error;
        }
    }

    private extractZipSkipLevels(zipPath: string, targetDir: string, skipLevels = 1) {
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();
        existify(targetDir)
        entries.forEach(entry => {
            if (!entry.isDirectory) {
                const parts = entry.entryName.split(/[\/\\]/).filter(p => p);
                if (parts.length > skipLevels) {
                    const targetParts = parts.slice(skipLevels);
                    const targetPath = targetParts.join('/');
                    const fullPath = path.join(targetDir, targetPath);
                    const dirPath = path.dirname(fullPath);
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    zip.extractEntryTo(entry, dirPath, false, true);
                    console.log(`提取: ${targetPath}`);
                }
            }
        });
    }
}