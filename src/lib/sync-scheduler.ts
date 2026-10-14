export interface SyncSchedulerOptions {
  read: () => Promise<void>;
  active: () => boolean;
  subscribed: () => boolean;
  failed: (error: unknown) => void;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}
// One read in flight; events arriving during it request one follow-up.
export function createSyncScheduler(options: SyncSchedulerOptions) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;
  let stopped = false;
  let retryDelay = 30000;
  let retrying = false;
  const arm = (delay: number) => {
    if (timer !== undefined) cancel(timer);
    timer = schedule(() => { timer = undefined; void run(); }, delay);
  };
  const run = async () => {
    if (stopped || !options.active()) return;
    if (running) { pending = true; return; }
    running = true;
    let failed = false;
    try { await options.read(); retryDelay = 30000; retrying = false; }
    catch (error) { failed = true; retrying = true; options.failed(error); retryDelay = Math.min(300000, retryDelay * 2); }
    finally {
      running = false;
      if (stopped) return;
      if (failed) { pending = false; arm(retryDelay); }
      else if (pending) { pending = false; arm(100); }
      else arm(options.subscribed() ? 300000 : retryDelay);
    }
  };
  return {
    request() { if (stopped || !options.active()) return; if (running) pending = true; else if (!retrying || timer === undefined) arm(100); },
    pause() { if (timer !== undefined) cancel(timer); timer = undefined; },
    stop() { stopped = true; if (timer !== undefined) cancel(timer); },
  };
}
