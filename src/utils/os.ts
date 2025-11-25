import os from "os";

interface OSRule {
  os: {
    name: "osx" | "linux" | "windows";
  };
  action?: string;
}

export interface OSInfo {
  arch:NodeJS.Architecture
  platform:NodeJS.Platform
  javaType:'linux-i386' | 'mac-os' | "mac-os-arm64" | "windows-arm64" | "windows-x64" | "windows-x86" | 'linux' | null
  nativePlatform:'linux' | 'osx' | 'windows' | null
  isArm:boolean
  is64Bit:boolean
  cpus:os.CpuInfo[]
}

export function checkOSRules(rules: OSRule[] | undefined) {
  if (!rules || rules.length === 0) {
    return true;
  }
  let osMap = {
    osx: "darwin",
    linux: "linux",
    windows: "win32",
  };
  let platform = os.platform().toLowerCase();
  return rules.every((rule) => {
    let pass = false;
    let expectOS = osMap[rule?.os?.name];
    if (expectOS === platform || !rule?.os) {
      pass = true;
    }
    if (rule.action === "disallow") {
      pass = !pass;
    }
    return pass;
  });
}

export function getSystemInfo():OSInfo {
  const arch:NodeJS.Architecture = os.arch()
  const version = os.version()
  const platform :NodeJS.Platform = os.platform()
  let javaType: 'linux-i386' | 'mac-os' | "mac-os-arm64" | "windows-arm64" | "windows-x64" | "windows-x86" | 'linux' | null = null
  if (platform === 'linux') {
    if (arch === 'ia32') {
      javaType = 'linux-i386';
    }
    else {
      javaType = 'linux'
    }
  } else if (platform === 'darwin') {
    javaType = arch === 'arm64' ? 'mac-os-arm64' : 'mac-os';
  } else if (platform === 'win32') {
    if (arch === 'x64') {
      javaType = 'windows-x64';
    } else if (arch === 'arm64') {
      javaType = 'windows-arm64';
    } else if (arch === 'ia32') {
      javaType = 'windows-x86';
    }
  }
  else{
    javaType = null
  }
  let nativePlatform:'linux' | 'osx' | 'windows' | null = null
  if(platform === 'linux'){nativePlatform = 'linux'}
  else if(platform === 'darwin'){nativePlatform = 'osx'}
  else if(platform === 'win32'){nativePlatform = 'windows'}
  const isArm:boolean = arch === 'arm' || arch === 'arm64'
  const is64Bit:boolean = arch === 'x64' || arch === 'arm64' || arch ==='loong64'
  const cpus:os.CpuInfo[] = os.cpus()
  return {
    arch,platform,javaType,nativePlatform,isArm,is64Bit,cpus
  }
}
