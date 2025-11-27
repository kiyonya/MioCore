import { createRequire } from 'node:module';
import { arch } from 'node:process';

const Myrequire = createRequire(import.meta.url);

const getWinDetectModule = () => {
    if (arch === 'x64') {
        return Myrequire('./bin/windetect_windows_x64.node');
    } else if (arch === 'ia32') {
        return Myrequire('./bin/windetect_windows_x86.node');
    } else {
        throw new Error(`Unsupported architecture: ${arch}`);
    }
};

export default abstract class WinDetectAddon {

    private static readonly winDetect = getWinDetectModule();

    public static isPidHasWindow(pid: number): boolean {
        return this.winDetect.hasWindowByPid(pid) as boolean;
    }

    public static modifyWinTitle(pid: number, title: string): boolean {
        if (this.isPidHasWindow(pid)) {
            return this.winDetect.setWindowTitleByPid(pid, title) as boolean;
        }
        return false;
    }
}