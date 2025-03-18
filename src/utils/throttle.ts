/**
 * 並列実行を制御するスロットリングクラス
 */
export class Throttler {
  private queue: Array<() => Promise<unknown>> = [];
  private running = 0;
  private timer: number | undefined;

  constructor(
    private maxConcurrent: number = 3,
    private delayMs: number = 1000,
  ) {}

  /**
   * タスクを追加して実行
   */
  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * キューの処理
   */
  private async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift()!;

    try {
      await task();
    } catch (error) {
      console.error("[ERROR] タスク実行中にエラーが発生しました:", error);
    }

    // 遅延を入れて次のタスクを実行
    await new Promise((resolve) => {
      this.timer = setTimeout(() => {
        this.running--;
        this.processQueue();
        resolve(undefined);
      }, this.delayMs);
    });
  }

  /**
   * 複数のタスクを並列実行（スロットリング付き）
   */
  all<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.add(task)));
  }

  /**
   * キューをクリア
   */
  clear() {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}
