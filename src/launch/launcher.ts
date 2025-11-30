import os from 'os'
import LaunchWindows from './launch_windows.ts'
import LaunchLinux from './launch_linux.ts'
import LaunchMacOS from './launch_macos.ts'
export function createLauncher(){
    const platform = os.platform()
    const arch = os.arch()
    if(platform === 'win32'){
        return LaunchWindows
    }
    else if(platform === 'linux'){
        return LaunchLinux
    }
    else if(platform === 'darwin'){
        return LaunchMacOS
    }
    else return null
}