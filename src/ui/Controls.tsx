// Controls: 阶数切换、打乱、开始引导、重置、手动转动。
import type { Order } from '../cube/types';
import type { Mode } from './useSolver';

interface Props {
  order: Order;
  mode: Mode;
  busy: boolean;
  onOrderChange: (o: Order) => void;
  onScramble: () => void;
  onStartGuide: () => void;
  onReset: () => void;
  onManual: (move: string) => void;
}

const MANUAL_MOVES = ['U', "U'", 'R', "R'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'"];

export function Controls({
  order, mode, busy, onOrderChange, onScramble, onStartGuide, onReset, onManual,
}: Props) {
  return (
    <div className="controls">
      <div className="control-group">
        <label className="control-label">魔方阶数</label>
        <div className="seg">
          <button className={`seg-btn ${order === 2 ? 'on' : ''}`} disabled={busy} onClick={() => onOrderChange(2)}>2 阶</button>
          <button className={`seg-btn ${order === 3 ? 'on' : ''}`} disabled={busy} onClick={() => onOrderChange(3)}>3 阶</button>
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">练习流程</label>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={busy} onClick={onScramble}>🔀 打乱</button>
          <button className="btn btn-go" disabled={busy || mode === 'idle'} onClick={onStartGuide}>📖 还原引导</button>
          <button className="btn btn-ghost" disabled={busy} onClick={onReset}>↺ 复位</button>
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">手动转动（自己拧）</label>
        <div className="manual-grid">
          {MANUAL_MOVES.map((m) => (
            <button key={m} className="btn btn-mini" disabled={busy} onClick={() => onManual(m)}>{m}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
