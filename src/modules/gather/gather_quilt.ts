//https://meta.quiltmc.org/v3/versions/loader/1.20.1/0.17.10/profile/json

import path from "path"
import { mavenToPath } from "../../utils/io.ts"
import axios from "axios"

interface GatherQuiltOptions {
    libPath:string,
    quiltVersion:string,
    version:string
}

interface QuiltVersionJson {
    id:string,
    mainClass:string,
    inheritsFrom:string,
    libraries:{
        url:string,
        name:string
    }[]
}

interface DownloadTaskItem {
    url: string;
    sha1?: string;
    path: string;
    type?: string;
}

export default class QuiltGather {

    public libPath:string
    public quiltVersion:string
    public version:string

    constructor(options:GatherQuiltOptions) {
        this.libPath = options.libPath
        this.quiltVersion = options.quiltVersion
        this.version = options.version
    }

    public async gather(){

        const quiltVersionJson = await this.getQuiltVersionJson()
        const tasks:DownloadTaskItem[] = []

        for(const lib of quiltVersionJson.libraries){
            const mavenPath = mavenToPath(lib.name)
            const libURL = (lib.url + mavenPath).replaceAll('\\',"/")
            tasks.push({
                url:libURL,
                path:path.join(this.libPath,mavenPath),
                sha1:undefined
            })
        }

        return tasks
    }
    
    protected async getQuiltVersionJson():Promise<QuiltVersionJson>{
        const req = await axios.get(`https://meta.quiltmc.org/v3/versions/loader/${this.version}/${this.quiltVersion}/profile/json`)
        return req.data as QuiltVersionJson

    }
}