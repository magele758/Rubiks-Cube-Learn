// 具名公式表：最后一层用到的标准初学者/CFOP 公式。
// 全部为「不含整体旋转 x/y/z」的写法，便于直接作用于固定朝向的状态。
import type { Move } from '../cube/types';
import { parseMoves } from '../cube/moves';

export interface NamedAlg {
  id: string;
  name: string; // 公式名
  moves: Move[];
}

const A = (id: string, name: string, seq: string): NamedAlg => ({
  id, name, moves: parseMoves(seq),
});

// 顶层黄十字：FRUR'U'F'
export const OLL_EDGE = A('oll-edge', '黄十字公式', "F R U R' U' F'");

// 顶面定向：Sune / Anti-Sune
export const SUNE = A('sune', 'Sune（小鱼）', "R U R' U R U2 R'");
export const ANTISUNE = A('antisune', 'Anti-Sune（反小鱼）', "R U2 R' U' R U' R'");

// PLL：覆盖角/棱排列的常用公式（含 3-cycle 与对换型）
export const PLL_ALGS: NamedAlg[] = [
  A('pll-Ua', 'Ua-perm（棱三循环）', "R U' R U R U R U' R' U' R2"),
  A('pll-Ub', 'Ub-perm（棱三循环）', "R2 U R U R' U' R' U' R' U R'"),
  A('pll-Aa', 'Aa-perm（角三循环）', "R' F R' B2 R F' R' B2 R2"),
  A('pll-Ab', 'Ab-perm（角三循环）', "R2 B2 R F R' B2 R F' R"),
  A('pll-T', 'T-perm', "R U R' U' R' F R2 U' R' U' R U R' F'"),
  A('pll-Y', 'Y-perm', "F R U' R' U' R U R' F' R U R' U' R' F R F'"),
  A('pll-Ja', 'Ja-perm', "R' U L' U2 R U' R' U2 R L"),
  A('pll-Jb', 'Jb-perm', "R U R' F' R U R' U' R' F R2 U' R'"),
  A('pll-V', 'V-perm', "R' U R' U' B' R' B2 U' B' U B' R B R"),
];

// 2x2 顶层排列：邻角换 / 对角换
export const P2_PLL_ADJ = A('p2-pll-adj', '邻角对换', "R U R' U' R' F R2 U' R' U' R U R' F'"); // T-perm 同款
export const P2_PLL_DIAG = A('p2-pll-diag', '对角对换', "F R U' R' U' R U R' F' R U R' U' R' F R F'"); // Y-perm 同款

export const AUF: Move[][] = [[], ['U'], ["U'"], ['U2']];
