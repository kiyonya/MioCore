import axios, {
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosError
} from 'axios'

export interface CurseForgeSearchOptions {
    classId?: number
    categoryId?: number
    categoryIds?: number[]
    gameVersion?: string
    gameVersions?: string[]
    searchFilter?: string
    sortField?: number
    sortOrder?: string
    modLoaderType?: string
    modLoaderTypes?: string[]
    gameVersionTypeId?: number
    authorId?: number
    primaryAuthorId?: number
    slug?: string
    index?: number
    pageSize?: number
}

export interface CurseforgeImageLike {
    id: number
    url: string
    title: string
    modId: number
    thumbnailUrl: string
}

export interface CurseforgeAuthor {
    id: number
    name: string
    url: string
    avatarUrl?: string
}

export interface CurseforgeScreenshot extends CurseforgeImageLike {
    description: string
}

export interface CurseforgeLatestFileIndex {
    fileId: number
    filename: string
    gameVersion: string
    gameVersionTypeId: number
    modLoader: number
    releaseType: number
}

export interface CurseforgeCategory {
    classId: number
    dateModified: string
    displayIndex: number
    parentCategoryId?: number
    id: number
    name: string
    isClass: boolean
    gameId: number
    iconUrl: string
    slug: string
    url: string
}

export interface SortableGameVersion {
    gameVersion: string
    gameVersionName: string
    gameVersionPadded: string
    gameVersionReleaseDate: string
    gameVersionTypeId: number
}

export interface CurseforgeHash {
    algo: number
    value: string
}

export interface CurseforgeFile {
    id: number
    dependencies: Array<{
        modId: number
        relationType: number
    }>
    fileName: string
    downloadUrl: string
    fileLength: number
    fileFingerprint: number
    fileSizeOnDisk: number
    downloadCount: number
    fileDate: string
    displayName: string
    gameVersions: string[]
    hashes: Array<CurseforgeHash>
    modLoaderTypes: number[]
    releaseType: number
    fileStatus: number
    sortableGameVersions: Array<SortableGameVersion>
    isAvailable: boolean
    isServerPack: boolean
    modules: Array<{
        name: string
        fingerprint: number
    }>
}

export interface CurseforgeLatestFile {
    file_type: string
    filename: string
    hashes: {
        sha1: string
        sha512: string
    }
    primary: boolean
    size: number
    url: string
}

export interface Pagination {
    index: number
    pageSize: number
    resultCount: number
    totalCount: number
}

export interface CurseforgeSearchResult {
    data: Array<{
        allowModDistribution: boolean
        authors: Array<CurseforgeAuthor>
        categories: Array<CurseforgeCategory>
        classId: number
        dateCreated: string
        dateModified: string
        dateReleased: string
        downloadCount: number
        id: number
        isFeatured: boolean
        isAvailable: boolean
        gameId: number
        name: string
        slug: string
        summary: string
        mainFileId: number
        primaryCategoryId: number
        latestFiles: Array<CurseforgeFile>
        latestFilesIndexes: Array<CurseforgeLatestFileIndex>
        links: Record<string, string>
        logo: CurseforgeImageLike
        screenshots: Array<CurseforgeImageLike>
    }>
    pagination: Pagination
}

export interface CurseforgeMatchItem {
    file: CurseforgeFile
    id: number
    latestFiles: Array<CurseforgeLatestFile>
}

export interface CurseforgeModFingerprintMatchResult {
    data: {
        exactFingerprints: Array<number>
        exactMatches: Array<CurseforgeMatchItem>
        installedFingerprints: Array<number>
        isCacheBuilt: boolean
        partialMatchFingerprints: {
            [key: string]: Array<number>
        }
        partialMatches: Array<CurseforgeMatchItem>
        unmatchedFingerprints: Array<number> | null
    }
}

export interface CurseforgeResourceDetail {
    allowModDistribution: boolean
    authors: Array<CurseforgeAuthor>
    categories: Array<CurseforgeCategory>
    classId: number
    dateCreated: string
    dateModified: string
    dateReleased: string
    downloadCount: number
    gameId: number
    gamePopularityRank: number
    id: number
    isAvailable: boolean
    isFeatured: boolean
    latestFiles: Array<CurseforgeLatestFile>
    latestFilesIndexes: Array<CurseforgeLatestFileIndex>
    links: Record<string, string> | null
    logo: CurseforgeImageLike | null
    mainFileId: number
    name: string
    primaryCategoryId: number
    rating: number
    screenshots: Array<CurseforgeScreenshot>
    slug: string
    status: number
    summary: string
    thumbsUpCount: number
}
export default class CurseforgeAPI {
    private apiHost: string
    private client: AxiosInstance
    private readonly MAX_RETRIES = 10

    constructor(apiKey: string) {
        console.log('Curseforge API Key:', apiKey)

        this.apiHost = 'https://api.curseforge.com/'
        this.client = axios.create({
            baseURL: 'https://api.curseforge.com/',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        })
    }

    private async requestWithRetry<T>(
        config: AxiosRequestConfig,
        retryCount: number = 0
    ): Promise<T> {
        try {
            const response = await this.client(config)
            return response.data as T
        } catch (error) {
            const axiosError = error as AxiosError

            //404错误直接抛出
            if (axiosError.response?.status === 404) {
                throw axiosError
            }
            if (retryCount >= this.MAX_RETRIES) {
                throw new Error(
                    `请求失败，已达到最大重试次数(${this.MAX_RETRIES}次)：${axiosError.message}`
                )
            }
            const delay = 1000 * retryCount // 重试间隔：0ms → 1000ms → 2000ms...
            await new Promise(resolve => setTimeout(resolve, delay))
            return this.requestWithRetry<T>(config, retryCount + 1)
        }
    }

    public async getMatchByFingerprintAndGameID(
        fingerprints: number | number[],
        gameID: number = 432
    ): Promise<CurseforgeModFingerprintMatchResult> {
        const fingerprintsArray: number[] =
            typeof fingerprints === 'number' ? [fingerprints] : fingerprints
        return this.requestWithRetry<CurseforgeModFingerprintMatchResult>({
            method: 'post',
            url: `/v1/fingerprints/${gameID}`,
            data: { fingerprints: fingerprintsArray }
        })
    }

    public async getMatchByFingerprint(
        fingerprints: number | number[]
    ): Promise<CurseforgeModFingerprintMatchResult> {
        const fingerprintsArray: number[] =
            typeof fingerprints === 'number' ? [fingerprints] : fingerprints
        return this.requestWithRetry<CurseforgeModFingerprintMatchResult>({
            method: 'post',
            url: '/v1/fingerprints',
            data: { fingerprints: fingerprintsArray }
        })
    }

    public async getCategories(
        classId?: number,
        classOnly?: boolean
    ): Promise<{ data: Array<CurseforgeCategory> }> {
        const url = new URL('/v1/categories', this.apiHost)
        url.searchParams.append('gameId', '432')
        classId && url.searchParams.append('classId', String(classId))
        classOnly && url.searchParams.append('classOnly', String(classOnly))

        console.log(url.toString())
        return this.requestWithRetry<{ data: Array<CurseforgeCategory> }>({
            method: 'get',
            url: url.toString()
        })
    }

    /**
     * 
     * @param modIds 模组（迫真）id，其实其他资源的id也可以，默认数组
     * @param pcOnly 
     * @returns 
     */
    public async getModOrProjectById(
        modIds: string | string[],
        pcOnly: boolean = true
    ): Promise<{ data: Array<CurseforgeResourceDetail> }> {
        const modIdsArray: number[] = (typeof modIds === 'string' ? [modIds] : modIds).map(i => Number(i))
        return this.requestWithRetry<{ data: Array<CurseforgeResourceDetail> }>({
            method: 'post',
            url: 'v1/mods',
            data: { filterPcOnly: pcOnly, modIds: modIdsArray }
        })
    }

    public async getFileByFileID(
        fileIds: number | number[]
    ): Promise<{ data: Array<CurseforgeFile> }> {
        const fileIdsArray: number[] =
            typeof fileIds === 'number' ? [fileIds] : fileIds
        return this.requestWithRetry<{ data: Array<CurseforgeFile> }>({
            method: 'post',
            url: '/v1/mods/files',
            data: { fileIds: fileIdsArray }
        })
    }

    public async search(
        options: CurseForgeSearchOptions = {}
    ): Promise<CurseforgeSearchResult> {
        const url = new URL('v1/mods/search', this.apiHost)
        url.searchParams.append('gameId', '432')

        for (const [key, value] of Object.entries(options)) {
            if (Array.isArray(value)) {
                url.searchParams.append(key, String(value.join(',')))
            } else if (value !== undefined) {
                url.searchParams.append(key, String(value))
            }
        }

        console.log(url.toString())

        return this.requestWithRetry<CurseforgeSearchResult>({
            method: 'get',
            url: url.toString()
        })
    }

    public async getModByModIDPath(
        modId: number
    ): Promise<{ data: Array<CurseforgeResourceDetail> }> {
        return this.requestWithRetry<{ data: Array<CurseforgeResourceDetail> }>({
            method: 'get',
            url: `/v1/mods/${modId}`
        })
    }

    public async getFileOfModID(
        modId: number,
        querys: {
            gameVersion?: string
            modLoaderType?: string
            index?: number
            pageSize?: number
        } = {}
    ): Promise<{ data: Array<CurseforgeFile>; pagination: Pagination }> {
        const url = new URL(`v1/mods/${modId}/files`, this.apiHost)
        querys.gameVersion &&
            url.searchParams.append('gameVersion', querys.gameVersion)
        querys.modLoaderType &&
            url.searchParams.append('modLoaderType', querys.modLoaderType)
        querys.index && url.searchParams.append('index', String(querys.index))
        querys.pageSize &&
            url.searchParams.append('pageSize', String(querys.pageSize))

        return this.requestWithRetry<{
            data: Array<CurseforgeFile>
            pagination: Pagination
        }>({
            method: 'get',
            url: url.toString()
        })
    }

    public async getFileByModIDAndFileID(
        modId: number,
        fileId: number
    ): Promise<{ data: CurseforgeFile }> {
        return this.requestWithRetry<{ data: CurseforgeFile }>({
            method: 'get',
            url: `/v1/mods/${modId}/files/${fileId}`
        })
    }

    public async getFileDownloadURLByModIDAndFileID(
        modId: number,
        fileId: number
    ): Promise<{ data: string }> {
        return this.requestWithRetry<{ data: string }>({
            method: 'get',
            url: `/v1/mods/${modId}/files/${fileId}/download-url`
        })
    }
}
