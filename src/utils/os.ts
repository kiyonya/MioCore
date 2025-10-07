import os from "os";

interface OSRule {
  os: {
    name: "osx" | "linux" | "windows";
  };
  action?: string;
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
