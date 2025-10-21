import fs from 'fs'
import path from 'path'
import { FileNotFoundException } from '../../error.ts'

type ModFileStats = {
    isActive: boolean,
    path: string
}

export default class ModActions {

    public static activeMod(modFile: string): ModFileStats {
        if (!fs.existsSync(modFile)) {
            throw new FileNotFoundException('找不到mod文件', modFile)
        }
        if (modFile.endsWith('.jar.disabled')) {
            fs.renameSync(modFile, modFile.replace('.jar.disable', '.jar'))
        }
        return {
            isActive: true,
            path: modFile
        }
    }

    public static deactiveMod(modFile: string): ModFileStats {
        if (!fs.existsSync(modFile)) {
            throw new FileNotFoundException('找不到mod文件', modFile)
        }
        if (path.extname(modFile) === '.jar') {
            fs.renameSync(modFile, modFile.replace('.jar', '.jar.disabled'))
        }
        return {
            isActive: false,
            path: modFile
        }
    }

    public static isModActive(modFile: string): boolean {
        if (!fs.existsSync(modFile)) {
            throw new FileNotFoundException('找不到mod文件', modFile)
        }
        return path.extname(modFile) === '.jar'
    }

    public static toggleModActive(modFile: string): ModFileStats {
        if (!fs.existsSync(modFile)) {
            throw new FileNotFoundException('找不到mod文件', modFile)
        }
        if (this.isModActive(modFile)) {
            return this.deactiveMod(modFile)
        } else {
            return this.activeMod(modFile)
        }
    }

    public static activeMods(modFiles: string[]): ModFileStats[] {
        return modFiles.map(file => this.activeMod(file))
    }

    public static deactiveMods(modFiles: string[]): ModFileStats[] {
        return modFiles.map(file => this.deactiveMod(file))
    }

    public static toggleModsActive(modFiles: string[]): ModFileStats[] {
        return modFiles.map(file => this.toggleModActive(file))
    }

}