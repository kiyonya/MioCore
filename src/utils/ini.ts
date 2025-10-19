
export default class INI {

    //TODO

    public static parse(string: string):Record<string, string | null | boolean | Array<any> | number> {
        const lines = string.split('\n').map(i => i.trim())
        const javascriptObjectNotation: Record<string, string | null | boolean | Array<any> | number> = {}
        for (const line of lines) {
            const splited = line.split(":").map(i => i.trim())
            const key = splited.shift()
            if (!key) { continue }
            const value = splited.length > 1 ? splited : splited.join()
            if(typeof value === 'string' && ["True","False"].includes(value)){
                javascriptObjectNotation[key] = Boolean(value.toLowerCase())
            }
            else{
                javascriptObjectNotation[key] =value
            }
            
        }
        return javascriptObjectNotation
    }

    public static write(){
        //TODO
    }
}