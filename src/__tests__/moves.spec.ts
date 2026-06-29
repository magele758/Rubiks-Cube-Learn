// 置换引擎不变量测试：在写求解器之前先锁死置换表正确性。
import { describe, it, expect } from 'vitest';
import { applyMove, applyMoves, invertMoves, parseMoves, allMoves } from '../cube/moves';
import { solved, isSolved, faceletCount } from '../cube/facelets';
import type { Order } from '../cube/types';
import { FACES } from '../cube/types';

const ORDERS: Order[] = [2, 3];

describe('置换引擎不变量', () => {
  for (const order of ORDERS) {
    describe(`${order}阶`, () => {
      it('还原态判定正确', () => {
        expect(isSolved(solved(order))).toBe(true);
      });

      it('每个面转 ×4 = identity', () => {
        for (const f of FACES) {
          let s = solved(order);
          for (let i = 0; i < 4; i++) s = applyMove(s, f);
          expect(isSolved(s), `${f} ×4`).toBe(true);
        }
      });

      it("X X' = identity", () => {
        for (const f of FACES) {
          const s = applyMoves(solved(order), [f, `${f}'`]);
          expect(isSolved(s), `${f} ${f}'`).toBe(true);
        }
      });

      it('X2 X2 = identity', () => {
        for (const f of FACES) {
          const s = applyMoves(solved(order), [`${f}2`, `${f}2`]);
          expect(isSolved(s), `${f}2 ×2`).toBe(true);
        }
      });

      it("X2 = X X", () => {
        for (const f of FACES) {
          const a = applyMoves(solved(order), [`${f}2`]);
          const b = applyMoves(solved(order), [f, f]);
          expect(a.facelets).toEqual(b.facelets);
        }
      });

      it('单个面转不改变贴纸颜色计数（每色数量守恒）', () => {
        for (const f of FACES) {
          const s = applyMove(solved(order), f);
          const counts: Record<string, number> = {};
          for (const c of s.facelets) counts[c] = (counts[c] ?? 0) + 1;
          for (const face of FACES) {
            expect(counts[face]).toBe((order * order));
          }
        }
      });

      it('打乱后应用其逆序列回到还原态', () => {
        const seq = order === 3
          ? parseMoves("R U R' U' F2 L D' B R2 U")
          : parseMoves("R U F' R F U' R2");
        const scrambled = applyMoves(solved(order), seq);
        if (order === 3) expect(isSolved(scrambled)).toBe(false);
        const back = applyMoves(scrambled, invertMoves(seq));
        expect(isSolved(back)).toBe(true);
      });

      it('move 数量正确（18 个）', () => {
        expect(allMoves(order).length).toBe(18);
      });

      it('facelet 数量正确', () => {
        expect(faceletCount(order)).toBe(order === 3 ? 54 : 24);
      });
    });
  }

  // 已知公式的群论性质：sexy move (R U R' U') ×6 = identity
  it("3阶 sexy move ×6 = identity", () => {
    let s = solved(3);
    for (let i = 0; i < 6; i++) s = applyMoves(s, parseMoves("R U R' U'"));
    expect(isSolved(s)).toBe(true);
  });

  // Sune ×6 = identity（Sune 阶为 6 的验证其实是 ×6 回原，这里验证它非平凡且最终可逆）
  it("3阶 Sune 自身重复最终回到还原（验证为合法置换）", () => {
    // Sune = R U R' U R U2 R'，其阶整除某值；连用 30 次必含 identity 周期点之一
    let s = solved(3);
    const sune = parseMoves("R U R' U R U2 R'");
    let returned = false;
    for (let i = 1; i <= 60; i++) {
      s = applyMoves(s, sune);
      if (isSolved(s)) { returned = true; break; }
    }
    expect(returned).toBe(true);
  });

  // T-perm 是对合（自逆）：应用两次回到原态
  it("3阶 T-perm 应用两次 = identity（自逆排列）", () => {
    const t = parseMoves("R U R' U' R' F R2 U' R' U' R U R' F'");
    const s = applyMoves(applyMoves(solved(3), t), t);
    expect(isSolved(s)).toBe(true);
  });
});
