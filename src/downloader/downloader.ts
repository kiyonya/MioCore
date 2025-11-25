import EventEmitter from "events";
import pLimit, { type LimitFunction } from "p-limit";

import DownloadTask from "./downloadtask.ts";

export default class ConcDownloader extends EventEmitter {
  public concurrency: number;
  public limit: LimitFunction;
  public tasks: DownloadTask[];
  public promiseTasks: Promise<string>[];
  protected emitInterval: NodeJS.Timeout | null

  constructor(concurrency: number) {
    super();
    this.concurrency = concurrency;
    this.limit = pLimit(this.concurrency);
    this.tasks = [];
    this.promiseTasks = [];
    this.emitInterval = null
  }

  public add(downloadTask: DownloadTask) {
    if (!(downloadTask instanceof DownloadTask)) {
      throw new Error("add task must an instance of DownloadTask");
    }

    this.tasks.push(downloadTask);
  }

  public async download() {
    this.promiseTasks = this.tasks.map((downloadTask) => this.limit(() => downloadTask.download()))
    this.emitInterval = setInterval(() => {
      this.emitStatus()
    }, 50)
    try {
      await Promise.all(this.promiseTasks);
      this.emit('progress', 1)
      this.emit('speed', 0)
      this.close()
    } catch (err) {
      throw err;
    }
  }

  protected emitStatus() {
    let speed = 0
    let totalProgress = 0
    let completedTasks = 0

    for (let task of this.tasks) {
      if (task.status === 'pending') {
        speed += task.speed || 0
      }
      totalProgress += task.progress || 0
      if (task.status === 'complete') {
        completedTasks++
      }
    }
    const progress = totalProgress / this.tasks.length
    this.emit('progress', progress)
    this.emit('tasklast', this.tasks.length - completedTasks)
    this.emit('speed', speed)
  }

  public close() {
    this.emitInterval && clearInterval(this.emitInterval)
    this.emitInterval = null
    for (let task of this.tasks) {
      task.close()
    }
    this.tasks.length = 0
    this.promiseTasks.length = 0
    this.removeAllListeners()
  }

  public async abort() {
    this.limit.clearQueue()
    for (const task of this.tasks) {
      await task.abort()
    }
    this.tasks.length = 0
    this.promiseTasks.length = 0
    console.log("下载已暂停")
    this.close()
  }
}
