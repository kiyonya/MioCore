import axios from "axios";
import EventEmitter from "events";
import { mavenToPath } from "../../utils/io.ts";
import path from "path";

interface FabricGatherOptions {
    libPath: string,
    version: string,
    fabricVersion: string,
    side: 'server' | 'client',
    fabricAPIVersion?: string,
    modsDir?: string
}

type FabricLibIndex = {
    "name": string,
    "url": string,
    "md5": string,
    "sha1": string,
    "sha256": string,
    "sha512": string,
    "size": number
}

interface FabricIndexJson {
    loader: {
        maven: string,
    }
    intermediary: {
        maven: string
    }
    launcherMeta: {
        version: number,
        min_java_version: string,
        libraries: {
            client: FabricLibIndex[],
            common: FabricLibIndex[],
            server: FabricLibIndex[],
            development: FabricLibIndex[]
        },
        mainClass: {
            client: string,
            server: string,
        }
    }
}

interface DownloadTaskItem {
    url: string;
    sha1?: string;
    path: string;
    type?: string;
}


export default class FabricGather extends EventEmitter {

    public libPath: string
    public version: string
    public fabricVersion: string
    public side: 'server' | 'client'
    public fabricAPIVersion?: string
    public modsDir?: string

    constructor(options: FabricGatherOptions) {
        super()
        this.libPath = options.libPath
        this.version = options.version
        this.side = options.side
        this.fabricVersion = options.fabricVersion
        this.fabricAPIVersion = options.fabricAPIVersion
        this.modsDir = options.modsDir
    }

    public async gather(): Promise<DownloadTaskItem[]> {
        const tasks: DownloadTaskItem[] = []

        if (this.side === 'client') {
            const fabricLoaderIndexJson = await this.getFabricLoaderIndexJson(this.fabricVersion)

            //调解人的任务
            const intermediaryMavenPath = mavenToPath(fabricLoaderIndexJson.intermediary.maven)
            const intermediaryURL = ("https://maven.fabricmc.net/" + intermediaryMavenPath).replaceAll("\\", "/")
            tasks.push({
                url: intermediaryURL,
                path: path.join(this.libPath, intermediaryMavenPath),
                sha1: undefined
            })

            //主fabricloader的任务
            const fabricloaderMavenPath = mavenToPath(fabricLoaderIndexJson.loader.maven)
            const fabricloaderURL = ("https://maven.fabricmc.net/" + fabricloaderMavenPath).replaceAll("\\", "/")
            tasks.push({
                url: fabricloaderURL,
                path: path.join(this.libPath, fabricloaderMavenPath),
                sha1: undefined
            })

            //启动库
            const libs: FabricLibIndex[] = [...fabricLoaderIndexJson.launcherMeta.libraries[this.side], ...fabricLoaderIndexJson.launcherMeta.libraries.common]

            for (const lib of libs) {
                const mavenPath: string = mavenToPath(lib.name)
                const url: string = (lib.url + mavenPath).replaceAll("\\", "/")
                tasks.push({
                    url: url,
                    path: path.join(this.libPath, mavenPath),
                    sha1: lib.sha1 || undefined
                })
            }
        }
        else if(this.side === 'server') {
            //服务端收集
            const fabricServerJson = await this.getFabricServerJson()
            for(const lib of fabricServerJson.libraries){
                const mavenPath = mavenToPath(lib.name)
                const url = (lib.url + mavenPath).replaceAll('\\','/')
                tasks.push({
                    url:url,
                    path:path.join(this.libPath,mavenPath),
                    sha1:lib.sha1 || undefined
                })
            }
        }

        if (this.fabricAPIVersion && this.modsDir) {
            const fabricAPI = await this.getFabricAPIDownload(this.fabricAPIVersion)
            if (fabricAPI.game_versions?.includes(this.version)) {
                
                for (const file of fabricAPI.files) {
                    const url = file?.url
                    const sha1 = file?.hashes?.sha1
                    const filename = file.filename

                    tasks.push({
                        url: url,
                        sha1: sha1,
                        path: path.join(this.modsDir, filename)
                    })
                }
            }
        }

        return tasks
    }

    protected async getFabricLoaderIndexJson(fabricVersion: string): Promise<FabricIndexJson> {
        const req = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${this.version}/${fabricVersion}`, {
            responseType: 'json'
        })
        return req.data as FabricIndexJson
    }

    protected async getFabricAPIDownload(fabricAPIVersion: string) {
        const req = await axios.get(`https://api.modrinth.com/v2/project/fabric-api/version/${fabricAPIVersion}`, { responseType: 'json' })
        return req.data
    }

    protected async getFabricServerJson(){
        const req = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${this.version}/${this.fabricVersion}/server/json`)
        return req.data
    }
}