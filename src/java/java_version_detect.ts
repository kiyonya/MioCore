import { exec, execFile } from 'child_process';
import * as path from 'path';

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

    public static async getJavaInfo(javaExecutablePath: string, osType: NodeJS.Platform): Promise<JavaVersionInfo> {
        try {

            const [versionOutput, propertiesOutput] = await Promise.all([
                this.executeCommand(javaExecutablePath, ['-version'], osType),
                this.executeCommand(javaExecutablePath, ['-XshowSettings:properties', '-version'], osType)
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

    private static async executeCommand(executableOrCommand: string, args: string[], osType: NodeJS.Platform): Promise<string> {
        return new Promise((resolve, _reject) => {
            execFile(executableOrCommand, args, { encoding: 'utf-8' }, (error, stdout, stderr) => {
                if (error) {
                    const code = (error as any).code;
                    if (osType !== 'win32' && (code === 'ENOENT' || (error as any).errno === 'ENOENT')) {
                        const executableName = path.basename(executableOrCommand);
                        execFile('which', [executableName], { encoding: 'utf-8' }, (whichError, whichStdout) => {
                            if (whichError) {
                                resolve('');
                                return;
                            }
                            const fullPath = whichStdout.trim();
                            if (!fullPath) {
                                resolve('');
                                return;
                            }
                            execFile(fullPath, args, { encoding: 'utf-8' }, (retryError, retryStdout, retryStderr) => {
                                resolve(retryError ? '' : `${retryStdout}\n${retryStderr}`.trim());
                            });
                        });
                    } else {
                        // Other errors should just resolve to empty output so detection gracefully falls back
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
                } else if (versionOutput.includes('Zulu') || propertiesOutput.includes('Zulu')) {
                    vendor = 'Azul Systems';
                }
            } else if (osType === 'windows') {
                if (versionOutput.includes('Microsoft') || propertiesOutput.includes('Microsoft')) {
                    vendor = 'Microsoft';
                }
            }
        }

        return vendor || 'unknown';
    }

    private static is64Bit(versionOutput: string, propertiesOutput: string, osType: NodeJS.Platform): boolean {
        // 通用64位检测
        const stdout = (versionOutput || '').toLowerCase();
        const props = (propertiesOutput || '').toLowerCase();
        const hasSunArchDataModel64 = /sun\.arch\.data\.model\s*=\s*64/.test(props);
        const hasOsArchAmd64 = /os\.arch\s*=\s*(amd64|x86_64)/.test(props);
        let is64bit = stdout.includes('64-bit') || stdout.includes('64-bit-jdk') || hasSunArchDataModel64 || hasOsArchAmd64;
        if (!is64bit) {
            if (osType === 'darwin') {
                // macOS特定的检测
                is64bit = versionOutput.includes('x86_64') ||
                    propertiesOutput.includes('amd64') ||
                    propertiesOutput.includes('x86_64');
            } else if (osType === 'linux') {
                // Linux特定的检测
                is64bit = stdout.includes('amd64') || stdout.includes('x86_64') || props.includes('amd64') || props.includes('x86_64') || stdout.includes('linux x86_64');
            }
        }
        return is64bit;
    }
}
