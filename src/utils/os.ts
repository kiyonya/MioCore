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
  const isArm:boolean = arch === 'arm' || arch === 'arm64'
  const is64Bit:boolean = arch === 'x64' || arch === 'arm64' || arch ==='loong64'
  const cpus:os.CpuInfo[] = os.cpus()
  return {
    arch,platform,isArm,is64Bit,cpus
  }
}
