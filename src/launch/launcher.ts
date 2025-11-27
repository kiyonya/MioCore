import os from 'os'
import LaunchWindowsX64 from './launch_windows_x64.ts'
import LaunchWindowsX86 from './launch_windows_x86.ts'
import LaunchLinuxX64 from './launch_linux_x64.ts'
export function createLauncher(){
    const platform = os.platform()
    const arch = os.arch()
    if(platform === 'win32'){
        if(arch === 'x64'){
            return LaunchWindowsX64
        }
        else if(arch === 'ia32'){
            return LaunchWindowsX86
        }
    }
    else if(platform === 'linux'){
        if(arch === 'x64'){
            return LaunchLinuxX64
        }
    }
    else return null
}