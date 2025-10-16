import path from "path";
import Server from "./src/server.ts";
import Modpack from "./src/modpack.ts";
import Client from "./src/client.ts";
import JavaRuntimeInstaller from "./src/modules/installer/jrt_installer.ts";
import ClientLauncher from "./src/launch.ts";
import CrashAnalyzer from "./src/modules/check/crash_analyzer.ts";
import JSONIO from "./src/utils/jsonIO.ts";
import ResourcesPool from "./src/modules/game/resources_storage.ts";


class MioCore {
    static ClientInstaller = Client
    static ServerInstaller = Server
    static ModpackInstaller = Modpack
}

process.stdin.resume()

function logProgress(progress: { [key: string]: number }, maxLen = 40) {
    console.clear()
    for (const [key, value] of Object.entries(progress)) {
        const done = Math.floor(value * maxLen)
        console.log(`%c${key}\n 📦${(value * 100).toFixed(1)}% | ${"█".repeat(done)}${"░".repeat(maxLen - done)}`, 'color:white')
    }
}

async function installserver() {
    const installer = new MioCore.ServerInstaller({
        version: '1.21.1',
        serverPath: path.resolve("D:/Project/mcserver"),
        name: 'myserver',
        modLoader: {
            neoforge: '21.1.209'
        }
    })

    await installer.install()
}

async function installModPack() {
    const is = new MioCore.ModpackInstaller({
        versionIsolation: true,
        minecraftPath: path.resolve('.minecraft'),
        name: 'Journey of Reincarnation'
    })

    is.on('progress', (progress) => {
        logProgress(progress)
    })

    is.on('speed', (speed) => {
        console.log((speed / 1024 / 1024).toFixed(1), "MB/s")
    })

    const modpack = ''
    await is.install('C:/Users/lenovo/Downloads/Journey of Reincarnation-Release-1.2.0.zip')
}

async function installModPackByURL() {
    const modpackInstaller = new MioCore.ModpackInstaller({
        versionIsolation: true,
        minecraftPath: path.resolve('.minecraft'),
        name: 'Slimes Adventure'
    })

    modpackInstaller.on('progress', (progress) => {
        logProgress(progress)
    })

    modpackInstaller.on('speed', (speed) => {
        console.log((speed / 1024 / 1024).toFixed(3), "MB/s")
    })

    await modpackInstaller.installFromURL("https://cdn.modrinth.com/data/8yKzGJOG/versions/bSPdKEca/Slimes%20AdventureRE%201.8.2.mrpack")
}

async function jvmi() {
    const jin = new JavaRuntimeInstaller('java-runtime-delta', './java/21', 'linux')
    jin.on('progress', console.log)
    await jin.install()
}


// console.log(Mirror.getMirrors("https://libraries.minecraft.net/com/mojang/logging/1.0.0/logging-1.0.0.jar",false))



function docrash() {
    const csa = new CrashAnalyzer("D:/Program/Minecraft/.minecraft/versions/养老/crash-reports/crash-2025-06-10_22.29.34-client.txt")

    csa.analyse()
}


async function installClient() {
    const clientInstaller = new MioCore.ClientInstaller({
        versionIsolation: true,
        minecraftPath: path.resolve('.minecraft'),
        name: '1.9.4-legacy',
        version: '1.9.4',
        modLoader: {
            forge: '12.17.0.2317-1.9.4'
        }
    }).on('progress', (progress) => {
        logProgress(progress)
    }).on('speed', (speed) => {
        console.log((speed / 1024 / 1024).toFixed(1), "MB/s")
    })

    await clientInstaller.install()
}

async function launch() {

    
    const launcher = new ClientLauncher({
        minecraftPath: path.resolve('.minecraft'),
        versionIsolation: true,
        name: 'MinimalCreate'
    }, {
        useLaunchLanguage: 'zh_cn',
        useGamaOverride: true,
        title: '自定义游戏名称'
    })

    launcher.on('stdout', (str) => console.log(str))
    launcher.on('stderr', (err) => { console.log("游戏报错" + err) })
    launcher.on('crash', (code, signal) => { console.log('游戏崩溃了');launcher.removeAllListeners() })
    launcher.on('failed', (err) => { console.log("无法启动" + err);launcher.removeAllListeners() })
    launcher.on('close', (code, signal) => { console.log("游戏正常退出"); launcher.removeAllListeners() })

    await launcher.launch({
        username: 'Homo',
        accessToken: '0d00',
        uuid: crypto.randomUUID().replaceAll('-', '')
    })
}

launch()