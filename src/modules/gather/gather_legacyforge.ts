import path from "path"
import fs from 'fs'
import { existify, mavenToPath } from "../../utils/io.ts"
import { type DownloadTaskItem } from "../../types/index.ts";

interface LegacyForgeLib {
    name: string
    url?: string
    checksums?: string[]
    serverreq?: boolean
    clientreq?: boolean
}

export class LegacyForgeGather {
    public forgeWorkDir: string
    public libPath: string
    public side: 'client' | 'server'
    public forgeUnpackDir: string

    constructor(options:{forgeWorkDir: string, libPath: string, side: 'client' | 'server'}) {
        this.forgeWorkDir = options.forgeWorkDir
        this.libPath = options.libPath
        this.side = options.side
        this.forgeUnpackDir = path.join(options.forgeWorkDir, 'unpack')
    }

    public async gather():Promise<DownloadTaskItem[]> {

        const tasks: DownloadTaskItem[] = []
        const installProfileJsonPath = path.join(this.forgeUnpackDir, 'install_profile.json')
        const installProfileJson = JSON.parse(fs.readFileSync(installProfileJsonPath, 'utf-8'))
        let versionInfo = installProfileJson.versionInfo

        let libraries: LegacyForgeLib[] = versionInfo.libraries.filter((i: LegacyForgeLib) => {
            if (!i.clientreq && !i.serverreq) {
                return true
            }
            else if (this.side === 'client' && i.clientreq) {
                return true
            }
            else if (this.side === 'server' && i.serverreq) {
                return true
            }
            return false
        })

        for (let lib of libraries) {
            
            let pathLike = mavenToPath(lib.name)
            let url = (lib?.url ? lib.url + pathLike : 'https://libraries.minecraft.net/' + pathLike).replaceAll("\\", '/')
            if(lib.name.startsWith('net.minecraftforge:forge')){
                url = url.replaceAll('.jar','-universal.jar')
            }
            let filepath = path.join(this.libPath, pathLike)
            tasks.push({
                path: filepath,
                url,
                sha1: lib?.checksums?.[0] || undefined
            })
        }

        return tasks

    }
}


