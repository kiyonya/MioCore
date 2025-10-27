import os from 'os';

export default class Sys{

    public static getFreeMemMB(): number {
        return Math.floor(os.freemem() / 1024 / 1024);
    }

    public static getTotalMemMB(): number {
        return Math.floor(os.totalmem() / 1024 / 1024);
    }

    public static getUsedMemMB(): number {
        return this.getTotalMemMB() - this.getFreeMemMB();
    }

    public static getMemUsagePercent(): number {
        return Math.floor((this.getUsedMemMB() / this.getTotalMemMB()) * 100);
    }

}