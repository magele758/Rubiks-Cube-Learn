import { describe, it, expect } from 'vitest';
import { scramble } from '../cube/scramble';
import { isSolved } from '../cube/facelets';
import { applyMoves } from '../cube/moves';
import { solve } from '../solver';
import type { Order } from '../cube/types';

describe('solve() 教学包装层', () => {
  for (const order of [2, 3] as Order[]) {
    it(`${order}阶：每步 stateBefore/After 连续，且最终还原、文案齐全`, () => {
      for (let n = 0; n < 20; n++) {
        const { state, moves } = scramble(order);
        const sol = solve(state, moves);

        // 初态一致
        expect(sol.initial.facelets).toEqual(state.facelets);
        // 步与步之间状态连续
        for (let i = 0; i < sol.steps.length; i++) {
          const step = sol.steps[i];
          // 每步 moves 应用到 before 得到 after
          expect(applyMoves(step.stateBefore, step.moves).facelets).toEqual(step.stateAfter.facelets);
          if (i > 0) {
            expect(step.stateBefore.facelets).toEqual(sol.steps[i - 1].stateAfter.facelets);
          }
          // 教学文案非空
          expect(step.why.length).toBeGreaterThan(0);
          expect(step.principle.length).toBeGreaterThan(0);
          expect(step.algorithmName.length).toBeGreaterThan(0);
          expect(step.phaseTitle.length).toBeGreaterThan(0);
        }
        // 最终还原
        expect(isSolved(sol.solvedState)).toBe(true);
        // 阶段覆盖所有步
        const covered = sol.phases.reduce((a, p) => a + p.stepCount, 0);
        expect(covered).toBe(sol.steps.length);
        // 阶段都有目标讲解
        for (const p of sol.phases) expect(p.goal.length).toBeGreaterThan(0);
      }
    }, 60000);
  }
});
