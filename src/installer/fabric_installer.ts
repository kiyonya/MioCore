import axios from "axios"
import { mavenToPath } from "../utils/io.ts"
import path from "path"

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

interface FabricInstallOptions {
    fabricVersion:string,
    side:'client' | 'server',
    libPath:string,
    version:string
}


export default class FabricInstaller {
    public fabricVersion: string
    public side: 'client' | 'server'
    public libPath: string
    public version: string

    constructor(options:FabricInstallOptions) {
        this.fabricVersion = options.fabricVersion
        this.side = options.side
        this.libPath = options.libPath
        this.version = options.version
    }

    public async install() {
        const fabricLoaderJson = await this.getFabricLoaderIndexJson(this.fabricVersion)


        const versionFrag: {
            libraries: any[],
            mainClass: string
        } = {
            libraries: [],
            mainClass: fabricLoaderJson.launcherMeta.mainClass[this.side]
        }

        //调解人库
        const intermediaryMavenPath = mavenToPath(fabricLoaderJson.intermediary.maven)
        const intermediaryURL = ("https://maven.fabricmc.net/" + intermediaryMavenPath).replaceAll("\\", "/")
        versionFrag.libraries.push({
            name: fabricLoaderJson.intermediary.maven,
            url: "https://maven.fabricmc.net/",
            sha1: undefined,
            downloads: {
                artifact: {
                    path: intermediaryMavenPath.replaceAll("\\", '/'),
                    sha1: undefined,
                    size: 0,
                    url: intermediaryURL
                }
            },
        })

        //加载器库
        const fabricloaderMavenPath = mavenToPath(fabricLoaderJson.loader.maven)
        const fabricloaderURL = ("https://maven.fabricmc.net/" + fabricloaderMavenPath).replaceAll("\\", "/")
        versionFrag.libraries.push({
            name: fabricLoaderJson.loader.maven,
            url: "https://maven.fabricmc.net/",
            sha1: undefined,
            downloads: {
                artifact: {
                    path: fabricloaderMavenPath.replaceAll("\\", '/'),
                    sha1: undefined,
                    size: 0,
                    url: fabricloaderURL
                }
            },
        })

        //依赖库
        const libs: FabricLibIndex[] = [...fabricLoaderJson.launcherMeta.libraries[this.side], ...fabricLoaderJson.launcherMeta.libraries.common]
        for (const lib of libs) {
            const mavenPath = mavenToPath(lib.name)
            versionFrag.libraries.push({
                ...lib,
                downloads: {
                    artifact: {
                        path: mavenPath.replaceAll("\\", '/'),
                        sha1: lib.sha1,
                        size: lib.size,
                        url: (lib.url + mavenPath).replaceAll("\\", '/')
                    }
                },
            })
        }
        return versionFrag
    }

    protected async getFabricLoaderIndexJson(fabricVersion: string): Promise<FabricIndexJson> {
        const req = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${this.version}/${fabricVersion}`, {
            responseType: 'json'
        })
        return req.data as FabricIndexJson
    }
}