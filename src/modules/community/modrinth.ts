import axios from 'axios'
import pLimit from 'p-limit'
import fs from 'fs'


export type ModrinthProjectTypes = "mod" | "modpack" | "resourcepacks" | "datapack" | "shaders" | "plugins" | 'project'

export type ProjectSearchOptions = {
    query?: string
    facets?: {
        categories?: string,
        versions?: string,
        project_type?: ModrinthProjectTypes | Array<ModrinthProjectTypes>
    }
    index?: "relevance" | "downloads" | "follows" | "newest" | "updated"
    limit?: number
    offset?: number
}

export type ModrinthProject = {
    project_id: string,
    thread_id?: string,
    slug?: string,
    title: string,
    description: string,
    categories: Array<string>,
    client_side: string,
    server_side: string,
    versions: Array<string>,
    license: string,
    project_type: ModrinthProjectTypes,
    downloads: number,
    icon_url: string | null,
    color: number,
    monetization_status?: string,
    follows: number,
    latest_version?: string,
    date_created: string,
    date_modified: string,
    gallery?: Array<string>,
    donation_urls?: Record<string, string>,
    discord_url?: string,
    wiki_url?: string,
    issues_url?: string,
    source_url?: string
}

export type ModrinthProjectVersion = {
    name: string,
    version_number: string,
    changelog?: string,
    dependencies?: Array<{
        version_id: string,
        project_id: string,
        file_name: string,
        dependency_type: "required" | "optional" | "incompatible" | "embedded"
    }>,
    game_versions: Array<string>,
    loaders: Array<"fabric" | "forge" | "quilt" | "liteloader" | "cauldron" | "spigot" | "bukkit" | "sponge">,
    featured: boolean,
    status: "draft" | "unlisted" | "listed" | "archived",
    requires_status?: string,
    id: string,
    project_id: string,
    author_id: string,
    date_published: string,
    downloads: number,
    files: Array<{
        url: string,
        hashes: Record<"sha512" | 'sha1', string>,
        filename: string,
        primary: boolean,
        size: number,
        file_type?: string
    }>
}

export type ModrinthSearchHits = {
    hits: Array<ModrinthProject>
    offset: number,
    limit: number,
    total_hits: number
}

export type ModrinthUpdateOptions = {
    loaders: Array<"fabric" | "forge" | "quilt" | "liteloader" | "neoforge">
    game_versions: string[],
    algorithm: 'sha1' | 'sha512'
}

export type ModrinthCategories = {
    icon: string,
    name: string,
    project_type: ModrinthProjectTypes
}

export type ModrinthLoaders = {
    icon: string,
    name: string,
    supported_project_types: Array<ModrinthProject>
}

export type ModrinthLikeGameVersions = {
    version: string,
    version_type: 'release' | 'snapshot' | 'alpha' | 'beta',
    date: string,
    major: boolean
}

export type ModrinthSideTypes = [
    "required",
    "optional",
    "unsupported",
    "unknown"
]


export default class ModrinthAPI {

    static readonly Common = class Common {

        public static async searchProjects(projectSearchOptions: ProjectSearchOptions): Promise<ModrinthSearchHits> {
            const facetsMap: Map<string, string[]> = new Map()
            if (projectSearchOptions.facets) {
                for (const [key, value] of Object.entries(projectSearchOptions.facets)) {

                    facetsMap.set(key, [...(facetsMap.has(key) ? facetsMap.get(key) as string[] : []), ...(Array.isArray(value) ? value.map(i => `${key}:${i}`) : [`${key}:${value}`])])
                }
            }
            const facetsArray = [...facetsMap.values()]
            const url = new URL("https://api.modrinth.com/v2/search")

            projectSearchOptions.query && url.searchParams.append('query', projectSearchOptions.query)
            projectSearchOptions.index && url.searchParams.append('index', projectSearchOptions.index)
            projectSearchOptions.limit && url.searchParams.append('limit', String(projectSearchOptions.limit))
            projectSearchOptions.offset && url.searchParams.append('offset', String(projectSearchOptions.offset))
            facetsArray.length && url.searchParams.append('facets', JSON.stringify(facetsArray))

            const resp = await axios.get(url.toString(), { responseType: 'json' })
            return resp.data as ModrinthSearchHits
        }

        public static async getProject(projectIdOrSlug: string): Promise<ModrinthProject> {
            const url = new URL(`https://api.modrinth.com/v2/project/${projectIdOrSlug}`)
            const resp = await axios.get(url.toString(), { responseType: 'json' })
            return resp.data as ModrinthProject
        }

        public static async getMultipleProjects(projectIdsOrSlugs: Array<string>): Promise<Array<ModrinthProject>> {
            const url = new URL(`https://api.modrinth.com/v2/projects`)
            const params = new URLSearchParams()
            projectIdsOrSlugs.forEach(idOrSlug => {
                params.append('ids', idOrSlug)
            })
            url.search = params.toString()
            const resp = await axios.get(url.toString(), { responseType: 'json' })
            return resp.data as Array<ModrinthProject>
        }

        public static async getProjectVersions(projectIdOrSlug: string): Promise<Array<ModrinthProjectVersion>> {
            const url = new URL(`https://api.modrinth.com/v2/project/${projectIdOrSlug}/version`)
            const resp = await axios.get(url.toString(), { responseType: 'json' })
            return resp.data as Array<ModrinthProjectVersion>
        }

        public static async getVersion(versionId: string): Promise<ModrinthProjectVersion> {
            const url = new URL(`https://api.modrinth.com/v2/version/${versionId}`)
            const resp = await axios.get(url.toString(), { responseType: 'json' })
            return resp.data as ModrinthProjectVersion
        }

        public static async getMultipleVersions(versionIds: Array<string>): Promise<Array<ModrinthProjectVersion>> {
            const url = new URL(`https://api.modrinth.com/v2/versions`)
            const params = new URLSearchParams()
            versionIds.forEach(id => {
                params.append('ids', id)
            })
            url.search = params.toString()
            const resp = await axios.get(url.toString(), { responseType: 'json' })
            return resp.data as Array<ModrinthProjectVersion>
        }

        public static async getVersionFromFileHash(hash: string, algorithm: 'sha1' | 'sha512' = 'sha1'): Promise<ModrinthProjectVersion> {
            const url = new URL(`https://api.modrinth.com/v2/version_file/${algorithm}/${hash}`)
            const resp = await axios.get(url.toString(), { responseType: 'json' })
            return resp.data as ModrinthProjectVersion
        }

        public static async getVersionsFromFileHashes(hashes: Array<string>, algorithm: 'sha1' | 'sha512' = 'sha1'): Promise<Record<string,ModrinthProjectVersion>> {
            const resp = await axios.post(`https://api.modrinth.com/v2/version_files`,{hashes,algorithm:algorithm}, { responseType: 'json' })
            return resp.data as Record<string,ModrinthProjectVersion>
        }

        public static async getLatestVersionFromHash(hash: string, options: ModrinthUpdateOptions): Promise<ModrinthProjectVersion> {
            const url = new URL(`https://api.modrinth.com/v2/version_file/${hash}/update`)
            const params = new URLSearchParams()
            params.append('algorithm', options.algorithm)
            url.search = params.toString()

            const body = {
                loaders: options.loaders,
                game_versions: options.game_versions
            }

            const resp = await axios.post(url.toString(), body, { responseType: 'json' })
            return resp.data as ModrinthProjectVersion
        }

        public static async getMultipleLatestVersionsFromHashes(hashes: Array<string>, options: ModrinthUpdateOptions,): Promise<Record<string, ModrinthProjectVersion>> {
            const body = {
                hashes: hashes,
                loaders: options.loaders,
                game_versions: options.game_versions,
                algorithm: options.algorithm
            }
            const resp = await axios.post(`https://api.modrinth.com/v2/version_files/update`, body, { responseType: 'json' })
            return resp.data as Record<string, ModrinthProjectVersion>
        }

    }

    static readonly Tag = class Tag {

        public static async getCategoriesList(): Promise<Array<ModrinthCategories>> {
            const resp = await axios.get('https://api.modrinth.com/v2/tag/category', { responseType: 'json' })
            return resp.data as ModrinthCategories[]
        }

        public static async getLoaderList(): Promise<Array<ModrinthLoaders>> {
            const resp = await axios.get('https://api.modrinth.com/v2/tag/loader', { responseType: 'json' })
            return resp.data as ModrinthLoaders[]
        }

        public static async getGameList(): Promise<Array<ModrinthLikeGameVersions>> {
            const resp = await axios.get('https://api.modrinth.com/v2/tag/game_version', { responseType: 'json' })
            return resp.data as ModrinthLikeGameVersions[]
        }

        public static async getProjectTypeList(): Promise<Array<ModrinthProjectTypes>> {
            const resp = await axios.get('https://api.modrinth.com/v2/tag/project_type', { responseType: 'json' })
            return resp.data as ModrinthProjectTypes[]
        }

        public static SideType: ModrinthSideTypes = [
            "required",
            "optional",
            "unsupported",
            "unknown"
        ]

        public static ProjectType = ["mod", "modpack", "resourcepack", "shader", "plugin", "datapack"]
    }
}


