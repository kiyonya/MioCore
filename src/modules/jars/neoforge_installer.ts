import path from "path";
import { existify } from "../../utils/io.ts";
import admZip from "adm-zip";
import EventEmitter from "events";
import DownloadTask from "../../downloader/downloadtask.ts";
interface NeoForgeInstallerGetterOptions {
  versionPath: string;
  version: string;
  neoforgeVersion: string;
}

export default class GetNeoForgeInstaller extends EventEmitter {

    public neoforgeInstallWorkDir:string
    public versionPath:string
    public version:string
    public neoforgeVersion:string

  constructor({
    versionPath,
    version,
    neoforgeVersion,
  }: NeoForgeInstallerGetterOptions) {
    super();
    this.versionPath = versionPath
    this.version = version
    this.neoforgeVersion = neoforgeVersion
    this.neoforgeInstallWorkDir = existify(versionPath,'.neoforge')
  }
  public async getInstaller() {

    const neoforgeInstallerJar = path.join(this.neoforgeInstallWorkDir,'installer.jar')
    const downloadTask = new DownloadTask([`https://bmclapi2.bangbang93.com/neoforge/version/${this.neoforgeVersion}/download/installer.jar`],neoforgeInstallerJar,undefined,true)

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
    const jar = new admZip(neoforgeInstallerJar)
    const unpack = existify(this.neoforgeInstallWorkDir,'unpack')
    jar.extractAllTo(unpack)

  }
}
