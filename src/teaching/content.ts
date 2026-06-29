// 教学文案：阶段目标 + 每类 case 的「为什么 / 原理」。与求解逻辑解耦。
import type { PhaseId } from '../solver/types';

export interface PhaseText {
  title: string;
  goal: string;
}

export const PHASE_TEXT: Record<PhaseId, PhaseText> = {
  cross: {
    title: '第一步 · 底层白十字',
    goal: '把四个带白色的棱块放到底面，组成白色十字，且每个棱块的侧面颜色要和相邻中心块对齐。这是整个还原的地基。',
  },
  'f1l-corners': {
    title: '第二步 · 第一层角块',
    goal: '把四个白色角块归位，完成整个底层（白面 + 第一层侧面一圈同色）。',
  },
  'f2l-edges': {
    title: '第三步 · 第二层棱块',
    goal: '把中层四个棱块放到正确位置，完成前两层（F2L）。此后只剩顶层。',
  },
  'oll-edges': {
    title: '第四步 · 顶层黄十字',
    goal: '不管角块，先让顶面的四个棱块都朝上呈黄色，形成黄色十字。',
  },
  'oll-corners': {
    title: '第五步 · 顶面全黄',
    goal: '在黄十字基础上，把四个顶角也翻成黄色朝上，让整个顶面变黄。',
  },
  pll: {
    title: '第六步 · 顶层归位（PLL）',
    goal: '顶面已全黄，最后把顶层的角块和棱块转到各自正确位置，完成还原。',
  },
  auf: {
    title: '收尾 · 顶层对齐',
    goal: '转动顶层让所有侧面颜色对齐，完成最后一步。',
  },
  'p2-layer1': {
    title: '第一步 · 完成一层',
    goal: '先解决一整层四个角块（2 阶没有棱块和中心，直接拼好一层即可）。',
  },
  'p2-oll': {
    title: '第二步 · 顶面定向',
    goal: '让顶层四个角块都朝上变黄，使整个顶面同色。',
  },
  'p2-pll': {
    title: '第三步 · 顶层排列',
    goal: '把顶层角块转到正确相对位置，完成还原。',
  },
};

/** 按 caseId 提供「为什么 / 原理」。找不到时回退到阶段级通用解释。 */
export interface CaseText {
  why: string;
  principle: string;
}

const CASE_TEXT: Record<string, CaseText> = {
  'cross-edge': {
    why: '把这条白棱送到底面、并让它的侧色对准所属中心，是为了让底层成为后续所有步骤的稳定参照系。',
    principle: '中心块的相对位置永远不变，所以「侧色对齐中心」就唯一确定了棱块的正确朝向。先在顶层把棱摆到目标正上方，再下插，可避免破坏已摆好的其他白棱。',
  },
  'f1l-corner': {
    why: '把白角插到底层对应的角槽，使白面这一层完整，同时第一层侧面形成连续同色。',
    principle: '角块由「目标槽正上方 → 右手插入(R U R\' 类)」循环送下。每次 R U R\' 把顶层角旋入底槽又转回，净效果只移动这一个角，不动已完成部分。',
  },
  'f1l-corner-eject': {
    why: '这个白角被卡在错误的底层槽里，先用一次插入动作把它「请」回顶层，下一轮再正确插入。',
    principle: '对它所在的槽施加该槽的插入公式，会把卡住的角块顶到顶层，同时保持其他已完成块不变——这是受限手法「只动这一带」的好处。',
  },
  'f2l-edge': {
    why: '把不含黄色的中层棱块从顶层送进左/右中层槽，完成前两层。',
    principle: '中层插棱公式(如 U R U\' R\' U\' F\' U F)是一个「配对-插入」组合：它先把棱块与上方临时配对，再整体旋入中层槽，过程中触及的底层块会在公式结尾被复位。',
  },
  'f2l-edge-eject': {
    why: '目标棱块卡在错误的中层槽，先用插入公式把它顶回顶层，再正确插入。',
    principle: '对错误槽施加插入公式会把里面的棱块挤回顶层，且因公式自我抵消，不破坏已完成的底层与十字。',
  },
  'oll-edge': {
    why: '用 F R U R\' U\' F\' 改变顶层棱块的朝向，逐步从「点 → L形 → 一字 → 十字」推进到黄十字。',
    principle: '这条公式只翻转顶层部分棱块的朝向、不改变角块归位，是一个「定向」工具。重复施加（每次先转正图案方向）必然收敛到黄十字。',
  },
  sune: {
    why: 'Sune(小鱼)公式专门翻转顶层角块朝向，反复施加把所有角块都翻成黄色朝上。',
    principle: 'Sune = R U R\' U R U2 R\'，它循环三个顶角的朝向而不打乱它们的位置。顶角朝向之和守恒，所以重复 Sune（必要时配合顶层旋转）一定能把顶面凑全黄。',
  },
  antisune: {
    why: 'Anti-Sune 是 Sune 的镜像，按当前顶角朝向选用它能更快把顶面凑黄。',
    principle: 'Anti-Sune = R U2 R\' U\' R U\' R\'，与 Sune 反向循环顶角朝向，同样只定向不移位。',
  },
  'pll-auf': {
    why: '顶层各块已就位，只需整体转动顶层让侧面颜色对齐。',
    principle: '顶层整体旋转(U/U2/U\')不改变块之间的相对关系，只把已排好的一圈对准下方的颜色。',
  },
};

const GENERIC: CaseText = {
  why: '套用该阶段的标准公式，把目标块移动到正确位置或朝向。',
  principle: '该公式是一组精心设计的动作，能在移动目标块的同时，让其余已完成部分经过扰动后复位。',
};

export function caseText(caseId: string): CaseText {
  if (CASE_TEXT[caseId]) return CASE_TEXT[caseId];
  // PLL 各公式统一解释
  if (caseId.startsWith('pll-')) {
    return {
      why: '识别出顶层属于这个排列情形，用对应的具名公式一次性把角块和棱块换到正确位置。',
      principle: '每个 PLL 公式实现顶层特定的「三循环」或「对换」，只重排顶层而完全不动已完成的前两层。',
    };
  }
  if (caseId.startsWith('p2-')) {
    return {
      why: '2 阶顶层用对应公式调整角块的朝向或位置，逐步完成还原。',
      principle: '公式作用于顶层角块的定向/排列，循环若干角块而保持底层一层不被破坏。',
    };
  }
  return GENERIC;
}
