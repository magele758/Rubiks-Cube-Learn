import { describe, it, expect } from 'vitest';
import { scramble } from '../cube/scramble';
import { applyMoves } from '../cube/moves';
import { isSolved, solved } from '../cube/facelets';
import { solve3x3Raw } from '../solver/solve3x3';
import { solve2x2Raw } from '../solver/solve2x2';

describe('3x3 求解器收敛性', () => {
  it('对 30 次随机打乱全部还原', () => {
    let maxMoves = 0;
    const t0 = Date.now();
    for (let n = 0; n < 30; n++) {
      const { state } = scramble(3);
      const steps = solve3x3Raw(state);
      let cur = state;
      for (const s of steps) cur = applyMoves(cur, s.moves);
      expect(isSolved(cur), `第 ${n} 次未还原`).toBe(true);
      const moves = steps.reduce((a, s) => a + s.moves.length, 0);
      maxMoves = Math.max(maxMoves, moves);
    }
    const dt = Date.now() - t0;
    console.log(`30 次平均耗时 ${(dt / 30).toFixed(0)}ms，最长解 ${maxMoves} 步`);
  }, 120000);

  it('已还原的魔方返回空解', () => {
    const steps = solve3x3Raw(solved(3));
    const moves = steps.reduce((a, s) => a + s.moves.length, 0);
    expect(moves).toBe(0);
  });
});

describe('2x2 求解器收敛性', () => {
  it('对 50 次随机打乱全部还原', () => {
    for (let n = 0; n < 50; n++) {
      const { state } = scramble(2);
      const steps = solve2x2Raw(state);
      let cur = state;
      for (const s of steps) cur = applyMoves(cur, s.moves);
      expect(isSolved(cur), `第 ${n} 次未还原`).toBe(true);
    }
  }, 60000);

  it('已还原的 2x2 返回空解', () => {
    const steps = solve2x2Raw(solved(2));
    const moves = steps.reduce((a, s) => a + s.moves.length, 0);
    expect(moves).toBe(0);
  });
});
