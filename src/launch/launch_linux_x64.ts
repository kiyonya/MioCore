
import {type LaunchOptions } from "../types/index.ts";
import LaunchBase, { type LauncherCreateOptions, type LaunchAuthOptions } from "./launch_base.ts";

export default class LaunchLinuxX64 extends LaunchBase {

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

            const pid = await this.createGameProcess(this.javaExecutablePath, jvmArgs, mainClass, gameArgs);

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

}