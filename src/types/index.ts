export interface MinecraftLib {
  name: string;
  downloads?: {
    artifact?: {
      path: string;
      sha1?: string;
      size?: number;
      url: string;
    };
    classifiers?: {
      [key: string]: {
        path: string;
        sha1?: string;
        size?: number;
        url: string;
      };
    };
  };
  rules?: {
    os: {
      name: "osx" | "linux" | "windows";
    };
    action?: string;
  }[];
  clientreq?: boolean,
  serverreq?: boolean
}

export interface MinecraftVersionJson {
  id?: string
  modLoader?: { [K: string]: string } | null
  libraries: MinecraftLib[];
  downloads: {
    client: {
      sha1: string;
      size: number;
      url: string;
    };
    server: {
      sha1: string;
      size: number;
      url: string;
    };
    client_mappings: any,
    server_mappings: any,
  };
  assetIndex: {
    id: string;
    sha1: string;
    size: number;
    totalSize: number;
    url: string;
  };
  javaVersion: {
    majorVersion: number,
    component: "java-runtime-alpha" | "java-runtime-beta" | "java-runtime-delta" | "java-runtime-gamma" | "java-runtime-gamma-snapshot" | "jre-legacy" | "minecraft-java-exe"
  },
  clientVersion?: string,
  inheritsFrom?: string,
  arguments?: { game: string[], jvm: { rules?: { action: 'allow' | 'disallow', os: { name: string } }[] }[] },
  minecraftArguments: string,
  assets: number,
  mainClass: string,
}

export type LaunchOptions = {
  java?: string
  jvmArgumentsHead?: string[]
  gameArguments?: []
  jvmVersionCheck?: boolean
  gameFileCheck?: boolean
  mojangServerConnectionCheck?: boolean
  lwjglNativesDirectory?: string
  //游戏
  windowWidth?: number
  windowHeight?: number
  demo?: boolean
  title?: string
  useLaunchLanguage?: string
  useGamaOverride?: boolean
  processPriority?: number
  entryServer?: string
  //启动
  createLaunchBat?: boolean
  //内存
  //自动内存分配
  autoMemDistribution?: boolean
  //内存分配数量 number 当 autoMemDistribution 为false时读取内存分配
  memDistribution?: number
  //最小内存分配 一般无需指定默认为256
  memLow?: number | 256
  //指令钩子
  beforeLaunch?: string
  afterLaunch?: string
  afterClose?: string
}

export type DownloadTaskItem = {
  url: string;
  sha1?: string;
  path: string;
  type?: string;
}

export type MinecraftAssetsObject = {
  id: string,
  primary: boolean
}

export type CurseForgeManifestJson = {
  name: string,
  files: {
    "projectID": number,
    "fileID": number,
    "required": boolean
  }[],
  minecraft: {
    version: string,
    modLoaders?: {
      id: string,
      primary: boolean
    }[]
  }
}

export type ModrinthIndexJson = {
  name: string,
  files: {
    path: string,
    hashes: {
      sha1: string,
      sha512: string,
    },
    downloads: string[],
    filesize: number
  }[],
  dependencies: {
    minecraft: string,
    forge?: string,
    fabric?: string,
    neoforge?: string,
  }
}