import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

import HashUtil from '../../utils/hash.ts'
import { DirNotFoundException } from '../../error.ts'
import pLimit from 'p-limit'
import JSONIO from '../../utils/jsonIO.ts'

import ini from 'ini'
import INI from '../../utils/ini.ts'
import { type MMLDataJson } from '../../types/index.ts'
import { existify } from '../../utils/io.ts'

type InstanceInfoStruct = {
    icon?: string,
    name: string,
    path: string,
    modsCount?: number,
    modLoaders?: Record<string, string> | null,
    ok?: boolean,
    installTime:number
}



export default abstract class InstanceUtil {

    /**
     * 
     * @param versionsPath minecraft目录下的versions文件夹目录,string
     */
    public static async getInstanceFrom(versionsPath: string) {
        const instanceDirs = fs.readdirSync(versionsPath).filter(instanceName => fs.existsSync(path.join(versionsPath, instanceName, `${instanceName}.json`))).map(i => path.join(versionsPath, i))

        for (const instanceDir of instanceDirs) {
            this.getInstanceOf(instanceDir)
        }
    }

    public static async getInstanceOf(instanceDir: string) {
        const instanceName = path.basename(instanceDir)
        const instanceInfo: InstanceInfoStruct = {
            name: instanceName,
            path: instanceDir,
            modsCount: 0,
            installTime:-1
        }

        existify(instanceDir, 'MML')
        const MMLDataJsonPath = path.join(instanceDir, 'MML', 'data.json')

        if (fs.existsSync(MMLDataJsonPath)) {
            const mmlDataJson: MMLDataJson = new JSONIO(MMLDataJsonPath).open().toObject() as MMLDataJson
            const modLoader = mmlDataJson['modLoader'] || null
            instanceInfo.installTime = mmlDataJson.installTime
        }
        else if (fs.existsSync(path.join(instanceDir, 'PCL', 'Setup.ini'))) {
            const MMLDataJson = this.getMMLDataFromPCL(instanceDir, path.join(instanceDir, 'PCL', 'Setup.ini'))
            fs.writeFileSync(MMLDataJsonPath, JSON.stringify(MMLDataJson, null, 4), 'utf-8')
            instanceInfo.modLoaders = MMLDataJson.modLoader
            instanceInfo.installTime = MMLDataJson.installTime
        }
        //模组统计
        if (fs.existsSync(path.join(instanceDir, 'mods'))) {
            instanceInfo.modsCount = this.getModFilesOf(path.join(instanceDir, 'mods')).length
        }
        //截图统计
        if(fs.existsSync(path.join(instanceDir,'screenshots'))){
            
        }

    }

    public static getModFilesOf(modsDir: string, ignoreDisabled: boolean = false,) {
        if (!fs.existsSync(modsDir)) {
            throw new DirNotFoundException("mods文件夹不存在", modsDir)
        }
        let mods = fs.readdirSync(modsDir).filter(f => ['.jar', ...ignoreDisabled ? [".disabled"] : []].includes(path.extname(f))).map(i => path.join(modsDir, i))
        return mods
    }

    protected static getMMLDataFromPCL(instanceDir: string, PCLSetupINI: string): MMLDataJson {
        const PCLSetup = INI.parse(fs.readFileSync(PCLSetupINI, 'utf-8'))

        const versionName = path.basename(instanceDir)
        const versionJson = path.join(instanceDir, `${versionName}.json`)
        const installTime = fs.statSync(versionJson).birthtime.getTime()

        let transformedModLoader: Record<string, string> | null = {}

        const MMLDataJson: MMLDataJson = {
            version: PCLSetup.VersionOriginal as string,
            name: versionName,
            mmlVersion: 1,
            installTime: installTime,
            installTimeUTC: new Date(installTime).toUTCString()
        }

        const PCLReadKey = {
            VersionForge: "forge",
            VersionFabric: "fabric",
            VersionOptifine: "optifine",
            VersionNeoForge: "neoforge",
        }

        for (const [key, mapV] of Object.entries(PCLReadKey)) {
            if (PCLSetup[key]) {
                transformedModLoader[mapV] = PCLSetup[key] as string
            }
        }

        if (!Object.keys(transformedModLoader).length) { transformedModLoader = null }
        MMLDataJson.modLoader = transformedModLoader

        return MMLDataJson
    }
}