import fs from 'fs'
import path from 'path'
import { checkOSRules } from '../../utils/os.ts';
import { existify, mavenToPath } from '../../utils/io.ts';
import Request from '../../utils/request.ts';
import HashUtil from '../../utils/hash.ts';

type MinecraftAssetsObject = {
    hash: string;
    size: number;
};

interface CheckFileOptions {
    libPath: string,
    assetsPath: string
    versionJsonPath: string,
    minecraftJar: string,
}

interface MinecraftLib {
    name: string;
    downloads?: {
        artifact?: {
            path: string;
            sha1?: string;
            size?: number;
            url: string;
        };
        classifiers?: {
            [key: string]: {
                path: string;
                sha1?: string;
                size?: number;
                url: string;
            };
        };
    };
    rules?: {
        os: {
            name: "osx" | "linux" | "windows";
        };
        action?: string;
    }[];
    url?:string
}

interface MinecraftVersionJson {
    id?: string
    modLoader?: { [key: string]: string } | null
    libraries: MinecraftLib[];
    downloads: {
        client?: {
            sha1: string;
            size: number;
            url: string;
        };
        server?: {
            sha1: string;
            size: number;
            url: string;
        };
        client_mappings: any,
        server_mappings: any,
    };
    assetIndex: {
        id: string;
        sha1: string;
        size: number;
        totalSize: number;
        url: string;
    };
    javaVersion: {
        majorVersion: number,
    },
    clientVersion?: string,
    inheritsFrom?: string
}

export async function checkFiles({ versionJsonPath, libPath, assetsPath, minecraftJar }: CheckFileOptions): Promise<{ url?: string, path: string, sha1?: string }[]> {
    if (!fs.existsSync(versionJsonPath)) {
        throw new Error('No VersionJson')
    }
    const versionJson: MinecraftVersionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))

    const assetsIndexesPath = existify(assetsPath, 'indexes')
    const assetsObjectsPath = existify(assetsPath, 'objects')

    const willCheck: { url?: string, path: string, sha1?: string }[] = []

    const assetsId = versionJson.assetIndex.id
    const assetsIndexJsonPath = path.join(assetsIndexesPath, `${assetsId}.json`)

    if (!fs.existsSync(assetsIndexJsonPath)) {
        const assetsJsonDownloadURL = versionJson.assetIndex.url
        const req = await Request.get(assetsJsonDownloadURL, { responseType: 'json' })
        fs.writeFileSync(assetsIndexJsonPath, JSON.stringify(req.data as any), 'utf-8')
    }

    const assetsJson: { objects: { [key: string]: MinecraftAssetsObject } } = JSON.parse(fs.readFileSync(assetsIndexJsonPath, 'utf-8'))

    for (const [sha1, value] of Object.entries(assetsJson.objects)) {
        const hash = value.hash
        willCheck.push({
            url: `https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`,
            path: path.join(assetsObjectsPath, hash.slice(0, 2), hash),
            sha1: hash
        })
    }

    const requiredLibs = versionJson.libraries.filter(lib => checkOSRules(lib.rules))
    for (const lib of requiredLibs) {
        //support libs
        if (lib.downloads?.artifact) {
            willCheck.push({
                url: lib.downloads?.artifact?.url || (lib.url + mavenToPath(lib.name)).replaceAll('\\','/'),
                path: path.join(libPath, mavenToPath(lib.name)),
                sha1: lib.downloads?.artifact?.sha1 || undefined,
            });
        }
        //lwjgl natives
        if (lib.downloads?.classifiers) {
            for (let natives of Object.values(lib.downloads.classifiers)) {
                willCheck.push({
                    path: path.join(libPath, natives.path),
                    url: natives.url,
                    sha1: natives.sha1,
                });
            }
        }
    }

    willCheck.push({
        url: versionJson.downloads.client?.url,
        sha1: versionJson.downloads.client?.sha1,
        path: minecraftJar
    })

    return willCheck.filter(file => !isFileValid(file.path, file.sha1))

}

function isFileValid(path: string, sha1?: string): boolean {
    if (!fs.existsSync(path)) {
        return false
    }
    if (!sha1) { return true }
    else {
        const fileSha1 = HashUtil.sha1Sync(path)
        if (fileSha1 === sha1) {
            return true
        }
        else {
            return false
        }
    }
}