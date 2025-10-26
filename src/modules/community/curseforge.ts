import axios, { type AxiosInstance } from 'axios'

type CurseForgeSearchOptions = {
    classId?: number,
    categroyId: number,
    categoryIds?: number[],
    gameVersion: string,
    gameVersions?: string[],
    searchFilter?: string,
    sortField?: string,
    sortOrder?: string,
    modLoaderType?: string,
    modLoaderTypes?: string[],
    gameVersionTypeId?: number,
    authorId?: number,
    primaryAuthorId?: number,
    slug?: string,
    index?: number,
    pageSize?: number
}

export default class CurseforgeAPI {

    private apiHost: string
    private client: AxiosInstance

    constructor(apiKey: string) {

        this.apiHost = "https://api.curseforge.com"
        this.client = axios.create({
            baseURL: "https://api.curseforge.com",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": 'application/json'
            }
        })
    }

    public async getMatchByFingerprintAndGameID(fingerprints: number | number[], gameID: number = 432) {
        const fingerprintsArray: number[] = typeof fingerprints === 'number' ? [fingerprints] : fingerprints
        const resp = await this.client.post(`/v1/fingerprints/${gameID}`, { fingerprints: fingerprintsArray })
        return resp.data
    }

    public async getMatchByFingerprint(fingerprints: number | number[]) {
        const fingerprintsArray: number[] = typeof fingerprints === 'number' ? [fingerprints] : fingerprints
        const resp = await this.client.post("/v1/fingerprints", { fingerprints: fingerprintsArray })
        return resp.data
    }

    public async getCategories(classId?: number, classOnly?: boolean) {
        const url = new URL("v1/categories")
        url.searchParams.append('gameId', '432')
        classId && url.searchParams.append("classId", String(classId))
        classOnly && url.searchParams.append('classOnly', String(classOnly))
        const resp = await this.client.get(url.toString())
        return resp.data
    }

    public async getModByModID(modIds: number | number[], pcOnly: boolean = true) {
        const modIdsArray: number[] = typeof modIds === 'number' ? [modIds] : modIds
        const resp = await this.client.post("v1/mods", {
            filterPcOnly: pcOnly,
            modIds: modIdsArray
        })
        return resp.data
    }

    public async getFileByFileID(fileIds: number | number[]) {
        const fileIdsArray: number[] = typeof fileIds === 'number' ? [fileIds] : fileIds
        const resp = await this.client.post("v1/mods/files", {
            fileIds: fileIdsArray
        })
        return resp.data
    }

    public async search(options: CurseForgeSearchOptions) {
        const resp = await this.client.post("v1/mods/search", options)
        return resp.data
    }

    public async getModByModIDPath(modId: number) {
        const resp = await this.client.get(`v1/mods/${modId}`)
        return resp.data
    }

    public async getFileOfModID(modId: number, querys: {
        gameVersion?: string,
        modLoaderType?: string,
        index?: number,
        pageSize?: number
    }
        = {}) {
        const url = new URL(`v1/mods/${modId}/files`)
        querys.gameVersion && url.searchParams.append('gameVersion', querys.gameVersion)
        querys.modLoaderType && url.searchParams.append('modLoaderType', querys.modLoaderType)
        querys.index && url.searchParams.append('index', String(querys.index))
        querys.pageSize && url.searchParams.append('pageSize', String(querys.pageSize))

        const resp = await this.client.get(url.toString())
        return resp.data
    }

    public async getFileByModIDAndFileID(modId: number, fileId: string) {
        const resp = await this.client.get(`v1/mods/${modId}/files/${fileId}`)
        return resp.data
    }

    public async getFileDownloadURLByModIDAndFileID(modId: number, fileId: string) {
        const resp = await this.client.get(`v1/mods/${modId}/files/${fileId}/download-url`)
        return resp.data
    }
}

