import wokerpool from 'workerpool'
import fs from 'fs'
import AdmZip from 'adm-zip'
import toml from '@iarna/toml'
import path from 'path'
import crypto from 'crypto'

function sha1Sync(file: string) {
    const buffer = fs.readFileSync(file)
    const hash = crypto.createHash('sha1')
    hash.update(buffer)
    return hash.digest('hex')
}

function parseManifestMF(manifestText: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!manifestText || manifestText.trim() === '') {
        return result;
    }
    const lines = manifestText.split('\n');
    let currentKey = '';
    let currentValue = '';

    for (const line of lines) {
        if (line.trim() === '') {
            continue;
        }
        if (line.startsWith(' ')) {
            currentValue += '\n' + line.trimStart();
        } else {
            if (currentKey) {
                result[currentKey] = currentValue;
            }
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                currentKey = line.substring(0, colonIndex).trim();
                currentValue = line.substring(colonIndex + 1).trim();
            } else {
                console.warn(`Invalid line in manifest: ${line}`);
                currentKey = '';
                currentValue = '';
            }
        }
    }
    if (currentKey) {
        result[currentKey] = currentValue;
    }
    return result;
}

interface ModInfoWithNoHashIdentity {
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

interface ModInfo extends ModInfoWithNoHashIdentity {
    path: string,
    sha1: string,
    isActive: boolean,
    fileName: string,
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
    logoFile: string
}

function forgeModReaderWorker(modJarInstance: AdmZip): ModInfoWithNoHashIdentity {
    const tomlText = modJarInstance.readAsText(modJarInstance.getEntry('META-INF/mods.toml') as AdmZip.IZipEntry, 'utf-8')
    const tomlPsr = toml.parse(tomlText) as unknown
    const forgeModInfo: ForgeModTomlLike = tomlPsr as ForgeModTomlLike
    const mainMod = forgeModInfo.mods[0]
    const mainID = mainMod.modId

    let iconData: Buffer | null = null

    if (mainMod.logoFile && modJarInstance.getEntry(mainMod.logoFile)) {
        iconData = modJarInstance.readFile(modJarInstance.getEntry(mainMod.logoFile) as AdmZip.IZipEntry) || null
    }
    else if (forgeModInfo.logoFile && modJarInstance.getEntry(forgeModInfo.logoFile)) {
        iconData = modJarInstance.readFile(modJarInstance.getEntry(forgeModInfo.logoFile) as AdmZip.IZipEntry) || null
    }

    //兼容 虽然我也不知道为什么很多mod要这样写
    if (mainMod.version === '${file.jarVersion}') {
        const mfEntry = modJarInstance.getEntry('META-INF/MANIFEST.MF')
        if (mfEntry) {
            const mfString: string = modJarInstance.readAsText(mfEntry, 'utf8')
            const mfObject: Record<string, string> = parseManifestMF(mfString)
            const implementationVersion = mfObject['Implementation-Version']
            if (implementationVersion) {
                mainMod.version = implementationVersion
            }
        }
    }

    const modInfo: ModInfoWithNoHashIdentity = {
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

function fabricModReaderWorker(modJarInstance: AdmZip): ModInfoWithNoHashIdentity {
    const fabricIndexJson = JSON.parse(modJarInstance.readAsText(modJarInstance.getEntry('fabric.mod.json') as AdmZip.IZipEntry, 'utf-8'))
    const iconEntry = fabricIndexJson.icon || null
    let iconData: Buffer | null = null

    if (iconEntry && modJarInstance.getEntry(iconEntry)) {
        iconData = modJarInstance.readFile(modJarInstance.getEntry(iconEntry) as AdmZip.IZipEntry) || null
    }
    const modInfo: ModInfoWithNoHashIdentity = {
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
    const sha1 = sha1Sync(modJarPath)
    const isActive = path.extname(modJarPath) === '.jar'
    const fileName = path.basename(modJarPath).replace(path.extname(modJarPath), '')
    try {
        const modJarInstance = new AdmZip(modJarPath)
        if (modJarInstance.getEntry('META-INF/mods.toml')) {
            //forge mod
            return {
                ...forgeModReaderWorker(modJarInstance),
                sha1: sha1,
                path: modJarPath,
                isActive: isActive,
                fileName: fileName
            }
        }
        else if (modJarInstance.getEntry('fabric.mod.json')) {
            //fabric mod
            return {
                ...fabricModReaderWorker(modJarInstance),
                sha1: sha1,
                path: modJarPath,
                isActive: isActive,
                fileName: fileName
            }
        }
        else throw new Error("未知的模组类型")
    } catch (error) {
        console.warn(modJarPath, error)
        const displayName = path.basename(modJarPath).replace(path.extname(modJarPath), '')
        return {
            icon: null,
            modId: displayName,
            version: '',
            displayName: displayName,
            name: displayName,
            description: '',
            authors: [],
            dependencies: [],
            loader: '',
            license: "unknown",
            sha1: sha1,
            path: modJarPath,
            isActive: isActive,
            fileName: fileName
        }
    }
}

wokerpool.worker({
    fabricModReaderWorker,
    forgeModReaderWorker,
    modReaderWorker
})