import EventEmitter from "events";
import path from "path";
import fs from 'fs'
import { mavenToPath } from "../../utils/io.ts";
import AdmZip from "adm-zip";
import { spawnCommand } from "../../utils/cmd.ts";
import os from 'os'
interface ForgeInstallerOptions {
    forgeWorkDir: string
    libPath: string
    serverPath: string
    serverJarPath: string
    java: string
}
interface InstallProfileForge {
    version: string,
    minecraft: string,
    serverJarPath: string,
    data: { [key: string]: { client: string, server: string } }
    processors: {
        sides?: Array<"server" | "client">
        jar: string,
        classpath: string[],
        args: string[]
    }[],
    icon: string,
    json: string,
    libraries: {
        name: string,
        downloads: {
            artifact?: {
                path: string,
                url: string,
                sha1: string,
                size: number
            }
        }
    }[]
}
interface JVMPatchCommand {
    args: string[],
    mainClass: string,
    cp: string[]
}

export default class ForgeServerInstaller extends EventEmitter {

    public forgeWorkDir: string
    public libPath: string
    public serverPath: string
    public serverJarPath: string
    public java: string
    public side: 'server'

    constructor(options: ForgeInstallerOptions) {
        super()
        this.forgeWorkDir = options.forgeWorkDir
        this.libPath = options.libPath
        this.serverPath = options.serverPath
        this.serverJarPath = options.serverJarPath
        this.java = options.java
        this.side = 'server'
    }


    public async install() {

        const forgeInstallProfileJsonPath = path.join(this.forgeWorkDir, 'unpack', 'install_profile.json')
        const forgeVersionJsonPath = path.join(this.forgeWorkDir, 'unpack', 'version.json')
        if (!fs.existsSync(forgeInstallProfileJsonPath) || !fs.existsSync(forgeVersionJsonPath)) {
            throw new Error('No Install Profile JSON or version JSON found in unpack dir')
        }

        const installProfile: InstallProfileForge = JSON.parse(fs.readFileSync(forgeInstallProfileJsonPath, 'utf-8'))

        const argReplacementMap: Map<string, string> = new Map()
        for (const [k, v] of Object.entries(installProfile.data)) {
            const sideV = v[this.side]
            if (sideV.startsWith("[") && sideV.endsWith("]")) {
                //forge使用[]表示这是一个maven路径
                const file = path.join(this.libPath, mavenToPath(sideV))
                argReplacementMap.set(k, file)
            }
            else if (k === 'BINPATCH') {
                const patchLZMA = path.join(this.forgeWorkDir, 'unpack', sideV)
                argReplacementMap.set(k, patchLZMA)
            }
            else {
                argReplacementMap.set(k, sideV)
            }
        }
        argReplacementMap.set('MINECRAFT_JAR', this.serverJarPath)
        argReplacementMap.set('ROOT', this.serverPath)
        argReplacementMap.set('ServerJarPath', this.serverJarPath)
        argReplacementMap.set('LIBRARY_DIR', this.libPath)
        argReplacementMap.set('INSTALLER',path.join(this.forgeWorkDir,'installer.jar'))

        //接下来获得需要进行的Processor
        const requiredProcessor = installProfile.processors.filter(processor => {
            if (processor.args.includes('DOWNLOAD_MOJMAPS')) { return false }
            if ((!processor.sides || processor.sides.includes(this.side))) { return true }
            return false
        })

        const jvmCommands: JVMPatchCommand[] = []
        for (const processor of requiredProcessor) {

            const mainJAR = path.join(this.libPath, mavenToPath(processor.jar))
            const classPaths = processor.classpath.map(i => path.join(this.libPath, mavenToPath(i)))
            const cp: string[] = [...classPaths, mainJAR]

            const isClasspathExist = cp.every(i => fs.existsSync(i))

            if (!isClasspathExist) {
                throw new Error('CP not exist')
            }

            const mainClass = this.getMainClassFromJar(mainJAR)

            for (let i = 0; i < processor.args.length; i++) {
                const arg = processor.args[i]
                if (typeof arg === 'string') {

                    if (arg.includes("{") && arg.includes("}")) {
                        const replacedArg = arg.replace(/\{([^}]+)\}/g, (match, key) => {
                            const value = argReplacementMap.get(key);
                            return value !== undefined ? value : match;
                        });
                        if (replacedArg !== arg) {
                            processor.args[i] = replacedArg.replaceAll('\\','/');
                        }
                    }
                    else if (arg.startsWith("[") && arg.endsWith("]")) {
                        const file = path.join(this.libPath, mavenToPath(arg))
                        processor.args[i] = file
                    }
                }
            }

            jvmCommands.push({
                cp,
                mainClass,
                args: processor.args
            })
        }

        const isWindows = os.platform() === 'win32'
        //执行
        console.log(jvmCommands)
        for (let i = 0; i < jvmCommands.length; i++) {
            const command = jvmCommands[i]
            const stdout = await spawnCommand(this.java, [
                "-cp",
                command.cp.join(isWindows ? ";" : ":"),
                command.mainClass,
                ...command.args
            ], true)
            this.emit('progress', (i + 1) / jvmCommands.length)
        }
        //完成
        this.emit('progress', 1)
        this.removeAllListeners()

        fs.rmSync(this.forgeWorkDir,{recursive:true,force:true})

    }

    protected getMainClassFromJar(jarFile: string): string {
        if (!fs.existsSync(jarFile)) {
            throw new Error('No Jar File Found:on finding mainclass')
        }
        const jar = new AdmZip(jarFile)
        const manifestEntry = jar.getEntry('META-INF/MANIFEST.MF')

        if (!manifestEntry) {
            throw new Error('No manifest.mf')
        }
        const manifestContent: string = jar.readAsText(manifestEntry, 'utf-8')
        const mainClassLine = manifestContent
            .split('\n')
            .find((line: string) => line.startsWith('Main-Class:'))
        if (!mainClassLine) {
            throw new Error('No mainclass line')
        }
        const mainClass = mainClassLine.split(':')[1].trim()
        return mainClass
    }
}