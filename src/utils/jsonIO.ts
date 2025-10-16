import fs from 'fs'

export default class JSONIO {

    public jsonFile: string
    public data: Record<string, any> = {}

    constructor(jsonFile: string) {
        this.jsonFile = jsonFile
        this.open()
    }

    public open(): this {
        if (!fs.existsSync(this.jsonFile)) {
            fs.writeFileSync(this.jsonFile, JSON.stringify({}))
        }
        const content = fs.readFileSync(this.jsonFile, 'utf-8')
        this.data = JSON.parse(content)
        return this
    }

    public toObject(): Record<string, any> {
        return this.data
    }

    public modify(keyAddr: string, value: any): this {
        const keys = keyAddr.split('.')
        let current = this.data

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i]
            if (!(key in current)) {
                current[key] = {}
            }
            current = current[key]
        }

        current[keys[keys.length - 1]] = value
        return this
    }

    public add(keyAddr: string, value: any): this {
        const keys = keyAddr.split('.')
        let current = this.data

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i]
            if (!(key in current)) {
                current[key] = {}
            }
            current = current[key]
        }

        const lastKey = keys[keys.length - 1]
        if (!(lastKey in current)) {
            current[lastKey] = []
        }

        if (Array.isArray(current[lastKey])) {
            current[lastKey].push(value)
        }
        return this
    }

    public delete(keyAddr: string): this {
        const keys = keyAddr.split('.')
        let current = this.data

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i]
            if (!(key in current)) {
                return this
            }
            current = current[key]
        }

        const lastKey = keys[keys.length - 1]
        if (lastKey in current) {
            delete current[lastKey]
        }

        return this
    }

    public has(keyAddr: string): boolean {
        const keys = keyAddr.split('.')
        let current = this.data

        for (const key of keys) {
            if (!(key in current)) {
                return false
            }
            current = current[key]
        }

        return true
    }

    public get(keyAddr: string): any {
        const keys = keyAddr.split('.')
        let current = this.data

        for (const key of keys) {
            if (!(key in current)) {
                return undefined
            }
            current = current[key]
        }

        return current
    }

    public save(): this {
        fs.writeFileSync(this.jsonFile, JSON.stringify(this.data, null, 2))
        return this
    }
}

