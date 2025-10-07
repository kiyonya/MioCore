import path from "path";
import fs from 'fs'

export function existify(...args: string[]): string {
  const p = path.join(...args)
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true })
  }
  return p
}

export function mavenToPath(mavenStr: string): string {
  // 去掉中括号
  const cleanStr = mavenStr.replace(/^\[|\]$/g, '');
  // 分割主要部分和扩展名
  const [mainPart, extension = 'jar'] = cleanStr.split('@');
  // 分割各部分
  const parts = mainPart.split(':');
  const [groupId, artifactId, version, classifier] = parts;
  // 构建路径
  const groupPath = groupId.replace(/\./g, '\\');
  const baseFilename = `${artifactId}-${version}`;
  const classifierPart = classifier ? `-${classifier}` : '';
  const filename = `${baseFilename}${classifierPart}.${extension}`;
  return path.join(groupPath, artifactId, version, filename)
}

export function isMavenLikePath(index: string): boolean {
  if (!index) { return false }
  if (index.startsWith('[') && index.endsWith(']')) { return true }
  return false
}

export function objectToManifest(manifestObj: Record<string, string | string[]>): string {
  let manifestContent = '';
    for (const [key, value] of Object.entries(manifestObj)) {
        if (Array.isArray(value)) {
            const joinedValue = value.join(' ')
            manifestContent += `${key}: ${joinedValue}\n`;
        } else {
            manifestContent += `${key}: ${value}\n`;
        }
    }
    manifestContent += '\n';
    return manifestContent;
}