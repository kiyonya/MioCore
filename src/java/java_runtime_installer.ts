
import os from 'os'
import fs from 'fs'
import { existify } from "../utils/io.ts";
import axios from "axios";
import path from "path";
import ConcDownloader from "../downloader/downloader.ts";
import DownloadTask from "../downloader/downloadtask.ts";

export interface JavaRuntimeManifest {
    sha1: string;
    size: number;
    url: string;
}

export interface JavaRuntimeVersion {
    name: string;
    released: string;
}

export interface JavaRuntimeAvailability {
    group: number;
    progress: number;
}

export interface JavaRuntimeEntry {
    availability: JavaRuntimeAvailability;
    manifest: JavaRuntimeManifest;
    version: JavaRuntimeVersion;
}

export interface MinecraftJavaExeEntry {
    availability: JavaRuntimeAvailability;
    manifest: JavaRuntimeManifest;
    version: {
        name: string;
        released: string;
    };
}

export interface PlatformRuntimes {
    "java-runtime-alpha": JavaRuntimeEntry[];
    "java-runtime-beta": JavaRuntimeEntry[];
    "java-runtime-delta": JavaRuntimeEntry[];
    "java-runtime-gamma": JavaRuntimeEntry[];
    "java-runtime-gamma-snapshot": JavaRuntimeEntry[];
    "jre-legacy": JavaRuntimeEntry[];
    "minecraft-java-exe": MinecraftJavaExeEntry[];
    'java-runtime-epsilon': JavaRuntimeEntry[];
}

export interface MinecraftJavaRuntimes {
    gamecore: PlatformRuntimes;
    linux: PlatformRuntimes;
    "linux-i386": PlatformRuntimes;
    "mac-os": PlatformRuntimes;
    "mac-os-arm64": PlatformRuntimes;
    "windows-arm64": PlatformRuntimes;
    "windows-x64": PlatformRuntimes;
    "windows-x86": PlatformRuntimes;
}

export interface DownloadItem {
    url: string,
    sha1: string,
    size: string
}

interface JavaRuntimeManifestList {

    files: { [key: string]: { type: 'directory' | 'file', downloads?: { lzma: DownloadItem, raw: DownloadItem } } }
}

type OSIndex = 'linux-i386' | 'mac-os' | "mac-os-arm64" | "windows-arm64" | "windows-x64" | "windows-x86" | 'linux'

type RuntimeVersion = "java-runtime-alpha" | "java-runtime-beta" | "java-runtime-delta" | "java-runtime-gamma" | "java-runtime-gamma-snapshot" | "jre-legacy" | "minecraft-java-exe" | 'java-runtime-epsilon'

export default class JavaRuntimeInstaller extends ConcDownloader {

    public version: RuntimeVersion
    public javaInstallPath: string
    public osIndex: OSIndex

    constructor(version: RuntimeVersion, javaInstallPath: string, osIndex?: OSIndex) {
        super(16)
        this.version = version
        this.osIndex = osIndex || this.getPlatform()
        this.javaInstallPath = existify(javaInstallPath)
    }

    public async install() {
        const javaList = await this.getMojangJavaList()
        const javaEntry = javaList[this.osIndex][this.version]?.[0]
        const manifestURL = javaEntry.manifest?.url
        const javaManifest = await this.getMojangJavaManifest(manifestURL)

        const tasks: {
            url: string,
            sha1?: string,
            path: string
        }[] = []

        for (const [dpath, value] of Object.entries(javaManifest.files)) {
            if (value.type === 'file' && value.downloads) {
                const filepath = path.join(this.javaInstallPath, dpath)
                const url = value.downloads.raw.url
                const sha1 = value.downloads.raw.sha1
                tasks.push({ url, sha1, path: filepath })
            }
        }

        for (const task of tasks) {
            this.add(new DownloadTask([task.url], task.path, task.sha1))
        }
        await this.download()
        return this.javaInstallPath
    }

    protected async getMojangJavaList(): Promise<MinecraftJavaRuntimes> {
        const resp = await axios.get('https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json', {
            responseType: 'json'
        })
        return resp.data as MinecraftJavaRuntimes
    }

    protected async getMojangJavaManifest(manifestURL: string): Promise<JavaRuntimeManifestList> {
        const resp = await axios.get(manifestURL, {
            responseType: 'json'
        })
        return resp.data as JavaRuntimeManifestList
    }

    protected getPlatform() {
        const platform = os.platform();
        const arch = os.arch();

        if (platform === 'linux') {
            if (arch === 'ia32') {
                return 'linux-i386';
            }
            else {
                return 'linux'
            }
        } else if (platform === 'darwin') {
            return arch === 'arm64' ? 'mac-os-arm64' : 'mac-os';
        } else if (platform === 'win32') {
            if (arch === 'x64') {
                return 'windows-x64';
            } else if (arch === 'arm64') {
                return 'windows-arm64';
            } else if (arch === 'ia32') {
                return 'windows-x86';
            }
        }

        throw new Error('Unsupported platform or architecture');
    }

    public override async abort() {
        super.abort()
        console.log("java下载已暂停")
        try {
            fs.rmSync(this.javaInstallPath, { recursive: true, force: true })
            console.log("已清除下载的java")
        } catch (error) {
            console.error("无法删除")
        }
        this.close()
    }
}