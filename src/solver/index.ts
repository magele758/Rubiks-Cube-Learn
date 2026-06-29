// 求解器统一出口：solve(state) -> 带教学元数据的完整 Solution。
import type { CubeState, Move } from '../cube/types';
import { applyMoves } from '../cube/moves';
import { solve3x3Raw } from './solve3x3';
import { solve2x2Raw } from './solve2x2';
import { PHASE_TEXT, caseText } from '../teaching/content';
import type { Solution, SolutionStep, PhaseSummary, PhaseId } from './types';
import type { RawStep } from './engine';

export * from './types';

/** 求解给定状态，返回逐步教学解法。initial 即传入的（通常是打乱后的）状态。 */
export function solve(initial: CubeState, scramble: Move[] = []): Solution {
  const raw: RawStep[] = initial.order === 3 ? solve3x3Raw(initial) : solve2x2Raw(initial);

  const steps: SolutionStep[] = [];
  let cur = initial;
  raw.forEach((r, index) => {
    const before = cur;
    const after = applyMoves(cur, r.moves);
    const ct = caseText(r.caseId);
    steps.push({
      index,
      phase: r.phase,
      phaseTitle: PHASE_TEXT[r.phase].title,
      caseId: r.caseId,
      algorithmName: r.algorithmName,
      moves: r.moves,
      why: ct.why,
      principle: ct.principle,
      targetFacelets: r.targetFacelets,
      stateBefore: before,
      stateAfter: after,
    });
    cur = after;
  });

  // 阶段概览
  const phases: PhaseSummary[] = [];
  let i = 0;
  while (i < steps.length) {
    const phase = steps[i].phase;
    const start = i;
    while (i < steps.length && steps[i].phase === phase) i++;
    phases.push({
      phase,
      title: PHASE_TEXT[phase].title,
      goal: PHASE_TEXT[phase].goal,
      startStepIndex: start,
      stepCount: i - start,
    });
  }

  const totalMoves = steps.reduce((a, s) => a + s.moves.length, 0);
  return {
    order: initial.order,
    scramble,
    initial,
    steps,
    phases,
    solvedState: cur,
    totalMoves,
  };
}

export type { Solution, SolutionStep, PhaseSummary, PhaseId };
