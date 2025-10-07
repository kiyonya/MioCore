import axios from "axios"

interface InstallQuiltOptions {
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

export default class QuiltInstaller{
    public libPath:string
    public quiltVersion:string
    public version:string

    constructor(options:InstallQuiltOptions) {
        this.libPath = options.libPath
        this.quiltVersion = options.quiltVersion
        this.version = options.version
    }

    public async install(){
        const quiltVersionJson = await this.getQuiltVersionJson()
        return quiltVersionJson
    }

     protected async getQuiltVersionJson():Promise<QuiltVersionJson>{
        const req = await axios.get(`https://meta.quiltmc.org/v3/versions/loader/${this.version}/${this.quiltVersion}/profile/json`)
        return req.data as QuiltVersionJson
    }

}