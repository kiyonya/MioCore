import { createRequire } from 'node:module';

const Myrequire = createRequire(import.meta.url);
const addon = Myrequire('./bin/wincpp_addon.node');

export default class WinCppAddon {

    public static isPidHasWindow(pid:number):boolean{
        return addon.hasWindowByPid(pid) as boolean
    }

    public static modifyWinTitle(pid:number,title:string):boolean{
        if(this.isPidHasWindow(pid)){
            return addon.setWindowTitleByPid(pid,title) as boolean
        }
        return false
    }
}


