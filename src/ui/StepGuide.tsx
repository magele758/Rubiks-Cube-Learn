// StepGuide: 显示当前引导步骤的公式、为什么、原理，以及阶段进度。
import type { Solution } from '../solver';
import type { Move } from '../cube/types';

interface Props {
  solution: Solution | null;
  stepIndex: number;
  busy: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPlayAll: () => void;
}

function MoveTags({ moves }: { moves: Move[] }) {
  return (
    <span className="move-tags">
      {moves.map((m, i) => <code key={i} className="move-tag">{m}</code>)}
    </span>
  );
}

export function StepGuide({ solution, stepIndex, busy, onNext, onPrev, onPlayAll }: Props) {
  if (!solution) return null;

  const total = solution.steps.length;
  const notStarted = stepIndex < 0;
  const done = stepIndex >= total - 1 && total > 0;
  const step = notStarted ? null : solution.steps[stepIndex];

  // 当前阶段
  const phase = step
    ? solution.phases.find((p) => stepIndex >= p.startStepIndex && stepIndex < p.startStepIndex + p.stepCount)
    : solution.phases[0];

  return (
    <div className="guide">
      <div className="guide-head">
        <h2>还原引导</h2>
        <div className="guide-progress">
          {notStarted ? '准备开始' : `第 ${stepIndex + 1} / ${total} 步`}
          <span className="guide-moves">· 共 {solution.totalMoves} 步转动</span>
        </div>
      </div>

      {/* 阶段导航条 */}
      <div className="phase-bar">
        {solution.phases.map((p, i) => {
          const active = phase?.phase === p.phase && !notStarted;
          const passed = step && stepIndex >= p.startStepIndex + p.stepCount;
          return (
            <div key={`${p.phase}-${i}`} className={`phase-pill ${active ? 'active' : ''} ${passed ? 'passed' : ''}`}>
              {p.title.split('·')[1]?.trim() ?? p.title}
            </div>
          );
        })}
      </div>

      {notStarted && (
        <div className="guide-card intro">
          <p className="guide-goal">{solution.phases[0]?.goal}</p>
          <p className="muted">点击「下一步」开始逐步引导，每一步都会讲解公式、为什么这么做以及原理。</p>
        </div>
      )}

      {step && phase && (
        <div className="guide-card">
          <div className="guide-phase-title">{phase.title}</div>
          <div className="guide-alg">
            <span className="alg-name">{step.algorithmName}</span>
            <MoveTags moves={step.moves} />
          </div>
          <div className="guide-section">
            <h4>为什么这么做</h4>
            <p>{step.why}</p>
          </div>
          <div className="guide-section">
            <h4>原理</h4>
            <p>{step.principle}</p>
          </div>
        </div>
      )}

      {done && (
        <div className="guide-card success">🎉 还原完成！整套流程走完了，多练几次就能记住每个阶段的手法。</div>
      )}

      <div className="guide-actions">
        <button className="btn btn-ghost" disabled={busy || notStarted} onClick={onPrev}>← 上一步</button>
        <button className="btn btn-go" disabled={busy || done} onClick={onNext}>下一步 →</button>
        <button className="btn btn-ghost" disabled={busy || done} onClick={onPlayAll}>▶ 自动播放</button>
      </div>
    </div>
  );
}
