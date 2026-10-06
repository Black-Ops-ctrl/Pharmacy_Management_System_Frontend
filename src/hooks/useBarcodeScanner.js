import { useEffect, useRef } from 'react';

const FAST_MS = 35;
const MIN_FAST = 3;
const MIN_LEN = 4;
const IDLE_MS = 120;

const isField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.readOnly;

const setNativeValue = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

export default function useBarcodeScanner(active, onScan) {
  const cb = useRef(onScan);
  useEffect(() => { cb.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!active) return undefined;
    const s = { buf: '', last: 0, fast: 0, scanning: false, el: null, val: null, timer: null };

    const reset = () => { s.buf = ''; s.fast = 0; s.scanning = false; s.el = null; s.val = null; clearTimeout(s.timer); };
    const finish = () => {
      const code = s.buf.trim();
      const ok = s.scanning && code.length >= MIN_LEN;
      reset();
      if (ok && cb.current) cb.current(code);
      return ok;
    };

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (s.scanning) { e.preventDefault(); e.stopPropagation(); finish(); }
        else reset();
        return;
      }
      if (e.key.length !== 1) return;
      const now = performance.now();
      const gap = now - s.last;
      s.last = now;
      clearTimeout(s.timer);
      if (gap > FAST_MS || !s.buf) {
        s.buf = e.key; s.fast = 0; s.scanning = false;
        s.el = document.activeElement;
        s.val = isField(s.el) ? s.el.value : null;
      } else {
        s.buf += e.key;
        s.fast += 1;
        if (!s.scanning && s.fast >= MIN_FAST - 1) {
          s.scanning = true;
          if (isField(s.el) && s.val !== null && s.el.value !== s.val) setNativeValue(s.el, s.val);
        }
      }
      if (s.scanning) { e.preventDefault(); e.stopPropagation(); }
      s.timer = setTimeout(() => { if (s.scanning) finish(); else reset(); }, IDLE_MS);
    };

    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); clearTimeout(s.timer); };
  }, [active]);
}
