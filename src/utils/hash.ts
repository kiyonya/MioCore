import fs from 'fs'
import crypto from 'crypto'

export default class HashUtil {

    public static sha1Sync(file: string) {
        const buffer = fs.readFileSync(file)
        const hash = crypto.createHash('sha1')
        hash.update(buffer)
        return hash.digest('hex')
    }
    public static sha1(file: string) {
        return new Promise<string>((resolve, reject) => {
            const hash = crypto.createHash('sha1')
            const stream = fs.createReadStream(file)
            stream.on('data', (chunk) => {
                hash.update(chunk)
            })
            stream.on('end', () => {
                const fileHash = hash.digest('hex')
                stream.destroy()
                resolve(fileHash)
            })
            stream.on('error', (err) => {
                stream.destroy()
                reject(err)
            })
        })
    }
    public static sha1OfSync(data: Buffer | string) {
        const hash = crypto.createHash('sha1')
        hash.update(data)
        return hash.digest('hex')
    }
    public static md5Sync(file: string) {
        const buffer = fs.readFileSync(file)
        const hash = crypto.createHash('md5')
        hash.update(buffer)
        return hash.digest('hex')
    }
    public static md5(file: string) {
        return new Promise<string>((resolve, reject) => {
            const hash = crypto.createHash('md5')
            const stream = fs.createReadStream(file)
            stream.on('data', (chunk) => {
                hash.update(chunk)
            })
            stream.on('end', () => {
                const fileHash = hash.digest('hex')
                stream.destroy()
                resolve(fileHash)
            })
            stream.on('error', (err) => {
                stream.destroy()
                reject(err)
            })
        })
    }

    public static md5OfString(string:string){
        const hash = crypto.createHash('md5')
        hash.update(Buffer.from(string))
        return hash.digest('hex')
    }

}
