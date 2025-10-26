import path from "path";
import Server from "./src/server.ts";
import Modpack from "./src/modpack.ts";
import Client from "./src/client.ts";
import ClientLauncher from "./src/launch.ts";
import CrashAnalyzer from "./src/modules/check/crash_analyzer.ts";
import ModrinthAPI from "./src/modules/community/modrinth.ts";
import GameExport from "./src/modules/export/game_export.ts";
import CurseforgeAPI from "./src/modules/community/curseforge.ts";


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
    launcher.on('crash', (code, signal) => { console.log('游戏崩溃了'); launcher.removeAllListeners() })
    launcher.on('failed', (err) => { console.log("无法启动" + err); launcher.removeAllListeners() })
    launcher.on('close', (code, signal) => { console.log("游戏正常退出"); launcher.removeAllListeners() })

    await launcher.launch({
        username: 'Homo',
        accessToken: '0d00',
        uuid: crypto.randomUUID().replaceAll('-', '')
    })
}

ModrinthAPI.Common
ModrinthAPI.Tag

// const exporter = new GameExport({ versionPath: "D:/Program/Minecraft/.minecraft/versions/空岛汉堡店", minecraftPath: "D:/Program/Minecraft/.minecraft", versionIsolation: true })

// const entries = exporter.getInstanceExportEntries()

// exporter.exportToModpack(exporter.createExportEntriesByNames(['mods', 'config', 'kubejs']), 'modrinth', {
//     online: false
// }).then(zip => zip?.writeZip("export.zip"))


const curseforgeAPI = new CurseforgeAPI("")

curseforgeAPI.
