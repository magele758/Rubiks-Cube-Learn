// 求解器类型与教学元数据接口。
import type { Order, Move, CubeState } from '../cube/types';

/** 求解阶段标识。 */
export type PhaseId =
  // 3x3 分层法
  | 'cross' | 'f1l-corners' | 'f2l-edges'
  | 'oll-edges' | 'oll-corners' | 'pll' | 'auf'
  // 2x2 层先法
  | 'p2-layer1' | 'p2-oll' | 'p2-pll';

/** 单步求解：携带 move 序列 + 完整教学元数据。 */
export interface SolutionStep {
  index: number; // 全局步号（从 0 起）
  phase: PhaseId;
  phaseTitle: string;
  caseId: string; // 识别到的情形，如 'cross-edge' / 'oll-cross' / 'pll-Aperm'
  algorithmName: string; // 公式名
  moves: Move[]; // 本步 WCA move 序列
  why: string; // 为什么这么做
  principle: string; // 原理：公式如何在不破坏已解部分下移动目标块
  targetFacelets: number[]; // 本步关注的 facelet 索引（3D 高亮）
  stateBefore: CubeState;
  stateAfter: CubeState;
}

/** 阶段概览。 */
export interface PhaseSummary {
  phase: PhaseId;
  title: string;
  goal: string; // 该阶段目标讲解
  startStepIndex: number;
  stepCount: number;
}

/** 完整解法。 */
export interface Solution {
  order: Order;
  scramble: Move[];
  initial: CubeState; // 打乱后初态
  steps: SolutionStep[];
  phases: PhaseSummary[];
  solvedState: CubeState;
  totalMoves: number;
}
