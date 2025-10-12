import AdmZip from "adm-zip";
import { existify, mavenToPath, objectToManifest } from "../../../utils/io.ts";
import axios from "axios";
import path from "path";
import fs from 'fs'

interface FabricServerInstallerOptions {
    serverPath: string
    version: string
    fabricVersion: string
    serverJarPath: string
}

export default class FabricServerInstaller {


    public serverPath: string
    public version: string
    public fabricVersion: string
    public serverJarPath: string

    constructor(options: FabricServerInstallerOptions) {
        this.serverPath = options.serverPath
        this.version = options.version
        this.fabricVersion = options.fabricVersion
        this.serverJarPath = options.serverJarPath

    }

    public async install() {

        const fabricServerJson = await this.getFabricServerJson()
        const classPaths: string[] = []

        for (const lib of fabricServerJson.libraries) {
            const mavenPath = mavenToPath(lib.name)
            const cp = path.join('libraries', mavenPath).replaceAll('\\', '/')
            classPaths.push(cp)
        }

        const manifestObject = {
            'Manifest-Version': '1.0',
            'Main-Class': 'net.fabricmc.loader.impl.launch.server.FabricServerLauncher',
            'Class-Path': classPaths
        }

        const manifest = objectToManifest(manifestObject)
        const launchProperties = `launch.mainClass=${fabricServerJson.mainClass}`

        const jar = new AdmZip()
        jar.addFile('fabric-server-launch.properties', Buffer.from(launchProperties))
        jar.addFile('META-INF/MANIFEST.MF', Buffer.from(manifest))

        const jarBuffer = jar.toBuffer()
        fs.writeFileSync(path.join(this.serverPath, 'setup.jar'), jarBuffer)

        const fabricLauncherProperties = `#${new Date().toUTCString()}\n#Have Fun:>\nserverJar=${path.basename(this.serverJarPath)}`

        fs.writeFileSync(path.join(this.serverPath, 'fabric-server-launcher.properties'), fabricLauncherProperties, 'utf8')

        //生成启动bat
        const bat = 'java -jar setup.jar\npause'
        fs.writeFileSync(path.join(this.serverPath, 'setup.bat'), bat, 'utf-8')
    }

    protected async getFabricServerJson() {
        const req = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${this.version}/${this.fabricVersion}/server/json`)
        return req.data
    }
}