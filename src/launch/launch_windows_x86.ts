import path from "path";
import fs from 'fs'
import iconv from 'iconv-lite'

import { type LaunchOptions } from "../types/index.ts";
import LaunchBase, { type LauncherCreateOptions, type LaunchAuthOptions } from "./launch_base.ts";
import WinDetectAddon from "../addon/windetect/index.ts";

export default class LaunchWindowsX86 extends LaunchBase {

    private static readonly WINDOW_CHECK_INTERVAL = 100;
    private static readonly MAX_WINDOW_WAIT_TIME = 180000;

    constructor(createOptions: LauncherCreateOptions, launchOptions: LaunchOptions) {
        super(createOptions, launchOptions);
    }

    public async launch(launchAuthOptions: LaunchAuthOptions): Promise<number> {
        try {
            this.checkCancelSignal();
            this.startStatusInterval();
            await this.whenReady()

            this.checkCancelSignal();
            const { mainClass, jvmArgs, gameArgs } = this.buildLaunchCommand(launchAuthOptions);

            await this.injectGameOptions();
            this.checkCancelSignal();

            if (this.launchOptions.createLaunchBat) {
                const batFileContent = `cd "${this.versionPath}"\n\n"${this.javaExecutablePath}" ${jvmArgs.join(' ')} ${mainClass} ${gameArgs.join(' ')} \n\npause`
                const gbkBuffer = iconv.encode(batFileContent, 'gbk')
                const batSavePath = path.join(this.versionPath, 'latest.bat')
                fs.writeFileSync(batSavePath, gbkBuffer)
                console.log("最近启动脚本已保存到" + batSavePath)
            }
            const pid = await this.createGameProcess(this.javaExecutablePath, jvmArgs, mainClass, gameArgs);

            await this.waitForGameWindow(pid);

            if (this.launchOptions.title) {
                this.modifyWindowTitle(pid);
            }

            this.endStatusInterval();
            return pid;

        } catch (error) {
            this.failedLaunch(error as Error);
            throw error;
        }
    }

    private async injectGameOptions(): Promise<void> {
        this.progress['inject-options'] = 0;
        this.injectOptionsIO();
        this.progress['inject-options'] = 1;
    }

    private async waitForGameWindow(pid: number): Promise<void> {
        this.progress['wait-window'] = 0;

        const hasWindow = await this.waitForGameWindowInternal(pid);

        if (!hasWindow) {
            console.warn('游戏窗口未在预期时间内创建，但进程仍在运行');
        } else {
            console.log('检测到游戏窗口已创建');
        }

        this.progress['wait-window'] = 1;
    }

    private async waitForGameWindowInternal(pid: number): Promise<boolean> {
        return new Promise((resolve) => {
            let timeoutId: NodeJS.Timeout | null = null;
            let intervalId: NodeJS.Timeout | null = null;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (intervalId) clearInterval(intervalId);
                timeoutId = null;
                intervalId = null;
            };

            timeoutId = setTimeout(() => {
                console.warn(`等待游戏窗口超时 (${LaunchWindowsX86.MAX_WINDOW_WAIT_TIME}ms)`);
                cleanup();
                resolve(false);
            }, LaunchWindowsX86.MAX_WINDOW_WAIT_TIME);

            intervalId = setInterval(() => {
                try {
                    this.checkCancelSignal();

                    if (!this.gameProcess || this.gameProcess.killed) {
                        console.warn('游戏进程已退出，停止等待窗口');
                        cleanup();
                        resolve(false);
                        return;
                    }

                    if (WinDetectAddon.isPidHasWindow(pid)) {
                        console.log('检测到游戏窗口');
                        cleanup();
                        resolve(true);
                    }

                } catch (error) {
                    console.error('检查游戏窗口时出错:', error);
                    cleanup();
                    resolve(false);
                }
            }, LaunchWindowsX86.WINDOW_CHECK_INTERVAL);

            this.once('canceled', () => {
                console.log('启动已取消，停止等待窗口');
                cleanup();
                resolve(false);
            });
        });
    }

    private modifyWindowTitle(pid: number): void {
        try {
            if (this.launchOptions.title) {
                console.log(`修改窗口标题为: ${this.launchOptions.title}`);
                WinDetectAddon.modifyWinTitle(pid, this.launchOptions.title);
            }
        } catch (error) {
            console.warn('修改窗口标题失败:', error);
        }
    }
}