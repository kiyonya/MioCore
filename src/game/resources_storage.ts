import path from "path";
import fs from 'fs'
import pLimit from "p-limit";

import HashUtil from "../utils/hash.ts";
import { existify } from "../utils/io.ts";

interface ResourcesStoreOptions {
    storePath: string
    dirs: string[]
    versionPath: string
}

type StoreItem = {
    fileName: string,
    sha1: string,
    store: string,
}

export default class ResourcesStore {

    public storePath: string
    public dirs: string[]
    public versionPath: string

    constructor(options: ResourcesStoreOptions) {
        this.storePath = options.storePath
        this.dirs = options.dirs
        this.versionPath = options.versionPath
    }

    public async inStore(removeRaw: boolean = false) {

        existify(this.storePath)
        for (const dir of this.dirs) {
            const dirPath = path.join(this.versionPath, dir)
            if (!fs.existsSync(dirPath)) continue

            const files = fs.readdirSync(dirPath).map(i => path.join(dirPath, i)).filter(i => !fs.statSync(i).isDirectory()).filter(i => path.extname(i) !== '.store')

            const limit = pLimit(200)

            const hashPromises: Promise<{ file: string, sha1: string }>[] = files.map(file => limit(() => new Promise((resolve, reject) => {
                HashUtil.sha1(file).then(sha1 => resolve({ file, sha1 })).catch(reject)
            })))

            const hashes = await Promise.all(hashPromises)
            const storeDir = existify(this.storePath, dir)

            const storeIndex: { fileName: string, sha1: string, store: string }[] = []

            let needStoreUpdate = false

            if (fs.existsSync(path.join(dirPath, 'index.store'))) {
                const storeJson: StoreItem[] = JSON.parse(fs.readFileSync(path.join(dirPath, 'index.store'), 'utf-8'))
                if (storeJson.length !== hashes.length) {
                    needStoreUpdate = true
                }
            }

            for (const hash of hashes) {
                const fileName = path.basename(hash.file)
                const sha1 = hash.sha1
                storeIndex.push({
                    fileName, sha1, store: storeDir
                })
                const destHashDir = existify(storeDir, sha1.slice(0, 2))
                const destFile = path.join(destHashDir, (sha1 + path.extname(hash.file)).replace('.disabled', '.jar'))

                if (!fs.existsSync(destFile)) {
                    fs.copyFileSync(hash.file, destFile)
                }
                if (removeRaw) {
                    fs.unlinkSync(hash.file)
                }
            }

            if (needStoreUpdate) {

                console.log("store需要更新")

                if (fs.existsSync(path.join(dirPath, 'index.store'))) {
                    const backups = existify(dirPath, 'backups')
                    fs.writeFileSync(path.join(backups, `backup-${this.getCurrentTime()}.store`), fs.readFileSync(path.join(dirPath, 'index.store')))
                }
                //更新store
                fs.writeFileSync(path.join(dirPath, 'index.store'), JSON.stringify(storeIndex), 'utf-8')
                //创建old
            }

        }
    }

    public async outStore(): Promise<string[]> {
        const pulled: string[] = []

        for (const dir of this.dirs) {
            const destPath = existify(this.versionPath, dir)
            const storeIndexJsonPath = path.join(destPath, 'index.store')

            if(!fs.existsSync(storeIndexJsonPath)){
                throw new Error("索引文件缺失，无法为您找到模组目录，或许您有备份文档，您可以选择还原")
            }

            const storeIndexJson = JSON.parse(fs.readFileSync(storeIndexJsonPath, 'utf-8'))

            for (const index of storeIndexJson) {
                const { fileName, sha1, store } = index
                const storeFilePath = path.join(store, sha1.slice(0, 2), sha1 + path.extname(fileName))
                if (!fs.existsSync(storeFilePath)) throw new Error("FILE NOT FOUND")
                fs.copyFileSync(storeFilePath, path.join(destPath, fileName))
                pulled.push(path.join(destPath, fileName))
            }

        }
        return pulled
    }


    public async restore(): Promise<string[]> {
        const restored = await this.outStore()
        for (const dir of this.dirs) {
            const destPath = existify(this.versionPath, dir)
            const storeIndexFiles = fs.readdirSync(destPath).map(i => path.join(destPath, i)).filter(i => path.extname(i) === ".store")
            for (const indexf of storeIndexFiles) {
                fs.rmSync(indexf, { force: true })
            }
        }
        return restored
    }

    protected getCurrentTime() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
    }

}