import fs from "fs";
import path from "path";
import { existify, isMavenLikePath, mavenToPath } from "../utils/io.ts";
import { checkOSRules } from "../utils/os.ts";
import { type DownloadTaskItem } from "../types/index.ts";

interface ForgeGatherOptions {
    forgeWorkDir: string;
    libPath: string;
    side: "client" | "server";
    mojmapsURL: string;
    mojmapsSha1: string;
    version: string
}

export default class ForgeGather {

    //注意 这是给高版本forge格式的收集器 大概是1.12.2+
    //旧版本使用LegacyForge
    //格式有很大不一样
    //请确保你用的收集器正确
    //不然会爆炸
    //真的会....

    public installProfileJsonPath: string;
    public forgeVersionJsonPath: string;
    public forgeVersionJson: any;
    public installProfileJson: any;
    public forgeUnpackDir: string;

    //lib库位置 用来生成下载保存地址的
    public libPath: string;
    //你的端 用来过滤processor的
    public side: "client" | "server";

    //麻将映射表地址和hash 
    //在你的版本json里应该有找到
    public mojmapsURL: string;
    public mojmapsSha1: string;
    //ps：怕你找不到映射表和hash 输入版本程序自己查找
    public version: string

    constructor({
        forgeWorkDir,
        libPath,
        side,
        mojmapsURL,
        mojmapsSha1,
        version,
    }: ForgeGatherOptions) {
        this.forgeUnpackDir = path.join(forgeWorkDir, 'unpack');

        this.libPath = libPath;
        this.side = side;
        this.mojmapsSha1 = mojmapsSha1;
        this.mojmapsURL = mojmapsURL;
        this.version = version

        this.installProfileJsonPath = path.join(
            this.forgeUnpackDir,
            "install_profile.json"
        );

        this.forgeVersionJsonPath = path.join(this.forgeUnpackDir, "version.json");

        this.forgeVersionJson = JSON.parse(
            fs.readFileSync(this.forgeVersionJsonPath, "utf-8")
        );

        this.installProfileJson = JSON.parse(
            fs.readFileSync(this.installProfileJsonPath, "utf-8")
        );
    }

    public async gather(): Promise<DownloadTaskItem[]> {
        //解决maven复制
        if (this.installProfileJson.path) {
            let extraPath = path.dirname(mavenToPath(this.installProfileJson.path));
            let mavenFiles = fs.readdirSync(
                path.join(this.forgeUnpackDir, "maven", extraPath)
            );

            existify(this.libPath, extraPath);

            for (let file of mavenFiles) {
                let extraFileFrom = path.join(
                    this.forgeUnpackDir,
                    "maven",
                    extraPath,
                    file
                );
                let extraFileTo = path.join(this.libPath, extraPath, file);
                fs.existsSync(extraFileFrom) && fs.copyFileSync(extraFileFrom, extraFileTo);
            }
        }

        const tasks: DownloadTaskItem[] = [];
        //收集forge版本需要用到的库
        //高版本的格式与mc高版本格式统一
         for (const lib of this.forgeVersionJson.libraries.filter((lib: any) =>
                checkOSRules(lib?.rules)
            )) {
                tasks.push({
                    path: path.join(this.libPath, mavenToPath(lib?.name)),
                    url: lib.downloads.artifact.url,
                    sha1: lib.downloads.artifact.sha1,
                });
            }
        //收集forge安装需要用到的库
        //高版本的格式与mc高版本格式统一
        for (const lib of this.installProfileJson.libraries.filter((lib: any) =>
            checkOSRules(lib?.rules)
        )) {
            tasks.push({
                path: path.join(this.libPath, mavenToPath(lib?.name)),
                url: lib.downloads.artifact.url,
                sha1: lib.downloads.artifact.sha1,
            });
        }
        //过滤所有的processors
        //因为processor里有下载麻将映射表的任务
        //可以在这里直接转化下载任务
        //后续安装的时候就不要下载了
        const requireProcessors = this.installProfileJson.processors.filter(
            (i: any) => {
                //找没有写side的（都需要的） 以及明确写了和当前端一样的 
                if (
                    !i?.sides ||
                    i?.sides?.includes(this.side)
                ) {
                    return true;
                }
                return false;
            }
        );
        //找到任务DOWNLOAD_MOJMAPS
        //也可能没有
        //判断一下罢
        if (
            requireProcessors.some((i:any)=>i?.args?.includes("DOWNLOAD_MOJMAPS"))
        ) {
            console.log('需要下载映射表')
            //找到任务输出文件目录 是mavenPath形式的 结尾@txt
            let outputMavenPath = this.installProfileJson.data["MOJMAPS"][this.side];

            if (isMavenLikePath(outputMavenPath)) {
                const outputPath = path.join(
                    this.libPath,
                    mavenToPath(outputMavenPath)
                );
                tasks.push({
                    path: outputPath,
                    url: this.mojmapsURL,
                    sha1: this.mojmapsSha1,
                });
            }
        }

        return tasks.filter(i=>Boolean(i.url))
    }
}
