import EventEmitter from "events";
import fs from 'fs'

interface CrashLogReport {
    time?: string,
    description?: string,
    log: {
        error: string,
        stacks?: string[]
    }[]
}



interface DError {
    //出的错误
    error?: string,
    stack: {
        at?: string | null,
        atLine?: number | null,
        atJar?: string | null,
        doing?: string | null
    }[],
    detail?:{[K:string]:string}

}

export default class CrashAnalyzer {
    public crashLogPath?: string
    public latestLogPath?: string
    public debugLogPath?: string

    constructor(crashLogPath?: string, latestLogPath?: string, debugLogPath?: string) {

        this.crashLogPath = crashLogPath
        this.latestLogPath = latestLogPath
        this.debugLogPath = debugLogPath

    }

    public async analyse() {
        if (this.crashLogPath && fs.existsSync(this.crashLogPath)) {
            const log = fs.readFileSync(this.crashLogPath, 'utf-8').split('\n').filter(i => !(i.startsWith('-') || i.startsWith('//')))
            console.log(log)

            this.readCrashReport(log)
        }
    }

    protected async readCrashReport(crashReport: string[]) {
        const totalErrors: DError[] = []
        let error: DError = { stack: [] }
        let stats: 'reciveError' | 'reciveStack' | 'reciveDetail' = 'reciveError'
        for (let line of crashReport) {
            if (!line) {
                continue
            }
            line = line?.trimEnd()
            if(line === 'Suspected Mod'){
                   
            }
            if ((line.endsWith('\r') && !line.startsWith('\t') )|| line.endsWith(':')) {
                stats = 'reciveError'
                totalErrors.push(error)
                error = { stack: [] }
                error.error = line.replaceAll('\r', '').replaceAll(':','')
            }
            else if (line.startsWith('\t') && line.endsWith('\r')) {
                stats = 'reciveStack'
                error.stack?.push(this.parseLogLine(line))
            }
            else if(line.startsWith('\t') && !line.endsWith('\r')){
                stats = 'reciveDetail'
                const key = line.split(':')[0]?.trim()
                const value = line.split(':')[1]?.trim()
                if(!error.detail){
                    error.detail = {}
                }
                (key && value )&& (error.detail[key] = value)
            }
        }
        console.log(totalErrors)
    }

    protected parseLogLine(logLine: string) {
        const atMatch = logLine.match(/at\s+([^(]+)/);
        const at = atMatch ? atMatch[1].trim() : null;

        const lineMatch = logLine.match(/\.java:(\d+)/);
        const atLine = lineMatch ? parseInt(lineMatch[1]) : null;

        const jarMatch = logLine.match(/~\[([^\]]+)\]/);
        let atJar = null;
        if (jarMatch) {
            atJar = jarMatch[1];
            atJar = atJar.replace(/!\/(?::\?)?$/, '');
        }

        const doingMatch = logLine.match(/\{\s*([^}]+)\s*\}/);
        const doing = doingMatch ? doingMatch[1] : null;

        return {
            at,
            atLine,
            atJar,
            doing
        };
    }
}