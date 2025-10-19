import net from 'net'
import dns from 'dns'

interface ServerStatus {
    description?: string,
    favicon?: string,
    players: {
        max: number,
        online: number,
    },
    version: {
        name: string,
        protocal: number
    }
}

export default class SLPHandshake {

    protected host: string
    protected port: number
    protected ping: number | undefined

    constructor(host: string, port: number) {
        this.host = host
        this.port = port
        this.ping = undefined
    }

    public async createSocket(timeoutMs: number = 5000): Promise<net.Socket> {
        const connectStart = Date.now();

        return new Promise((resolve, reject) => {
            const socket = net.createConnection({
                host: this.host,
                port: this.port,
            });

            let isCompleted = false;

            const complete = (result: { type: 'success', socket: net.Socket } | { type: 'error', error: Error }) => {
                if (isCompleted) return;
                isCompleted = true;

                clearTimeout(timeoutId);
                socket.removeAllListeners();

                if (result.type === 'success') {
                    this.ping = Date.now() - connectStart;
                    resolve(result.socket);
                } else {
                    socket.destroy();
                    reject(result.error);
                }
            };

            const timeoutId = setTimeout(() => {
                complete({
                    type: 'error',
                    error: new Error(`Connection timeout after ${timeoutMs}ms to ${this.host}:${this.port}`)
                });
            }, timeoutMs);

            socket.once('connect', () => {
                complete({ type: 'success', socket });
            });

            socket.once('error', (error) => {
                complete({ type: 'error', error });
            });

            // 处理 socket 在事件发生前被关闭的情况
            socket.once('close', () => {
                if (!isCompleted) {
                    complete({
                        type: 'error',
                        error: new Error('Socket closed before connection was established')
                    });
                }
            });
        });
    }

    public async getServerStatus(): Promise<{ status: ServerStatus, ping: number }> {

        const socket = await this.createSocket()

        const hostUnit8Arr = Uint8Array.from(Buffer.from(this.host))
        const portUnit8Arr = Uint8Array.from(Buffer.from(Uint16Array.from([this.port]).buffer as ArrayBuffer))

        const body: Uint8Array<ArrayBuffer> = this.concat([
            Uint8Array.from([0x00, 0x00]),
            Uint8Array.from(this.encodeVarint(hostUnit8Arr.length)),
            hostUnit8Arr,
            portUnit8Arr,
            Uint8Array.from([0x01])
        ])
        const pack: Uint8Array<ArrayBuffer> = this.concat([Uint8Array.from(this.encodeVarint(body.length)), body])

        socket.write(pack)
        //请求包
        socket.write(Uint8Array.from([0x01, 0x00]))

        const recvPromise = new Promise<{ status: ServerStatus, ping: number }>((resovle, reject) => {
            let len: number = 0
            let result: Buffer = Buffer.from('')
            socket.on('readable', (data) => {
                if (socket.readableLength >= 2) {
                    if (!len) {
                        const packlen = this.decodeVarint(socket)
                        const packId = this.decodeVarint(socket)
                        len = this.decodeVarint(socket)
                    }
                    result = Buffer.concat([result, socket.read()])
                }
                if (result.length >= len) {
                    socket.removeAllListeners()
                    resovle({
                        status: JSON.parse(result.toString()),
                        ping: this.ping || -1
                    })
                }
            })
        })

        try {
            const status = await recvPromise
            !socket.destroyed && socket.destroy()
            return status
        } catch (error) {
            throw error
        }
    }

    protected encodeVarint(value: number): number[] {
        if (value < 0) {
            throw new Error('Varint 编码只支持非负整数');
        }
        const bytes: number[] = [];
        while (value > 0x7F) {
            bytes.push((value & 0x7F) | 0x80);
            value = value >>> 7;
        }
        bytes.push(value & 0x7F);
        return bytes;
    }

    protected decodeVarint(socket: net.Socket): number {
        let result = 0

        for (let idx = 0; idx < 5; idx++) {
            let bufferVal = socket.read(1)[0]

            result |= (bufferVal & 0x7f) << (idx * 7)

            if ((bufferVal & 0x80) === 0) return result
        }

        return result
    }

    protected concat(arrays: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
        const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)
        let result = new Uint8Array(totalLength)

        arrays.reduce((offset, arr) => {
            result.set(arr, offset)
            return offset + arr.length
        }, 0)

        return result
    }
}
