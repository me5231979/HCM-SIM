import { motion } from 'motion/react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { personById } from '../content';
import { useGame } from '../store/game';
import { Icon } from './icons';

export const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

export function Avatar({ id, size = 40 }: { id: string; size?: number }) {
  const p = personById(id);
  const initials = p.name.replace(/^Dr\.\s*/, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
  return <span className={`avatar avatar--${p.outfit}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">{initials}</span>;
}

/** Word-by-word blur reveal (adapted from the MotionSites BlurText pattern). One italic word per headline. */
export function BlurText({ text, italic, className, as: Tag = 'h1', delay = 0.08 }: { text: string; italic?: string; className?: string; as?: 'h1' | 'h2' | 'p'; delay?: number }) {
  const reduced = useGame((s) => s.settings.reducedMotion);
  const words = text.split(' ');
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => {
        const bare = w.replace(/[.,!?]$/, '');
        const punct = w.slice(bare.length);
        const inner = bare === italic ? <><em>{bare}</em>{punct}</> : w;
        return reduced ? <span key={i} aria-hidden="true">{inner}{i < words.length - 1 ? ' ' : ''}</span> : (
          <motion.span key={i} aria-hidden="true" style={{ display: 'inline-block', whiteSpace: 'pre' }}
            initial={{ filter: 'blur(12px)', opacity: 0, y: 24 }} animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 + i * delay, ease: [0.2, 0.7, 0.2, 1] }}>
            {inner}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        );
      })}
    </Tag>
  );
}

/**
 * Accessible dialog shell: focus moves in once on open, Escape closes, focus returns to the opener.
 * Content scrolls inside .panel-body so the glass background and close button stay put.
 */
export function Dialog({ label, onClose, children, className = '', modal = true, labelId, style }: { label?: string; labelId?: string; onClose?: () => void; children: ReactNode; className?: string; modal?: boolean; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the focus effect on every render (the clock re-renders often).
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus], h2, button, [href], input, select');
    if (first && first.tagName === 'H2') first.setAttribute('tabindex', '-1');
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && close.current) { e.stopPropagation(); close.current(); }
      if (e.key === 'Tab' && modal && el) {
        const f = [...el.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => { el?.removeEventListener('keydown', onKey); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); };
  }, [modal]);
  return (
    <div ref={ref} role="dialog" aria-modal={modal || undefined} aria-label={labelId ? undefined : label} aria-labelledby={labelId} className={`panel ${className}`} style={style}>
      {onClose && <button className="icon-btn close" onClick={onClose} aria-label="Close"><Icon.close /></button>}
      <div className="panel-body">{children}</div>
    </div>
  );
}

export function priorityLabel(p: 'low' | 'normal' | 'high' | 'urgent') {
  return { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }[p];
}
