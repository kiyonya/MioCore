import { exec } from 'child_process';

export interface JavaVersionInfo {
    path: string;
    version: string;
    runtimeVersion: string;
    home: string;
    vendor: string;
    is64bit: boolean;
    raw: {
        versionOutput: string;
        propertiesOutput: string;
    };
}

export default abstract class JavaVersionDetector {

    public static async getWindowsJavaVersion(javaExecutablePath: string): Promise<JavaVersionInfo> {
        return this.getJavaVersion(javaExecutablePath, 'windows');
    }
    public static async getLinuxJavaVersion(javaExecutablePath: string): Promise<JavaVersionInfo> {
        return this.getJavaVersion(javaExecutablePath, 'linux');
    }
    public static async getMacOSJavaVersion(javaExecutablePath: string): Promise<JavaVersionInfo> {
        return this.getJavaVersion(javaExecutablePath, 'darwin');
    }
    private static async getJavaVersion(javaExecutablePath: string, osType: string): Promise<JavaVersionInfo> {
        try {
            const commandPrefix = osType === 'windows' ? `"${javaExecutablePath}"` : javaExecutablePath;

            const [versionOutput, propertiesOutput] = await Promise.all([
                this.executeCommand(`${commandPrefix} -version 2>&1`, osType),
                this.executeCommand(`${commandPrefix} -XshowSettings:properties -version 2>&1`, osType)
            ]);

            return {
                path: javaExecutablePath,
                version: this.extractMatch(versionOutput, /version\s+"([^"]+)"/),
                runtimeVersion: this.extractMatch(propertiesOutput, /java\.runtime\.version\s*=\s*([^\s]+)/),
                home: this.extractMatch(propertiesOutput, /java\.home\s*=\s*([^\s]+)/),
                vendor: this.extractVendor(versionOutput, propertiesOutput, osType),
                is64bit: this.is64Bit(versionOutput, propertiesOutput, osType),
                raw: { versionOutput, propertiesOutput }
            };
        } catch (error) {
            throw new Error(`Failed to get Java version on ${osType}: ${error}`);
        }
    }
    private static async executeCommand(command: string, osType: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, { encoding: 'utf-8' }, (error, stdout, stderr) => {
                if (error) {
                    // 在Linux/macOS上，如果命令执行失败，尝试使用绝对路径
                    if (osType !== 'windows' && error.message.includes('ENOENT')) {
                        // 尝试使用which命令找到Java可执行文件
                        exec(`which ${command.split(' ')[0]}`, { encoding: 'utf-8' }, (whichError, whichStdout) => {
                            if (whichError) {
                                resolve('');
                            } else {
                                const fullPath = whichStdout.trim();
                                // 重新执行命令
                                exec(command.replace(command.split(' ')[0], fullPath), { encoding: 'utf-8' }, (retryError, retryStdout, retryStderr) => {
                                    resolve(retryError ? '' : `${retryStdout}\n${retryStderr}`.trim());
                                });
                            }
                        });
                    } else {
                        resolve('');
                    }
                } else {
                    resolve(`${stdout}\n${stderr}`.trim());
                }
            });
        });
    }

    private static extractMatch(text: string, regex: RegExp): string {
        const match = text.match(regex);
        return match ? match[1] : 'unknown';
    }

    private static extractVendor(versionOutput: string, propertiesOutput: string, osType: string): string {
        // 通用vendor提取逻辑
        let vendor = this.extractMatch(versionOutput, /\((.*?)\)/) ||
            this.extractMatch(propertiesOutput, /java\.vendor\s*=\s*([^\n]+)/);

        if (vendor === 'unknown') {
            // 根据操作系统特定的vendor特征进行补充检测
            if (osType === 'darwin') {
                if (versionOutput.includes('Apple') || propertiesOutput.includes('Apple')) {
                    vendor = 'Apple';
                } else if (versionOutput.includes('Azul') || propertiesOutput.includes('Azul')) {
                    vendor = 'Azul Systems';
                }
            } else if (osType === 'linux') {
                if (versionOutput.includes('OpenJDK') || propertiesOutput.includes('OpenJDK')) {
                    vendor = 'OpenJDK';
                } else if (versionOutput.includes('Oracle') || propertiesOutput.includes('Oracle')) {
                    vendor = 'Oracle Corporation';
                } else if (versionOutput.includes('IBM') || propertiesOutput.includes('IBM')) {
                    vendor = 'IBM';
                }
            } else if (osType === 'windows') {
                if (versionOutput.includes('Microsoft') || propertiesOutput.includes('Microsoft')) {
                    vendor = 'Microsoft';
                }
            }
        }

        return vendor || 'unknown';
    }

    private static is64Bit(versionOutput: string, propertiesOutput: string, osType: string): boolean {
        // 通用64位检测
        let is64bit = versionOutput.includes('64-Bit') ||
            propertiesOutput.includes('sun.arch.data.model=64') ||
            versionOutput.includes('64-bit') ||
            propertiesOutput.includes('os.arch=amd64') ||
            propertiesOutput.includes('os.arch=x86_64');
        if (!is64bit) {
            if (osType === 'darwin') {
                // macOS特定的检测
                is64bit = versionOutput.includes('x86_64') ||
                    propertiesOutput.includes('amd64') ||
                    propertiesOutput.includes('x86_64');
            } else if (osType === 'linux') {
                // Linux特定的检测
                is64bit = versionOutput.includes('amd64') ||
                    propertiesOutput.includes('x86_64') ||
                    versionOutput.includes('Linux x86_64');
            }
        }
        return is64bit;
    }
}
