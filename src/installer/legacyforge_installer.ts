import EventEmitter from "events";
import path from "path";
import fs from 'fs'

interface LegacyForgeInstallOptions {
    libPath: string,
    forgeWorkDir: string
    side: 'client' | 'server'
}

export default class LegacyForgeInstaller extends EventEmitter {

    public libPath: string
    public forgeWorkDir: string
    public forgeUnpackDir: string
    public side: 'server' | 'client'

    constructor(options: LegacyForgeInstallOptions) {
        super()
        this.libPath = options.libPath
        this.forgeWorkDir = options.forgeWorkDir
        this.forgeUnpackDir = path.join(options.forgeWorkDir, 'unpack')
        this.side = options.side
    }

    public async install() {

        const installProfileJsonPath = path.join(this.forgeUnpackDir, 'install_profile.json')
        const installProfileJson = JSON.parse(fs.readFileSync(installProfileJsonPath, 'utf-8'))
        let versionInfo = installProfileJson.versionInfo
        this.emit('progress',1)
        this.removeAllListeners()
        return versionInfo

    }
}