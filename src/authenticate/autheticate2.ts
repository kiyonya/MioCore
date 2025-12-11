import axios from "axios";
import axiosRetry from "axios-retry";
import EventEmitter from "events";

export interface DevicecodeRespond {
    device_code: string
    user_code: string
    verification_uri: string
    expires_in: number
    interval: number
    message: string
}

export interface TokenResponse {
    token_type: string
    scope: string
    expires_in: number
    access_token: string
    refresh_token: string
    id_token?: string
}

export interface XBLResponse {
    IssueInstant: string
    NotAfter: string
    Token: string
    DisplayClaims: {
        xui: { uhs: string }[]
    }
}

export interface XSTSResponse {
    IssueInstant: string
    NotAfter: string
    Token: string
    DisplayClaims: {
        xui: { uhs: string }[]
    }
}

export interface MojangAuthResponse {
    access_token: string
    expires_in: number
    username?: string
    roles: any[]
    metadata: any
}

export interface AuthorizationResult {
    refreshOauthToken: string
    mojangAccessToken: string
    mojangAccessTokenExpires: number
    mojangAccessTokenRefreshTime: number
    playerProfile: any
    uuid: string,
    genuine?: boolean,
    finishedISOTime?: string
}

interface AuthorizationEvents {
    "error": (ErrorEvent: { error: unknown, errorDescription?: string }) => void
    "devicecode": (DeviceCodeEvent: { code: string, uri: string, expiresIn: number }) => void
    "progress": (ProgressEvent: { step: string, status: string, msg?: string }) => void
}

export default class AuthorizationV2 extends EventEmitter {

    on<K extends keyof AuthorizationEvents>(
        event: K,
        listener: AuthorizationEvents[K]
    ): this {
        return super.on(event, listener);
    }

    once<K extends keyof AuthorizationEvents>(
        event: K,
        listener: AuthorizationEvents[K]
    ): this {
        return super.once(event, listener);
    }

    emit<K extends keyof AuthorizationEvents>(
        event: K,
        ...args: Parameters<AuthorizationEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

    private clientId: string
    private deviceCodeInterval: NodeJS.Timeout | null
    private axiosClient = axios.create({ timeout: 10000 })
    /**
     * MC正版登录工作流
     * @author kiyuu
     * @param clientId Azure Client id
     */
    constructor(clientId: string) {
        super()
        this.clientId = clientId
        this.deviceCodeInterval = null
        axiosRetry(this.axiosClient, { retries: 10 })
    }
    public async refreshTokenAuthFlow(refreshToken: string): Promise<AuthorizationResult> {

        try {
            const refreshedTokenResponse = await this.refreshToken(refreshToken)
            const accessAuthResponse = await this.accessAuth(refreshedTokenResponse.access_token)
            const newRefreshToken = refreshedTokenResponse.refresh_token
            const uuid = accessAuthResponse.playerProfile.uuid as string
            //封装答复
            const result: AuthorizationResult = {
                uuid: uuid,
                ...accessAuthResponse,
                refreshOauthToken: newRefreshToken,
                genuine: true,
                finishedISOTime: new Date().toISOString()
            }
            return result
        } catch (error) {
            throw error
        }
    }
    public async deviceCodeAuthFlow(): Promise<AuthorizationResult> {
        try {
            const deviceCode = await this.getDeviceCode()

            if (!(deviceCode && deviceCode.user_code && deviceCode.device_code)) {
                throw new Error('无效的设备码')
            }

            this.emit('devicecode', {
                code: deviceCode.user_code,
                expiresIn: deviceCode.expires_in,
                uri: deviceCode.verification_uri
            })

            const oauthToken: TokenResponse = await new Promise((resolve, reject) => {
                let pace = deviceCode.interval * 1000
                this.deviceCodeInterval = setInterval(async () => {
                    const authStatus = await this.getDeviceCodeAuthStatus(deviceCode.device_code)

                    switch (authStatus.status) {
                        case 'pending':
                            if (authStatus.msg === 'slow_down') {
                                pace *= 1.1
                            }
                            this.emit('progress', {
                                status: 'pending',
                                step: "oauth",
                                msg: authStatus.msg
                            })
                            break
                        case 'error':
                            this.deviceCodeInterval && clearInterval(this.deviceCodeInterval)
                            this.deviceCodeInterval = null
                            this.emit('error', {
                                error: authStatus.error,
                                errorDescription: authStatus.errorDescription,
                            })
                            reject()
                            break
                        case 'success':
                            this.deviceCodeInterval && clearInterval(this.deviceCodeInterval)
                            this.deviceCodeInterval = null
                            if (authStatus.data) {
                                resolve(authStatus.data)
                            } else {
                                reject()
                            }
                            break
                    }
                }, pace)
            })

            this.emit('progress', {
                status: 'success',
                step: "oauth",
                msg: 'successed'
            })
            this.emit('progress', {
                status: 'pending',
                step: 'mojang',
                msg: ''
            })
            const accessAuthResponse = await this.accessAuth(oauthToken.access_token)
            this.emit('progress', {
                status: 'success',
                step: 'mojang',
                msg: ''
            })
            let uuid = accessAuthResponse.playerProfile.id as string
            //封装答复
            const result: AuthorizationResult = {
                uuid: uuid,
                ...accessAuthResponse,
                refreshOauthToken: oauthToken.refresh_token,
                genuine: true,
                finishedISOTime: new Date().toISOString()
            }
            return result
        } catch (error) {
            this.emit('error', {
                error: error ?? "登录失败"
            })
            throw error
        }
    }
    private async accessAuth(OauthAccessToken: string) {
        //XBOX登录喵
        const XSTSResponse = await this.XboxLiveAuth(OauthAccessToken)

        let userHash = XSTSResponse.DisplayClaims.xui?.[0].uhs
        let xstsToken = XSTSResponse.Token

        //Mojang登录
        let mojangAuthResult: MojangAuthResponse = await this.MojangAccessToken(userHash, xstsToken)

        let minecraftAccessToken = mojangAuthResult.access_token
        //mc档案获取
        let playerProfile = await this.playerProfile(minecraftAccessToken)

        //封装回复
        let accessAuthResponse = {
            mojangAccessToken: mojangAuthResult.access_token,
            mojangAccessTokenExpires: mojangAuthResult.expires_in,
            mojangAccessTokenRefreshTime: Date.now(),
            playerProfile: playerProfile
        }
        return accessAuthResponse
    }
    private async getDeviceCode() {
        const data: FormData = new FormData()
        data.append('client_id', this.clientId)
        data.append('scope', 'XboxLive.signin offline_access')

        const request = await this.axiosClient.request({
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data,
            url: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode',
            method: 'POST'
        })

        if (request.status === 200) {
            return request.data as DevicecodeRespond
        } else {
            throw new Error('Cannot get devicecode')
        }
    }
    public async getDeviceCodeAuthStatus(deviceCode: string) {
        try {
            const data = new FormData()
            data.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code')
            data.append('client_id', this.clientId)
            data.append('device_code', deviceCode)

            const request = await this.axiosClient.request({
                method: 'POST',
                url: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: data,
                validateStatus: (status) => {
                    return status === 200 || status === 400
                }
            })

            if (request.status === 400) {
                if (request.data.error === 'authorization_pending') {
                    return {
                        status: 'pending',
                        msg: 'authorization_pending',
                        pauseInterval: false
                    }
                } else if (request.data.error === 'slow_down') {
                    return {
                        status: 'pending',
                        msg: 'slow_down',
                        pauseInterval: false
                    }
                } else {
                    return {
                        status: 'error',
                        error: request.data.error,
                        errorDescription: request.data.error_description,
                        pauseInterval: true
                    }
                }
            } else if (request.status === 200) {
                return {
                    status: 'success',
                    data: request.data as TokenResponse,
                    pauseInterval: true
                }
            } else {
                throw new Error('未知错误')
            }
        } catch (error) {
            throw error
        }
    }
    public async XboxLiveAuth(accessToken: string): Promise<XSTSResponse> {
        //XBL
        let request = await this.axiosClient.post(
            'https://user.auth.xboxlive.com/user/authenticate',
            {
                Properties: {
                    AuthMethod: 'RPS',
                    SiteName: 'user.auth.xboxlive.com',
                    RpsTicket: `d=${accessToken}`
                },
                RelyingParty: 'http://auth.xboxlive.com',
                TokenType: 'JWT'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            }
        )
        if ([400, 401, 402, 403, 405].includes(request.status)) {
            request = await this.axiosClient.post(
                'https://user.auth.xboxlive.com/user/authenticate',
                {
                    Properties: {
                        AuthMethod: 'RPS',
                        SiteName: 'user.auth.xboxlive.com',
                        RpsTicket: accessToken
                    },
                    RelyingParty: 'http://auth.xboxlive.com',
                    TokenType: 'JWT'
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    }
                }
            )
        }
        if (request.status !== 200 || !request.data) {
            throw new Error('XBL请求失败')
        }
        //XSTS
        let XBLResponse = request.data as XBLResponse
        let XSTSRequest = await this.axiosClient.post(
            'https://xsts.auth.xboxlive.com/xsts/authorize',
            {
                Properties: {
                    SandboxId: 'RETAIL',
                    UserTokens: [XBLResponse.Token]
                },
                RelyingParty: 'rp://api.minecraftservices.com/',
                TokenType: 'JWT'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            }
        )

        if (XSTSRequest.status !== 200) {
            throw new Error('XSTS请求失败')
        }

        const XSTSResponse = XSTSRequest.data as XSTSResponse
        return XSTSResponse
    }
    public async MojangAccessToken(userHash: string, xstsToken: string): Promise<MojangAuthResponse> {
        const request = await this.axiosClient.post(
            'https://api.minecraftservices.com/authentication/login_with_xbox',
            {
                identityToken: `XBL3.0 x=${userHash};${xstsToken}`
            },
        )
        if (request.status === 200) {
            return request.data as MojangAuthResponse
        } else {
            throw new Error(request.data)
        }
    }
    public async playerProfile(mojangAccessToken: string): Promise<any> {
        const res = await this.axiosClient.get('https://api.minecraftservices.com/minecraft/profile', {
            headers: {
                Authorization: `Bearer ${mojangAccessToken}`
            }
        })
        if (res.status === 200) {
            return res.data
        } else {
            throw new Error('无法获取mc档案')
        }
    }
    public async refreshToken(refreshToken: string) {
        const data: FormData = new FormData()
        data.append('client_id', this.clientId)
        data.append('refresh_token', refreshToken)
        data.append('grant_type', 'refresh_token')
        data.append('scope', 'XboxLive.signin offline_access')

        const request = await this.axiosClient.request({
            url: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
            method: 'POST',
            data: data,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (request.status === 200) {
            return request.data as TokenResponse
        } else {
            throw new Error('刷新失败')
        }
    }
    public destory() {
        if (this.deviceCodeInterval) {
            clearInterval(this.deviceCodeInterval)
        }
    }
}
