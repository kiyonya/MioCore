import EventEmitter from "events";
import fs from "fs";
import path, { resolve } from "path";
import crypto from "crypto";
import { DownloaderHelper } from "node-downloader-helper";

interface DownloadTaskOptions {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

export default class DownloadTask extends EventEmitter {
  public urls: string[];
  public destPath: string;
  public sha1?: string;
  public override: boolean;

  public progress: number;
  public speed: number;
  public status: "pending" | "complete" | "fail";

  protected downloader: DownloaderHelper | null;
  public downloadTaskOptions: DownloadTaskOptions;

  constructor(
    urls: string[],
    destPath: string,
    sha1?: string,
    override: boolean = false,
    downloadTaskOptions: DownloadTaskOptions = {
      maxRetries: 10,
      retryDelay: 200,
      timeout: 10000,
    }
  ) {
    super();
    this.urls = urls;
    this.destPath = destPath;
    this.sha1 = sha1 || undefined;
    this.override = override;

    this.status = "pending";
    this.progress = 0;
    this.speed = 0;
    this.downloadTaskOptions = downloadTaskOptions;
    this.downloader = null;
  }

  public async download(): Promise<string> {
    if (this.isFileExist() && !this.override) {
      const isValid = await this.isFileValid();
      if (isValid) {
        this.finTask();
        return this.destPath;
      } else {
        fs.rmSync(this.destPath, { force: true });
      }
    } else if (this.override && this.isFileExist()) {
      fs.rmSync(this.destPath, { force: true });
    }

    this.status = "pending";

    for (const url of this.urls) {
      try {
        const result = await this.tryDownload(url);
        if (result) {
          this.finTask();
          return result;
        }
      } catch (error) {
        console.error(`Download failed for URL: ${url}`, error);
        continue;
      }
    }
    this.status = "fail";
    throw new Error(`All download attempts failed for: ${this.destPath}`);
  }

  protected async tryDownload(url: string): Promise<string | null> {
    for (let attempt = 0; attempt < this.downloadTaskOptions.maxRetries; attempt++) {
      try {
        await this.downloadFile(url);
        const isValid = await this.isFileValid();
        if (isValid) {
          return this.destPath;
        } else {
          fs.rmSync(this.destPath, { force: true });
          throw new Error("File validation failed - SHA1 mismatch");
        }
      } catch (error) {
        if (fs.existsSync(this.destPath)) {
          fs.rmSync(this.destPath, { force: true });
        }
        if (attempt === this.downloadTaskOptions.maxRetries - 1) {
          throw error;
        }
        if (this.downloadTaskOptions.retryDelay > 0) {
          await this.sleep(this.downloadTaskOptions.retryDelay);
        }
      }
    }

    return null;
  }

  protected downloadFile(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(path.dirname(this.destPath))) {
        fs.mkdirSync(path.dirname(this.destPath), { recursive: true });
      }

      this.downloader = new DownloaderHelper(
        url,
        path.dirname(this.destPath),
        {
          override: this.override,
          timeout: this.downloadTaskOptions.timeout,
          fileName: path.basename(this.destPath),
          removeOnFail: true,
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
          },
        }
      );

      this.downloader.on("end", () => {
        resolve();
      });

      this.downloader.on("error", (error) => {
        reject(error);
      });

      this.downloader.on("progress", (stats) => {
        this.progress = stats.progress / 100;
        this.speed = stats.speed;
        this.emit("progress", this.progress);
        this.emit("speed", this.speed);
      });

      this.downloader.start().catch(reject);
    });
  }

  protected isFileValid(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.sha1) {
        resolve(true);
      }

      const hash = crypto.createHash("sha1");
      const stream = fs.createReadStream(this.destPath);

      stream.on("data", (chunk) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        const fileHash = hash.digest("hex");
        stream.destroy();
        resolve(fileHash === this.sha1?.toLowerCase());
      });

      stream.on("error", (err) => {
        stream.destroy();
        reject(err);
      });
    });
  }

  protected isFileExist(): boolean {
    return fs.existsSync(this.destPath);
  }

  protected finTask() {
    this.progress = 1;
    this.status = "complete";
    this.speed = 0;
    this.close();
    this.emit("progress", this.progress);
    this.emit("speed", this.speed);

  }

  public async pause(): Promise<boolean> {
    return (await this.downloader?.pause()) || false;
  }

  public async resume(): Promise<boolean> {
    return (await this.downloader?.resume()) || false;
  }

  public close() {
    this.downloader?.removeAllListeners();
    this.removeAllListeners();
    this.downloader = null;
  }

  protected sleep(time: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }
}
