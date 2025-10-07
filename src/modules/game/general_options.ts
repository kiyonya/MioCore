import fs from 'fs'
export default class GeneralOptionsIO {
    public optionFile: string
    public options: { [K: string]: string }
    constructor(optionFile: string) {
        this.optionFile = optionFile
        this.options = {}
        if (fs.existsSync(this.optionFile)) {
            this.options = this.optionsParser(fs.readFileSync(this.optionFile, 'utf-8'))
        }
    }
    public set(key: string, value?: string | boolean | number) {
        if(!value){
            this.options[key] = ''
            return this
        }
        this.options[key] = typeof value === 'string' ? value : value.toString()
        return this
    }
    public remove(key: string) {
        delete this.options[key]
        return this
    }
    public save() {
        fs.writeFileSync(this.optionFile, this.toString(), 'utf-8')
        return this
    }
    public saveAs(file: string) {
        fs.writeFileSync(file, this.toString(), 'utf-8')
        return this
    }
    public createEmpty(){
        fs.writeFileSync(this.optionFile,'','utf-8')
        return this
    }
    public createEmptyWhenNoFile(){
        if(!fs.existsSync(this.optionFile)){this.createEmpty()}
        return this
    }
    public toJson() {
        return this.options
    }
    public toString(): string {
        let opt = ""
        for (const [key, value] of Object.entries(this.options)) {
            if (key && value) {
                opt += `${key}:${value}\n`
            }
        }
        return opt
    }
    protected optionsParser(optionsText: string) {
        const opt: { [K: string]: string } = {}
        const lines = optionsText.split('\n').map(i => i.trim())
        for (const line of lines) {
            let key = line.split(":")[0]
            let value = line.split(":")[1]
            opt[key] = value
        }
        return opt
    }
}