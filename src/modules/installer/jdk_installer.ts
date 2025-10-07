import EventEmitter from "events";
import admZip from 'adm-zip'
import fs from 'fs'
import path from 'path'
import os from 'os'
import axios from "axios";
import { JSDOM } from 'jsdom'
import DownloadTask from "../../downloader/downloadtask.ts";
import { existify } from "../../utils/io.ts";

type JavaBinExEPath = string 

export default class JavaInstaller extends EventEmitter {

    public version: string
    public os: string
    public arch: string
    public javaInstallPath: string
    public javaInstallerZipFile: string


    constructor( version: string, javaInstallPath: string) {
        super()
        this.version = version
        let osMap: { [key: string]: string } = {
            darwin: 'mac',
            linux: 'linux',
            win32: 'windows'
        }
        this.os = osMap[os.platform()] || os.platform()
        this.arch = os.arch()
        this.javaInstallPath = existify(javaInstallPath)
        this.javaInstallerZipFile = path.join(this.javaInstallPath, `${this.version}-${this.os}-${this.arch}.zip`)
    }

    public async install():Promise<JavaBinExEPath> {
        const javaZipURL = await this.getJavaZipDownloadURL()
        if (javaZipURL) {
            const task = new DownloadTask([javaZipURL], this.javaInstallerZipFile, undefined, false)
            task.on('progress', (p) => {
                this.emit('progress', p)
            })
            task.on('speed', (e) => {
                this.emit('speed', e)
            })
            const javaZipPath = await task.download()
            if (javaZipPath) {
                this.extractZipSkipTopLevel(javaZipPath, this.javaInstallPath)
                fs.rmSync(path.join(javaZipPath))

                this.emit('progress',1)
                this.emit('speed',0)
                task.removeAllListeners()
                this.removeAllListeners()

                return path.join(this.javaInstallPath, 'bin', 'java.exe')
            }
            else {
                this.emit('progress',1)
                this.emit('speed',0)
                task.removeAllListeners()
                this.removeAllListeners()

                throw new Error()
            }
        }
        else {
            this.emit('progress',1)
            this.emit('speed',0)
            this.removeAllListeners()
            throw new Error()
        }
    }

    protected extractZipSkipTopLevel(zipPath: string, targetDir: string) {
        const zip = new admZip(zipPath)
        const zipEntries = zip.getEntries()
        const topLevelDir = zipEntries[0].entryName.split('/')[0] + '/'
        const topLevelDirLength = topLevelDir.length
        zipEntries.forEach((entry) => {
            if (!entry.isDirectory && entry.entryName.startsWith(topLevelDir)) {
                const relativePath = entry.entryName.slice(topLevelDirLength)
                const fullPath = path.join(targetDir, relativePath)
                const dir = path.dirname(fullPath)
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true })
                }
                zip.extractEntryTo(entry, dir, false, false)
            }
        })
    }

    protected async getJavaZipDownloadURL(): Promise<null | string> {
        const indexUrl = `https://mirrors.tuna.tsinghua.edu.cn/Adoptium/${this.version}/jdk/${this.arch}/${this.os}/`
        const indexHTML = await axios.get(indexUrl, {
            method: 'get',
            responseType: 'document'
        })
        const dom = new JSDOM(indexHTML.data as string)
        const table = dom.window.document.querySelector('table')
        if (!table) {
            throw new Error('No Table Got')
        }
        const trs = table.querySelector('tbody')?.querySelectorAll('tr')
        let filename = ''
        for (let tr of trs || []) {
            let link = tr.querySelector('.link')?.querySelector('a')
            if (link) {
                const href = link.href
                if (href.includes('.zip')) {
                    filename = href
                    break
                }
            }
        }
        if (filename) {
            return indexUrl + filename
        }
        return null
    }
}