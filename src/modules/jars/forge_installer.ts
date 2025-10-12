import path from "path";
import { existify } from "../../utils/io.ts";
import admZip from "adm-zip";
import EventEmitter from "events";
import DownloadTask from "../../downloader/downloadtask.ts";

interface ForgeInstallerGetterOptions {
  versionPath: string;
  version: string;
  forgeVersion: string;
}

export default class GetForgeInstaller extends EventEmitter {

    public forgeInstallWorkDir:string
    public versionPath:string
    public version:string
    public forgeVersion:string

  constructor({
    versionPath,
    version,
    forgeVersion,
  }: ForgeInstallerGetterOptions) {
    super();
    this.versionPath = versionPath
    this.version = version
    this.forgeVersion = forgeVersion
    this.forgeInstallWorkDir = existify(versionPath,'.forge')
  }
  public async getInstaller() {

    const forgeInstallerJar = path.join(this.forgeInstallWorkDir,'installer.jar')
    const downloadTask = new DownloadTask([`https://bmclapi2.bangbang93.com/forge/download?mcversion=${this.version}&version=${this.forgeVersion}&category=installer&format=jar`],forgeInstallerJar,undefined,true)

    downloadTask.on('progress',(p:number)=>{
        this.emit('progress',p)
    })

    downloadTask.on('speed',(s:number)=>{
        this.emit('speed',s)
    })

    await downloadTask.download()

    this.emit('progress',1)
    this.emit('speed',0)
    
    downloadTask.removeAllListeners()
    this.removeAllListeners()
    downloadTask.close()

    //解压
    const jar = new admZip(forgeInstallerJar)
    const unpack = existify(this.forgeInstallWorkDir,'unpack')
    jar.extractAllTo(unpack)

  }
}
