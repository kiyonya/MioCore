import CurseforgeAPI from "./curseforge.ts"

export default class MultipleAPI {

    private curseforge: CurseforgeAPI

    constructor(CURSEFORGE_API_KEY: string) {
        this.curseforge = new CurseforgeAPI(CURSEFORGE_API_KEY)
    }

    
    
}