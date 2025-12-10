export default class Mirror {
    public static readonly MirrorList: Record<string, string[]> = {
        "http://resources.download.minecraft.net": ["https://bmclapi2.bangbang93.com/assets"],
        "https://libraries.minecraft.net": ["https://bmclapi2.bangbang93.com/maven"],
        "https://files.minecraftforge.net/maven": ["https://bmclapi2.bangbang93.com/maven"],
        "http://dl.liteloader.com/versions/versions.json": ["https://bmclapi.bangbang93.com/maven/com/mumfrey/liteloader/versions.json"],
        "https://authlib-injector.yushi.moe": ["https://bmclapi2.bangbang93.com/mirrors/authlib-injector"],
        "https://meta.fabricmc.net": ["https://bmclapi2.bangbang93.com/fabric-meta"],
        "https://maven.fabricmc.net": ["https://bmclapi2.bangbang93.com/maven"],
        "https://maven.neoforged.net/releases/net/neoforged/forge": ["https://bmclapi2.bangbang93.com/maven/net/neoforged/forge"],
        "https://maven.neoforged.net/releases/net/neoforged/neoforge": ["https://bmclapi2.bangbang93.com/maven/net/neoforged/neoforge"]
    }

    public static getMirrors(originalUrl: string, mirrorFirst: boolean = false): string[] {
        const result: string[] = []

        for (const [originalPrefix, mirrors] of Object.entries(Mirror.MirrorList)) {
            if (originalUrl.startsWith(originalPrefix)) {
                for (const mirrorPrefix of mirrors) {
                    const mirrored = originalUrl.replace(originalPrefix, mirrorPrefix);
                    result.push(mirrored)
                }
            }
        }
        if (mirrorFirst) {
            result.push(originalUrl)
        }
        else {
            result.unshift(originalUrl)
        }
        return result
    }
}