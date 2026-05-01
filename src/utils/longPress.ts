type LongPressOptions = {
  delay?: number;
  moveTolerance?: number;
  onLongPress: (event: PointerEvent) => void;
};

export function bindLongPress(target: Element, options: LongPressOptions) {
  const delay = options.delay ?? 575;
  const moveTolerance = options.moveTolerance ?? 10;
  let timeoutId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastEvent: PointerEvent | null = null;

  const clear = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const onPointerDown = (event: Event) => {
    const pointerEvent = event as PointerEvent;
    if (pointerEvent.pointerType === "mouse") return;
    startX = pointerEvent.clientX;
    startY = pointerEvent.clientY;
    lastEvent = pointerEvent;
    clear();
    timeoutId = window.setTimeout(() => {
      if (lastEvent) options.onLongPress(lastEvent);
      clear();
    }, delay);
  };

  const onPointerMove = (event: Event) => {
    const pointerEvent = event as PointerEvent;
    lastEvent = pointerEvent;
    const dx = Math.abs(pointerEvent.clientX - startX);
    const dy = Math.abs(pointerEvent.clientY - startY);
    if (dx > moveTolerance || dy > moveTolerance) clear();
  };

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", clear);
  target.addEventListener("pointercancel", clear);
  target.addEventListener("scroll", clear);

  return () => {
    clear();
    target.removeEventListener("pointerdown", onPointerDown);
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", clear);
    target.removeEventListener("pointercancel", clear);
    target.removeEventListener("scroll", clear);
  };
}
