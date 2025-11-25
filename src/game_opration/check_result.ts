export interface MissingFile { 
    url?: string, 
    path: string, 
    sha1?: string, 
    type?: string,
    msg?:string
}

interface IGameFileCheckResult {
    repairable:MissingFile[],
    irreparable:MissingFile[],
    canRepair:boolean,
}

export default class GameFileCheckResult implements IGameFileCheckResult {

    public repairable:MissingFile[] = []
    public irreparable:MissingFile[] = []
    public canRepair:boolean = false

    constructor(fileCheckResult:IGameFileCheckResult){
        this.repairable = fileCheckResult.repairable
        this.irreparable = fileCheckResult.irreparable
        this.canRepair = fileCheckResult.canRepair
    }

}