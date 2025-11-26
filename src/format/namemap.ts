

export type MojangJavaOSIndex = 'linux-i386' | 'mac-os' | "mac-os-arm64" | "windows-arm64" | "windows-x64" | "windows-x86" | 'linux'

export type MojangNativePlatform = 'linux' | 'osx' | 'windows'

export default abstract class NameMap {
    public static getMojangJavaOSIndex(platform: NodeJS.Platform, arch: NodeJS.Architecture): MojangJavaOSIndex {
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

    public static getMojangNativePlatform(platform: NodeJS.Platform):MojangNativePlatform {
        if (platform === 'linux') { return 'linux' }
        else if (platform === 'darwin') { return 'osx' }
        else if (platform === 'win32') { return 'windows' }
        throw new Error('Unsupported platform');
    }

    public static getArchBit(arch:NodeJS.Architecture):"64" | "32"{
        if(arch === 'arm64' || arch === 'loong64' || arch === 'x64' || arch ==='ppc64' || arch === 'riscv64'){return '64'}
        else{
            return '32'
        }
    }
}