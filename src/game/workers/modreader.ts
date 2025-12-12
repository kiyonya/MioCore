import wokerpool from 'workerpool'
import fs from 'fs'
import AdmZip from 'adm-zip'
import toml from 'toml'

interface ModInfo {
    name: string
    modId: string
    version: string
    description: string
    authors: string[]
    dependencies: string[]
    displayName: string
    icon: Buffer | null
    loader: string
    license: string
}
interface ForgeModTomlLike {
    mods: Array<{
        modId: string
        version: string
        displayName: string
        description: string
        authors: string
        logoFile: string
    }>
    dependencies: Record<string, Array<{
        modId: string
        mandatory: boolean
        versionRange: string
        ordering: string
        side: string
        versionEndInclusive?: boolean
    }>>
    license: string
    loaderVersion: string
    modLoader: string
}

function forgeModReaderWorker(modJarInstance: AdmZip): null | ModInfo {
    const tomlText = modJarInstance.readAsText(modJarInstance.getEntry('META-INF/mods.toml') as AdmZip.IZipEntry, 'utf-8')
    const forgeModInfo: ForgeModTomlLike = toml.parse(tomlText)
    const mainMod = forgeModInfo.mods[0]
    const mainID = mainMod.modId

    const iconPath = mainMod.logoFile ? mainMod.logoFile : null
    let iconData: Buffer | null = null

    if (iconPath && modJarInstance.getEntry(iconPath)) {
        iconData = modJarInstance.readFile(modJarInstance.getEntry(iconPath) as AdmZip.IZipEntry) || null
    }
    const modInfo: ModInfo = {
        name: mainMod.displayName,
        modId: mainID,
        version: mainMod.version,
        description: mainMod.description,
        authors: (mainMod.authors && typeof mainMod.authors === 'string') ? mainMod?.authors?.split(',').map(i => i.trim()) : [],
        dependencies: forgeModInfo?.dependencies?.[mainID] ? forgeModInfo.dependencies[mainID].map(i => i.modId) : [],
        displayName: mainMod.displayName,
        icon: iconData,
        loader: forgeModInfo.modLoader,
        license: forgeModInfo.license || ''
    }
    return modInfo
}

function fabricModReaderWorker(modJarInstance: AdmZip): null | ModInfo {
    const fabricIndexJson = JSON.parse(modJarInstance.readAsText(modJarInstance.getEntry('fabric.mod.json') as AdmZip.IZipEntry, 'utf-8'))
    const iconEntry = fabricIndexJson.icon || null
    let iconData: Buffer | null = null

    if (iconEntry && modJarInstance.getEntry(iconEntry)) {
        iconData = modJarInstance.readFile(modJarInstance.getEntry(iconEntry) as AdmZip.IZipEntry) || null
    }
    const modInfo: ModInfo = {
        name: fabricIndexJson.name,
        modId: fabricIndexJson.id,
        version: fabricIndexJson.version,
        description: fabricIndexJson.description || '',
        authors: fabricIndexJson.authors || [],
        dependencies: fabricIndexJson.depends ? Object.keys(fabricIndexJson.depends) : [],
        displayName: fabricIndexJson.name,
        icon: iconData,
        loader: 'fabric',
        license: fabricIndexJson.license || ''
    }
    return modInfo
}

function modReaderWorker(modJarPath: string): null | ModInfo {
    if (!fs.existsSync(modJarPath)) {
        {
            return null
        }
    }
    const modJarInstance = new AdmZip(modJarPath)
    if (modJarInstance.getEntry('META-INF/mods.toml')) {
        //forge mod
        return forgeModReaderWorker(modJarInstance)
    }
    else if (modJarInstance.getEntry('fabric.mod.json')) {
        //fabric mod
        return fabricModReaderWorker(modJarInstance)
    }
    return null
}

wokerpool.worker({
    fabricModReaderWorker,
    forgeModReaderWorker,
    modReaderWorker
})