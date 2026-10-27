// The panel's code calls window.setTimeout; under Node, window is the global object, so Vitest's fake
// timers (which replace the global setTimeout) control it too.
(globalThis as { window?: unknown }).window ??= globalThis;
