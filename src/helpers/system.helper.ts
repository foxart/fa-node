import ms from 'ms';

class SystemSingleton {
  private static self: SystemSingleton;

  private readonly timeMap: Map<string, [number, number]>;

  private constructor() {
    this.timeMap = new Map();
  }

  public static getInstance(): SystemSingleton {
    if (!SystemSingleton.self) {
      SystemSingleton.self = new SystemSingleton();
    }
    return SystemSingleton.self;
  }

  public timeStart(label?: string): void {
    this.timeMap.set(label ?? 'default', process.hrtime());
  }

  public timeEnd(label?: string): number {
    const diff = process.hrtime(this.timeMap.get(label ?? 'default'));
    this.timeMap.delete(label ?? 'default');
    return parseFloat((diff[0] * 1e3 + diff[1] / 1e6).toFixed(3));
  }

  public millisecondsToHhMmSs(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }

  public sleep(time: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout((): void => {
        resolve();
      }, ms(time));
    });
  }
}

export const SystemHelper = SystemSingleton.getInstance();
