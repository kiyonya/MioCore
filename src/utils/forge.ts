import admZip from "adm-zip";

export function isLegacyForgeInstaller(forgeInstallerJar:string,version:string,forgeVersion:string):boolean {
    const jar = new admZip(forgeInstallerJar)
    if(jar.getEntry(`forge-${version}-${forgeVersion}-universal.jar`)){
        return true
    }
    return false
}