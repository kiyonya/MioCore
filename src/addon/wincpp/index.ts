import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const addon = require('./bin/wincpp_addon.node');

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


