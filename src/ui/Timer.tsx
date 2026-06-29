// 计时器：支持 inspection 预览、计时、成绩记录（best / ao5），localStorage 持久化。
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Order } from '../cube/types';

interface Solve { ms: number; at: number; }

const KEY = (order: Order) => `cube-times-${order}`;

function load(order: Order): Solve[] {
  try {
    const raw = localStorage.getItem(KEY(order));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function save(order: Order, solves: Solve[]) {
  try { localStorage.setItem(KEY(order), JSON.stringify(solves.slice(-50))); } catch { /* ignore */ }
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  return `${sec}.${String(cs).padStart(2, '0')}`;
}

function ao5(solves: Solve[]): number | null {
  if (solves.length < 5) return null;
  const last5 = solves.slice(-5).map((s) => s.ms).sort((a, b) => a - b);
  // 去掉最好最差，取中间 3 个平均
  const mid = last5.slice(1, 4);
  return mid.reduce((a, b) => a + b, 0) / 3;
}

export function Timer({ order }: { order: Order }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [solves, setSolves] = useState<Solve[]>(() => load(order));
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => { setSolves(load(order)); setElapsed(0); setRunning(false); }, [order]);

  const tick = useCallback(() => {
    setElapsed(performance.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    startRef.current = performance.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    const ms = performance.now() - startRef.current;
    setElapsed(ms);
    setSolves((prev) => {
      const next = [...prev, { ms, at: Date.now() }];
      save(order, next);
      return next;
    });
  }, [order]);

  // 空格键开始/停止
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
      e.preventDefault();
      if (running) stop(); else start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, start, stop]);

  const best = solves.length ? Math.min(...solves.map((s) => s.ms)) : null;
  const avg = ao5(solves);

  return (
    <div className="timer">
      <div className={`timer-display ${running ? 'running' : ''}`}>{fmt(elapsed)}</div>
      <div className="timer-actions">
        {running
          ? <button className="btn btn-stop" onClick={stop}>停止</button>
          : <button className="btn btn-go" onClick={start}>开始计时</button>}
        <span className="timer-hint">按空格键也可开始 / 停止</span>
      </div>
      <div className="timer-stats">
        <div><span className="label">最佳</span><span className="val">{best != null ? fmt(best) : '—'}</span></div>
        <div><span className="label">近5平均</span><span className="val">{avg != null ? fmt(avg) : '—'}</span></div>
        <div><span className="label">已记录</span><span className="val">{solves.length}</span></div>
      </div>
      {solves.length > 0 && (
        <div className="timer-recent">
          {solves.slice(-8).reverse().map((s, i) => (
            <span key={s.at} className={s.ms === best ? 'pb' : ''}>{fmt(s.ms)}{i === 0 ? '' : ''}</span>
          ))}
        </div>
      )}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => { setSolves([]); save(order, []); setElapsed(0); }}
      >清空记录</button>
    </div>
  );
}
