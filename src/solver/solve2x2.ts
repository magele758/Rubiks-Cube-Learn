// 2x2 层先法求解：底层 4 角 → 顶面定向(OLL) → 顶层排列(PLL) → 收尾。
// 2x2 只有角块，无棱无中心，结构与 3x3 的角块阶段同构。
import type { CubeState } from '../cube/types';
import {
  solveByMacro, ollFaceFacelets, allFacelets,
  SUNE, ANTISUNE, P2_PLL_ADJ, P2_PLL_DIAG,
  type RawStep,
} from './engine';
import { solveLayer, cornerSlots } from './layers';

const EPS = 0.001;

export function solve2x2Raw(initial: CubeState): RawStep[] {
  const steps: RawStep[] = [];
  let cur = initial;

  // 1. 底层一层（4 个白角）
  {
    const corners = cornerSlots(2);
    const bottom = corners.filter((s) => s.position[1] < -EPS);
    const r = solveLayer(cur, bottom, corners, [], 'p2-layer1', 'p2-layer1', '底层角块');
    steps.push(...r.steps); cur = r.state;
  }
  // 2. 顶面全黄（OLL，重复 Sune / Anti-Sune）
  {
    const r = solveByMacro(cur, [SUNE, ANTISUNE], ollFaceFacelets(2), 'p2-oll', 8);
    steps.push(...r.steps); cur = r.state;
  }
  // 3. 顶层角块排列（PLL：邻角换 / 对角换 / AUF）
  {
    const r = solveByMacro(cur, [P2_PLL_ADJ, P2_PLL_DIAG, null], allFacelets(2), 'p2-pll', 5);
    steps.push(...r.steps); cur = r.state;
  }
  return steps;
}
