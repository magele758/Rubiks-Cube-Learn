// 3x3 分层法求解：cross → 第一层角 → 第二层棱 → 黄十字 → 顶面 → PLL → AUF。
import type { CubeState } from '../cube/types';
import { applyMoves } from '../cube/moves';
import { searchToGoal, buildMoveSet, toNumeric } from './search';
import {
  groupByPiece, solveByMacro,
  crossFacelets, f1lCornerFacelets,
  ollEdgeFacelets, ollFaceFacelets, allFacelets,
  OLL_EDGE, SUNE, ANTISUNE, PLL_ALGS,
  type RawStep,
} from './engine';
import { solveLayer, cornerSlots, edgeSlots } from './layers';

const EPS = 0.001;

export function solve3x3Raw(initial: CubeState): RawStep[] {
  const steps: RawStep[] = [];
  let cur = initial;

  // 1. 白十字：逐棱全面搜索（浅、快），不破坏已插入的
  {
    const ms = buildMoveSet(3);
    const solvedSoFar: number[] = [];
    for (const slot of groupByPiece(3, crossFacelets(3))) {
      const moves = searchToGoal(toNumeric(cur), [...solvedSoFar, ...slot], ms, { maxDepth: 8 });
      if (moves === null) throw new Error('cross: 搜索失败');
      solvedSoFar.push(...slot);
      if (moves.length) {
        cur = applyMoves(cur, moves);
        steps.push({ phase: 'cross', caseId: 'cross-edge', algorithmName: '白十字插入', moves, targetFacelets: slot });
      }
    }
  }
  // 2. 第一层角块（insert-or-eject，受限生成元）
  {
    const corners = cornerSlots(3);
    const bottom = corners.filter((s) => s.position[1] < -EPS);
    const r = solveLayer(cur, bottom, corners, crossFacelets(3), 'f1l-corners', 'f1l-corner', '底层角块');
    steps.push(...r.steps); cur = r.state;
  }
  // 3. 第二层棱块
  {
    const edges = edgeSlots(3);
    const middle = edges.filter((s) => Math.abs(s.position[1]) < EPS);
    const prev = [...crossFacelets(3), ...f1lCornerFacelets(3)];
    const r = solveLayer(cur, middle, edges, prev, 'f2l-edges', 'f2l-edge', '中层棱块');
    steps.push(...r.steps); cur = r.state;
  }
  // 4. 顶层黄十字
  {
    const r = solveByMacro(cur, [OLL_EDGE], ollEdgeFacelets(3), 'oll-edges', 5);
    steps.push(...r.steps); cur = r.state;
  }
  // 5. 顶面全黄
  {
    const r = solveByMacro(cur, [SUNE, ANTISUNE], ollFaceFacelets(3), 'oll-corners', 8);
    steps.push(...r.steps); cur = r.state;
  }
  // 6+7. PLL（角块+棱块排列，含收尾 AUF）
  {
    const algs = [...PLL_ALGS, null];
    const r = solveByMacro(cur, algs, allFacelets(3), 'pll', 6);
    steps.push(...r.steps); cur = r.state;
  }
  return steps;
}
