interface CoalescedReloaderOptions {
  onError: (error: unknown) => void;
  debounceMs?: number;
  maxWaitMs?: number;
}

// Realtime bursts share one reload. Events during a reload request one follow-up.
export function createCoalescedReloader(
  action: () => Promise<void>,
  options: CoalescedReloaderOptions,
) {
  const debounceMs = options.debounceMs ?? 50;
  const maxWaitMs = options.maxWaitMs ?? debounceMs * 3;
  let cancelled = false;
  let running = false;
  let followUp = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let burstStartedAt: number | undefined;

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
    burstStartedAt = undefined;
  }

  async function execute() {
    if (cancelled) return;
    running = true;
    try {
      await action();
    } catch (error) {
      if (!cancelled) options.onError(error);
    } finally {
      running = false;
      if (followUp && !cancelled) {
        followUp = false;
        void execute();
      }
    }
  }

  return {
    schedule({ immediate = false }: { immediate?: boolean } = {}) {
      if (cancelled) return;
      if (running) {
        followUp = true;
        return;
      }
      if (immediate) {
        clearTimer();
        void execute();
        return;
      }

      const now = Date.now();
      burstStartedAt ??= now;
      clearTimeout(timer);
      const delay = Math.min(debounceMs, Math.max(0, maxWaitMs - (now - burstStartedAt)));
      timer = setTimeout(() => {
        clearTimer();
        void execute();
      }, delay);
    },
    cancel() {
      cancelled = true;
      followUp = false;
      clearTimer();
    },
    get isCancelled() { return cancelled; },
  };
}
