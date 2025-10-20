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

export function getFileNameFromPath(pathString:string){
  return path.basename(pathString).replace(path.extname(pathString),'')
}

export async function getDirSize(dirPath: string): Promise<number> {
    let totalSize = 0;
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                totalSize += await getDirSize(fullPath);
            } else if (entry.isFile()) {
                const stats = await fs.promises.stat(fullPath);
                totalSize += stats.size;
            }
        }
    } catch (err) {
        console.error(`处理路径 ${dirPath} 时出错:`, err);
        throw err;
    }
    return totalSize;
}