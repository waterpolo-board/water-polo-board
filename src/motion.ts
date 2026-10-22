// מנוע תנועה קטן: עקומות האטה וטווינים על requestAnimationFrame.

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outQuart: (t: number) => 1 - (1 - t) ** 4,
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
} satisfies Record<string, Ease>;

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface TweenOptions {
  duration: number;
  delay?: number;
  ease?: Ease;
  update?: (t: number) => void;
}

export interface Tween {
  done: Promise<boolean>; // true = הסתיים, false = בוטל
  cancel: () => void;
}

/** מריץ update(t) עם t בין 0 ל-1 (אחרי האטה). אפשר לבטל באמצע. */
export function tween({ duration, delay = 0, ease: e = ease.outQuart, update }: TweenOptions): Tween {
  let raf = 0;
  let settle: (finished: boolean) => void = () => {};
  const done = new Promise<boolean>((resolve) => (settle = resolve));

  if (duration <= 0 && delay <= 0) {
    update?.(1);
    settle(true);
    return { done, cancel: () => {} };
  }

  const start = performance.now() + delay;
  const frame = (now: number) => {
    const raw = duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
    if (now >= start) update?.(e(raw));
    if (raw < 1 || now < start) raf = requestAnimationFrame(frame);
    else settle(true);
  };
  raf = requestAnimationFrame(frame);

  return {
    done,
    cancel: () => {
      cancelAnimationFrame(raf);
      settle(false);
    },
  };
}

export const wait = (ms: number): Tween => tween({ duration: ms, ease: ease.linear });
