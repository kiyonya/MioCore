import path from "node:path"
import HashUtil from "../../utils/hash.ts"
import { CATEGLORIES } from "./cates.ts"
import CurseforgeAPI, { type CurseForgeSearchOptions } from "./curseforge.ts"
import { Lang } from "./lang.ts"
import ModrinthAPI, { type ProjectSearchOptions, type ModrinthProjectTypes } from "./modrinth.ts"
import { getFileNameFromPath } from "../../utils/io.ts"

export type MultiCategloy = "adventure" | "cursed" | "decoration" | "economy" | "equipment" | "food" | "game-mechanics" | "library" | "magic" | "management" | "minigame" | "mobs" | "optimization" | "social" | "storage" | "technology" | "transportation" | "utility" | "worldgen" | "farming" | "ores-and-resources" | "map-and-information" | "structures" | "miscellaneous" | "energy" | "biomes"

export type MultiCateglories = Array<MultiCategloy>

export type ProjectType = "mod" | 'modpack' | 'shaderpack' | 'resourcepack' | 'datapack'

export interface MultiSearchOptions {
    categories?: string[],
    platform?: ('curseforge' | 'modrinth')[],
    type: ProjectType,
    gameVersions?: string[]
    search?: string,
    modLoaders?: string[],
    sortWith?: 'name' | 'downloads',
    sortReverse?: boolean,
    returnRaw?: boolean
}

export interface CategloriesNotation {
    name: string,
    zhName?: string,
    icon?: string,
    curseforgeCate: number | null,
    modrinthCate: string | null,
    type: ProjectType
}

export interface ModrinthProjectSearchOptionsWithOnlyArrayFactsAcceptance extends ProjectSearchOptions {
    query?: string
    facets: {
        categories: string[],
        versions: string[],
        project_type: ModrinthProjectTypes | Array<ModrinthProjectTypes>
    }
    index?: "relevance" | "downloads" | "follows" | "newest" | "updated"
    limit?: number
    offset?: number
}

export interface MultiProjectNotation {
    name: string,
    categories: string[],
    icon: string,
    authors: string[],
    description?: string,
    gameVersions: string[],
    modLoaders: string[],
    downloadCount?: number,
    publishDate: string,
    updateDate: string,
    projectType: ProjectType,
    gallery: string[],
    from: 'modrinth' | 'curseforge',
    slug: string,
    projectId:string,
}

export interface MultiProjectDetailNotation extends MultiProjectNotation {
    versions: Array<{
        versionName: string,
        version: string,
        gameVersion: string,
        modLoaders: string[],
        majarFilename: string
        fileId:string,
    }>
}


export default class MultipleAPI {

    private CurseforgeAPI: CurseforgeAPI

    public static CATEGLORIES = CATEGLORIES

    public searchMatchedSlugs: {
        hash: string | null,
        slugs: string[]
    }

    public static curseforgeTypeMap: Record<ProjectType, number> = {
        mod: 6,
        modpack: 4471,
        resourcepack: 12,
        shaderpack: 6552,
        datapack: 6945
    }

    public static modrinthTypeMap: Record<ProjectType, ModrinthProjectTypes> = {
        mod: 'mod',
        modpack: 'modpack',
        resourcepack: 'resourcepack',
        datapack: 'datapack',
        shaderpack: 'shader',
    }

    public static curseforgeModLoaderIdMap:Record<number,string> = {
        1:'forge',
        4:'fabric',
        6:'neoforge',
    }

    constructor(CURSEFORGE_API_KEY: string) {
        this.CurseforgeAPI = new CurseforgeAPI(CURSEFORGE_API_KEY)
        this.searchMatchedSlugs = {
            hash: null,
            slugs: []
        }
    }

    public async multiSearch(options: MultiSearchOptions, limit: number = 30, page: number = 0) {

        const optionsMd5Hash = HashUtil.md5OfString(JSON.stringify(options))
        const isDuplicateSameSlug: boolean = options.returnRaw ? false : !Boolean(options.search)

        isDuplicateSameSlug && console.log('搜索结果去重')

        if (this.searchMatchedSlugs.hash !== optionsMd5Hash) {
            this.searchMatchedSlugs.hash = optionsMd5Hash
            this.searchMatchedSlugs.slugs = []
        }

        const doSearch = {
            modrinth: options.platform ? options.platform.includes('modrinth') : true,
            curseforge: options.platform ? options.platform.includes('curseforge') : true
        };

        const curseforgeSearchOptions = this.buildCurseForgeSearchOptions(options, Math.ceil(limit / 2 + 15), page);
        const modrinthSearchOptions = this.buildModrinthSearchOptions(options, Math.ceil(limit / 2 + 15), page);

        const [curseforgeSearchResult, modrinthSearchResult] = await Promise.all([
            (doSearch.curseforge && curseforgeSearchOptions) ? this.CurseforgeAPI.search(curseforgeSearchOptions) : Promise.resolve(null),
            (doSearch.modrinth && modrinthSearchOptions) ? ModrinthAPI.Common.searchProjects(modrinthSearchOptions) : Promise.resolve(null)
        ]);

        const multiProjectMap: Map<string, MultiProjectNotation> = new Map()

        for (const hit of modrinthSearchResult?.hits || []) {

            const multiProject: MultiProjectNotation = {
                name: hit.title,
                categories: hit.categories,
                icon: hit.icon_url || '',
                authors: [hit.author],
                gameVersions: hit.game_versions,
                modLoaders: hit.loaders,
                publishDate: hit.published,
                updateDate: hit.updated,
                projectType: options.type,
                gallery: hit.gallery?.map(i=>i.url) || [],
                from: 'modrinth',
                slug: hit.slug || '',
                description: hit.description,
                downloadCount: hit.downloads,
                projectId:hit.id
                
            }
            multiProjectMap.set(hit.slug as string, multiProject)
        }

        for (const hit of curseforgeSearchResult?.data || []) {

            const multiProject: MultiProjectNotation = {
                name: hit.name,
                categories: hit.categories.map(i => i.name),
                icon: hit.logo.url,
                authors: hit.authors.map(i => i.name),
                gameVersions: [...new Set(hit.latestFilesIndexes.map(i => i.gameVersion))],
                modLoaders: options.modLoaders || [],
                publishDate: hit.dateCreated,
                updateDate: hit.dateModified,
                downloadCount: hit.downloadCount,
                projectType: options.type,
                slug: hit.slug,
                description: hit.summary,
                gallery: hit.screenshots.map(i => i.url),
                from: 'curseforge',
                projectId:String(hit.id)
            }

            if (multiProjectMap.has(hit.slug)) {
                if (isDuplicateSameSlug) {
                    continue
                }
                else {
                    multiProjectMap.set(`${hit.slug}+${optionsMd5Hash}`, multiProject)
                }
            }
            else {
                multiProjectMap.set(hit.slug, multiProject)
            }

        }

        let multiProjectNotations = [...multiProjectMap.values()]
        if (isDuplicateSameSlug) {
            multiProjectNotations = multiProjectNotations.filter(i => !this.searchMatchedSlugs.slugs.includes(i.slug))
        }

        if (options.sortWith === 'name') {
            multiProjectNotations = multiProjectNotations.sort((a, b) => a.name.localeCompare(b.name))
        }
        else if (options.sortWith === 'downloads') {
            multiProjectNotations = multiProjectNotations.sort((a, b) => (b?.downloadCount || 0) - (a?.downloadCount || 0))
        }
        else {
            multiProjectNotations = multiProjectNotations.sort((a, b) => a.name.localeCompare(b.name))
        }

        if (options.sortReverse) { multiProjectNotations.reverse() }

        const multiProjectSliced = multiProjectNotations.slice(0, limit)

        for (const result of multiProjectSliced) {
            this.searchMatchedSlugs.slugs.push(result.slug)
        }

        console.log(this.searchMatchedSlugs)

        return multiProjectSliced
    }

    public async getProject(projectId:string,platform:'curseforge' | 'modrinth',projectType:ProjectType = 'mod'):Promise<MultiProjectNotation> {

        if(platform === 'curseforge'){
            if(typeof parseInt(projectId) !== 'number'){
                throw new Error('不是数字的项目名')
            }
            const curseforgeProject =( await this.CurseforgeAPI.getModOrProjectById(Number(projectId),true)).data[0]
            const modLoaders:number[] = []
            for(const i of curseforgeProject.latestFilesIndexes){
                if(i.modLoader){modLoaders.push(i.modLoader)}
            }
            const projectNotation:MultiProjectNotation = {

                name: curseforgeProject.name,
                categories: curseforgeProject.categories.map(i => i.name),
                icon: curseforgeProject?.logo?.url || '',
                authors: curseforgeProject.authors.map(i => i.name),
                gameVersions: [...new Set(curseforgeProject.latestFilesIndexes.map(i => i.gameVersion))],
                modLoaders: [...new Set(modLoaders.map(i=>MultipleAPI.curseforgeModLoaderIdMap[i]).filter(Boolean))],
                publishDate: curseforgeProject.dateCreated,
                updateDate: curseforgeProject.dateModified,
                downloadCount: curseforgeProject.downloadCount,
                projectType: projectType,
                slug:curseforgeProject.slug,
                description: curseforgeProject.summary,
                gallery: curseforgeProject.screenshots.map(i => i.url),
                from: 'curseforge',
                projectId:String(curseforgeProject.id),

            }
            return projectNotation
        }
        else {
            const modrinthProject = await ModrinthAPI.Common.getProject(projectId)
            const projectNotation:MultiProjectNotation = {
                name: modrinthProject.title,
                categories: modrinthProject.categories,
                icon: modrinthProject.icon_url || '',
                authors: [modrinthProject.author],
                gameVersions: modrinthProject.game_versions,
                modLoaders: modrinthProject.loaders,
                publishDate: modrinthProject.published,
                updateDate: modrinthProject.updated,
                projectType: projectType,
                gallery: modrinthProject.gallery?.map(i=>i.raw_url) || [],
                from: 'modrinth',
                slug: modrinthProject.slug || '',
                description: modrinthProject.description,
                downloadCount: modrinthProject.downloads,
                projectId:modrinthProject.id
            }
            return projectNotation
        }
    }






    private buildCurseForgeSearchOptions(options: MultiSearchOptions, limit: number, page: number): CurseForgeSearchOptions | null {

        const searchOptions: CurseForgeSearchOptions = {
            searchFilter: options.search || '',
            classId: MultipleAPI.curseforgeTypeMap[options.type],
            pageSize: limit,
            index: page * limit,
            sortOrder: 'desc',
            sortField: 2
        };

        // 处理分类
        if (options.categories) {
            const curseforgeCategoriesIds: number[] = [];
            for (const category of options.categories) {
                const categoryInfo = MultipleAPI.CATEGLORIES[options.type][category];
                if (categoryInfo?.curseforgeCate) {
                    curseforgeCategoriesIds.push(categoryInfo.curseforgeCate);
                }
            }
            if (curseforgeCategoriesIds.length > 1) {
                searchOptions.categoryIds = curseforgeCategoriesIds;
            }
            else {
                searchOptions.categoryId = curseforgeCategoriesIds[0]
            }
        } else {
            searchOptions.categoryId = 0;
        }

        if (searchOptions.categoryId === undefined && searchOptions.categoryIds === undefined) {
            return null
        }

        // 处理游戏版本
        if (options.gameVersions) {
            if (options.gameVersions.length > 1) {
                searchOptions.gameVersions = options.gameVersions;
            }
            else {
                searchOptions.gameVersion = options.gameVersions[0]
            }
        }

        // 处理 ModLoader
        if (options.modLoaders) {
            if (options.modLoaders.length > 1) {
                searchOptions.modLoaderTypes = options.modLoaders;
            } else {
                searchOptions.modLoaderType = options.modLoaders[0];
            }
        }

        return searchOptions;
    }

    private buildModrinthSearchOptions(options: MultiSearchOptions, limit: number, page: number): ModrinthProjectSearchOptionsWithOnlyArrayFactsAcceptance | null {
        const searchOptions: ModrinthProjectSearchOptionsWithOnlyArrayFactsAcceptance = {
            query: options.search || '',
            index: 'relevance',
            limit: limit,
            offset: page * limit,
            facets: {
                categories: [],
                project_type: MultipleAPI.modrinthTypeMap[options.type],
                versions: [],
            },
        };

        if (options.categories && searchOptions.facets) {

            for (const category of options.categories) {
                const categoryInfo = MultipleAPI.CATEGLORIES[options.type][category];
                if (categoryInfo?.modrinthCate) {
                    searchOptions.facets.categories.push(categoryInfo.modrinthCate);
                }
            }
        }

        if (options.categories?.length && !searchOptions.facets.categories.length) {
            return null
        }

        if (options.gameVersions && searchOptions.facets) {
            searchOptions.facets.versions.push(...options.gameVersions);
        }

        if (options.modLoaders && searchOptions.facets) {
            const modLoadersToProcess = Array.isArray(options.modLoaders)
                ? options.modLoaders.map(i => `categories:${i}`)
                : [`categories:${options.modLoaders}`];
            searchOptions.facets.categories.push(...modLoadersToProcess);
        }

        return searchOptions;
    }

    public async getCurseforgeCateNotation(projectType: ProjectType, onlyMainBranch: boolean = true): Promise<CategloriesNotation[]> {

        const curseforgeClassId = MultipleAPI.curseforgeTypeMap[projectType]
        console.log(curseforgeClassId)

        let curseforgeCategory = await this.CurseforgeAPI.getCategories(curseforgeClassId, true)

        if (onlyMainBranch) {
            curseforgeCategory.data = curseforgeCategory.data.filter(i => i.parentCategoryId === curseforgeClassId)
        }
        const cates: CategloriesNotation[] = []

        for (const cate of curseforgeCategory.data) {
            cates.push({
                name: cate.name,
                curseforgeCate: cate.id,
                modrinthCate: null,
                icon: cate.iconUrl,
                type: projectType,
                zhName: Lang.cates[cate.name.toLowerCase()] || cate.name
            })
        }
        return cates
    }

    public async getModrinthCateNotation(projectType: ProjectType): Promise<CategloriesNotation[]> {
        const modrinthProjectType = MultipleAPI.modrinthTypeMap[projectType]
        const modrinthCates = await ModrinthAPI.Tag.getCategoriesList()
        const filteredCates = modrinthCates.filter(i => i.project_type === modrinthProjectType)

        const cates: CategloriesNotation[] = []

        for (const cate of filteredCates) {
            cates.push({
                name: cate.name,
                icon: cate.icon,
                type: projectType,
                curseforgeCate: null,
                modrinthCate: `${cate.header}:${cate.name}`,
                zhName: Lang.cates[cate.name] || cate.name
            })
        }
        return cates
    }

    public async getCategories(type: ProjectType) {

        const modrinthCates = await this.getModrinthCateNotation(type)
        const curseforgeCates = await this.getCurseforgeCateNotation(type, true)

        console.log(modrinthCates, curseforgeCates)

        const multiCatesMap: Map<string, CategloriesNotation> = new Map()

        const sameWordReflect: Record<string, string> = {
            "apiandlibrary": 'library',
            'utility&qol': 'utility',
            'serverutility': '*',
            'vanilla': 'vanillalike',
            'tech': 'technology',
            'adventureandrpg': 'adventrue',
            'combat/pvp': 'combat',
            'small/light': 'lightweight',
            '512xandhigher': '512x+',
            'fontpacks': 'font',
            'photorealistic': 'realistic',
            'twitchintegration': '*',
            'mcreator': '*',
            'modjam2025': '*',
            'miscellaneous': 'kitchen-sink',

        }

        for (const cate of [...modrinthCates, ...curseforgeCates]) {
            let lowerName = cate.name.replaceAll(' ', '').replaceAll('-', '').toLowerCase()
            if (sameWordReflect[lowerName]) {
                lowerName = sameWordReflect[lowerName]
            }
            if (lowerName === '*') { continue }
            if (multiCatesMap.has(lowerName)) {
                const storedCate = multiCatesMap.get(lowerName) as CategloriesNotation
                if (!storedCate?.curseforgeCate && cate.curseforgeCate) {
                    storedCate.curseforgeCate = cate.curseforgeCate
                }
                if (!storedCate.modrinthCate && cate.modrinthCate) {
                    storedCate.modrinthCate = cate.modrinthCate
                }
                multiCatesMap.set(lowerName, storedCate)
            }
            else {
                multiCatesMap.set(lowerName, cate)
            }
        }
        const multiCates = [...multiCatesMap.values()]
        return multiCates
    }

    public async exportCates() {
        const result: Record<string, Record<string, CategloriesNotation>> = {}
        for (const index of ['mod', 'modpack', 'datapack', 'resourcepack', 'shaderpack']) {
            const cates = await this.getCategories(index as ProjectType)
            console.log(cates)
            for (const cate of cates) {
                if (!result[index]) {
                    result[index] = {}
                }
                result[index][cate.name.toLowerCase()] = cate
            }
        }
        return result
    }
}