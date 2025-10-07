import { ChildProcess, spawn } from 'child_process'

export function spawnCommand(commandHead: string, args: string[],redirectOutput:boolean = true):Promise<{exitCode:number | null,output?:string}> {
    return new Promise((resolve, reject) => {
        const process: ChildProcess | null = spawn(commandHead, args)
        let output = ''
        if (process) {

            process.stdout?.on('data', (data) => {
                if(redirectOutput){
                    console.log(data.toString())
                }
                output += data.toString()
            })

            process.on('close', (code) => {

                process.removeAllListeners()
                process.stdout?.removeAllListeners()

                resolve({
                    exitCode: code,
                    output: output
                })
            })

            process.on('error', (err) => {

                process.removeAllListeners()
                process.stdout?.removeAllListeners()

                reject(err)
            })
        }
        else {
            reject('')
        }
    })
}