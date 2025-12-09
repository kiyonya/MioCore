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

export type MinecraftLibClassifierIndex = Record<string, string>

export type MinecraftLibClassifieExtractGuide = Partial<Record<"exclude" | 'include', string[]>>

export type MinecraftLibPassRule = Array<{
  os: {
    name: "osx" | "linux" | "windows";
  };
  action?: string;
}>

export type PassRule =
  {
    "action": "allow" | "disallow",
    "os": {
      "name": string
    }
  }

export interface IMMLID {
    modLoader?: Record<string, string> | null,
    gameVersion?: string,
    name?: string,
    installTime?: number,
    playTime?: number,
    latestRun?: number,
}

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
  arguments?: {
    game: string[],
    jvm: Array<
      ({
        rules?: Array<PassRule>,
        value: string
      }) | string
    >
  },
  minecraftArguments: string,
  assets: number,
  mainClass: string,
  patches?: {
    id: string,
    version: string,
    arguments?: {
      game: string[],
      jvm: Array<
        ({
          rules?: Array<PassRule>,
          value: string
        }) | string
      >
    },
    mainClass?: string
  }[],

  mmlid?:IMMLID
}

export interface MinecraftAssetsJson {
  objects: Record<string, { hash: string, size: number }>
}

export type LaunchOptions = {
  /**
   * java可执行路径
   * @platform -linux 为 JAVAHOME/bin/java
   * @platform -win32 为 JAVAHOME/bin/java.exe
   * @platform -macos 为 JAVAHOME/Contents/bin/java
   * 留空自动下载，同时如果设置也会经过检查
   * @default undefined
   */
  java?: string
  jvmVersionCheck?: boolean
  /**
   * 文件完整性检查
   */
  gameFileCheck?: boolean
  mojangServerConnectionCheck?: boolean
  /**
   * 自定义Lwjgl原生库目录
   */
  lwjglNativesDirectory?: string
  /**
   * 游戏窗口宽度
   */
  windowWidth?: number
  /**
   * 游戏窗口高度
   */
  windowHeight?: number
  demo?: boolean
  /**
   * 游戏标题窗口
   */
  title?: string
  /**
   * 设置游戏启动语言
   */
  useLaunchLanguage?: string
  /**
   * 使用游戏GAMA值覆盖，适用于场景比较黑的情况
   * @deprecated
   */
  useGamaOverride?: boolean
  /**
   * 进程优先级
   * @url https://node.org.cn/api/os.html#ossetprioritypid-priority
   */
  processPriority?: number
  /**
   * 加入服务器，设置服务器地址，启动游戏后自动加入
   * @default undefined
   */
  entryServer?: string
  /**
   * 使用哪种垃圾回收器创建JVM虚拟机
   * 当自定义参数里设置了任意的GC 这项的参数将会被忽略
   * @GC SerialGC 串行GC 较适合仅有单个处理器
   * @GC ParallelGC 并行GC 使用多个线程来加速垃圾回收
   * @GC ConcMarkSweepGC 使用并发标记清理算法
   * @GC G1GC 垃圾优先GC
   * @default G1GC
   */
  jvmGC?: "SerialGC" | "ParallelGC" | "ConcMarkSweepGC" | "G1GC"
  /**
   * 自定义JVM参数,每个参数为数组的一个元素，同时你应该注意是否启用了使用默认jvm参数
   * 当使用默认jvm参数的时候，与默认参数重复的自定义参数将会被覆盖
   * 如果你没有十足的把握，请不要修改这里
   * @example 
   * ["-XX:-UseAdaptiveSizePolicy",
    "-XX:-OmitStackTraceInFastThrow"],
   * @default undefined
   */
  customJvmArguments?: string[]
  /**
   * 使用默认的JVM参数
   * Mio Core 内置了一套基础的JVM参数，默认会在启动时使用
   * 如果你自定义了你的JVM参数，请关闭这里
   * @default true
   */
  useDefaultJvmArguments?: boolean
  /**
   * 启用jvm参数校验
   * 当出现参数冲突的时候抛出异常，这可能会在启动时帮忙规避一些问题
   * @default true
   */
  useJvmArgumentsCheck?: boolean
  /**
   * 使用Mojang官方提供的JRE运行时，默认不开启
   * @description
   * 但是对于高版本（使用java17或者java21）的版本，1.18.2+
   * jre可能会造成性能的下降和一些兼容问题
   * Mio Core会通过国内镜像默认下载jdk，这可能会适应更多的场景，但是也会占用更多的磁盘空间
   * @default false
   */
  useMojangJavaRuntime?: boolean
  /**
   * 在Windows平台创建启动的Bat脚本
   * @deprecated 未来将会被启用，请看saveLaunchCommand
   * @platform win32
   * @default false
   */
  createLaunchBat?: boolean
  /**
   * 自动内存分配，默认开启
   * @deprecated
   */
  autoMemDistribution?: boolean
  /**
   * 自定义游戏启动参数，Key按照--开头
   * @example {"--demo":"","--server":"example.com"}
   * @notice
   * 当value为空时，判定为单参数
   * 请注意参数不要和版本固有参数重合
   * @default undefined
   */
  customGameArguments?: Record<string, string>
  /**
   * 启动器名称
   */
  launcherName?: string,
  /**
   * 在游戏开始菜单左下角显示的启动器版本
   * 默认为1.0.0
   * @default 1.0.0
   */
  launcherVersion?: string,
  /**
   * 版本类型，用于区分版本
   * 默认为MML
   * @default MML
   */
  versionType?: string,
  /**
   * 用户档案，在部分版本要求
   * 内容会被序列化为字符串 默认为 {}
   * @default undefined
   */
  userProperties?: Record<string, string>,
  /**
   * 登录的用户类型
   * @var msa 微软登录
   * @default msa
   */
  userType?: string
  vmxmx?: number | 'auto',
  vmxms?: number | 'auto'
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
