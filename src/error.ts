
export class DirNotFoundException extends Error{
    public dir?:string
    constructor(msg:string,dir?:string){
        super(msg)
        this.dir = dir
    }
}

export class FileNotFoundException extends Error{
    public file?:string
    constructor(msg:string,file?:string){
        super(msg)
        this.file = file
    }
}

