// App: 顶层布局，串起 3D 画布、控制面板、计时器、引导面板。
import { useRef, useState, useCallback } from 'react';
import type { Order } from '../cube/types';
import { solved } from '../cube/facelets';
import { CubeCanvas, type CubeHandle } from './CubeCanvas';
import { Controls } from './Controls';
import { Timer } from './Timer';
import { StepGuide } from './StepGuide';
import { useSolver } from './useSolver';

export default function App() {
  const [order, setOrder] = useState<Order>(3);
  const cubeRef = useRef<CubeHandle>(null);
  const solver = useSolver(order, cubeRef);

  const handleOrderChange = useCallback((o: Order) => {
    if (o === order) return;
    setOrder(o);
    // CubeCanvas 在 order 变化时重建；逻辑状态复位
    setTimeout(() => {
      cubeRef.current?.setStateInstant(solved(o));
    }, 0);
    solver.reset();
  }, [order, solver]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>魔方学习室</h1>
        <p className="tagline">标准流程打乱 · 分层法逐步引导 · 讲清每一步的为什么和原理 · 练习计时</p>
      </header>

      <main className="app-main">
        <section className="stage">
          <div className="canvas-wrap">
            <CubeCanvas key={order} ref={cubeRef} order={order} initial={solved(order)} />
            {solver.busy && <div className="canvas-badge">动画中…</div>}
            <div className="canvas-hint">拖拽旋转视角 · 滚轮缩放</div>
          </div>
          <Timer order={order} />
        </section>

        <section className="sidebar">
          <Controls
            order={order}
            mode={solver.mode}
            busy={solver.busy}
            onOrderChange={handleOrderChange}
            onScramble={solver.scramble}
            onStartGuide={solver.startGuide}
            onReset={solver.reset}
            onManual={(m) => solver.applyManual([m])}
          />
          {solver.mode === 'guiding' && solver.solution && (
            <StepGuide
              solution={solver.solution}
              stepIndex={solver.stepIndex}
              busy={solver.busy}
              onNext={solver.nextStep}
              onPrev={solver.prevStep}
              onPlayAll={solver.playAll}
            />
          )}
          {solver.mode !== 'guiding' && (
            <div className="hint-card">
              <h3>怎么用</h3>
              <ol>
                <li>选择 2 阶或 3 阶魔方</li>
                <li>点「打乱」，魔方会按标准流程随机打乱</li>
                <li>想自己练就用计时器（空格开始/停止）</li>
                <li>卡住了点「还原引导」，跟着一步步走，每步都讲为什么</li>
              </ol>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
