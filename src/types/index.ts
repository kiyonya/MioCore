interface MinecraftLib {
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
  clientreq?:boolean,
  serverreq?:boolean
}

export interface MinecraftVersionJson {
  id?: string
  modLoader?: { [K: string]: string } | null
  libraries: MinecraftLib[];
  downloads: {
    client?: {
      sha1: string;
      size: number;
      url: string;
    };
    server?: {
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
  minecraftArguments:string,
  assets:number,
  mainClass:string,
}