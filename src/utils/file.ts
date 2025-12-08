import fs from 'fs'
import path from 'path'

export default abstract class FileUtil {
    
    public static async recursiveDir(dirPath: string, arrayOfFiles: string[] = []) {
        const files = await fs.promises.readdir(dirPath);

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = await fs.promises.stat(fullPath);
            if (stat.isDirectory()) {
                await this.recursiveDir(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push(fullPath);
            }
        }
        return arrayOfFiles;
    }
}