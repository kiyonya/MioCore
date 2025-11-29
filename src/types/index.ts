export type MinecraftLibClassifiers = Record<string, {
  path: string;
  sha1?: string;
  size?: number;
  url: string;
}>

export type MinecraftLibArtifact = {
  path: string;
  sha1?: string;
  size?: number;
  url: string;
}

export type MinecraftLibClassifierIndex = Record<string,string>

export type MinecraftLibClassifieExtractGuide = Partial<Record<"exclude" | 'include', string[]>>

export type MinecraftLibPassRule = Array<{
  os: {
    name: "osx" | "linux" | "windows";
  };
  action?: string;
}>

export interface MinecraftLib {
  name: string;
  downloads?: {
    artifact?: MinecraftLibArtifact
    classifiers?: MinecraftLibClassifiers
  };
  extract?: MinecraftLibClassifieExtractGuide,
  natives?: MinecraftLibClassifierIndex,
  rules?: MinecraftLibPassRule;
  clientreq?: boolean,
  serverreq?: boolean,
  url?: string
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
  javaVersion?: {
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

export interface MinecraftAssetsJson {
  objects: Record<string, { hash: string, size: number }>
}

export type LaunchOptions = {
  java?: string
  jvmArgumentsHead?: string[]
  gameArguments?: []
  jvmVersionCheck?: boolean
  gameFileCheck?: boolean
  mojangServerConnectionCheck?: boolean
  lwjglNativesDirectory?: string
  windowWidth?: number
  windowHeight?: number
  demo?: boolean
  title?: string
  useLaunchLanguage?: string
  useGamaOverride?: boolean
  processPriority?: number
  entryServer?: string
  useG1GC?:boolean

  customJvmArguments?:string[]
  
  addDefaultJvmArguments?:boolean



  createLaunchBat?: boolean
  autoMemDistribution?: boolean
  memDistribution?: number
  memLow?: number | 256
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

export type MMLDataJson = {
  playTime?: number,
  latestRun?: number,
  version: string,
  modLoader?: Record<string, string> | null,
  name?: string,
  mmlVersion?: number,
  installTime: number,
  installTimeUTC: string
}