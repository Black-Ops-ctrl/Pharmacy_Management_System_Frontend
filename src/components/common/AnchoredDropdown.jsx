import { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const EDGE = 8;

const AnchoredDropdown = ({ anchorRef, open, onClose, children, gap = 4, matchWidth = true }) => {
  const [pos, setPos] = useState(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return undefined;
    const update = () => {
      const r = anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panel = panelRef.current;
      const natural = panel ? panel.scrollHeight : 0;
      const width = Math.min(matchWidth ? r.width : (panel ? panel.offsetWidth : r.width), vw - EDGE * 2);
      const left = Math.min(Math.max(EDGE, r.left), vw - width - EDGE);
      const below = vh - r.bottom - gap - EDGE;
      const above = r.top - gap - EDGE;
      const up = natural > below && above > below && below < 160;
      const room = Math.max(80, up ? above : below);
      const height = natural ? Math.min(natural, room) : null;
      const top = up ? r.top - gap - (height || room) : r.bottom + gap;
      setPos({ top, left, width, maxHeight: room });
    };
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef, gap, matchWidth]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (
        anchorRef?.current && !anchorRef.current.contains(e.target) &&
        !e.target.closest?.('.anchored-dd')
      ) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="anchored-dd custom-scrollbar"
      style={{
        position: 'fixed',
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : 0,
        width: pos ? pos.width : undefined,
        maxHeight: pos ? pos.maxHeight : undefined,
        overflowY: 'auto',
        visibility: pos ? 'visible' : 'hidden',
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default AnchoredDropdown;
