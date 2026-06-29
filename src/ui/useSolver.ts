// useSolver: 管理魔方逻辑状态、打乱、求解、分步引导播放。
import { useCallback, useRef, useState } from 'react';
import type { Order, CubeState, Move } from '../cube/types';
import { solved } from '../cube/facelets';
import { scramble as doScramble } from '../cube/scramble';
import { applyMoves } from '../cube/moves';
import { solve, type Solution } from '../solver';
import type { CubeHandle } from './CubeCanvas';

export type Mode = 'idle' | 'scrambled' | 'guiding';

export function useSolver(order: Order, cubeRef: React.RefObject<CubeHandle | null>) {
  const [mode, setMode] = useState<Mode>('idle');
  const [solution, setSolution] = useState<Solution | null>(null);
  const [stepIndex, setStepIndex] = useState(-1); // -1 = 尚未开始第一步
  const [busy, setBusy] = useState(false);
  const stateRef = useRef<CubeState>(solved(order));

  const reset = useCallback(() => {
    const s = solved(order);
    stateRef.current = s;
    setSolution(null);
    setStepIndex(-1);
    setMode('idle');
    cubeRef.current?.setStateInstant(s);
  }, [order, cubeRef]);

  const scramble = useCallback(async () => {
    setBusy(true);
    // 从还原态开始，动画播放打乱过程
    const base = solved(order);
    stateRef.current = base;
    cubeRef.current?.setStateInstant(base);
    const { moves } = doScramble(order);
    await cubeRef.current?.animateMoves(moves, 110);
    stateRef.current = applyMoves(base, moves);
    setSolution(null);
    setStepIndex(-1);
    setMode('scrambled');
    setBusy(false);
  }, [order, cubeRef]);

  const startGuide = useCallback(() => {
    const sol = solve(stateRef.current);
    setSolution(sol);
    setStepIndex(-1);
    setMode('guiding');
  }, []);

  // 播放第 i 步动画
  const playStep = useCallback(async (i: number) => {
    if (!solution || busy) return;
    if (i < 0 || i >= solution.steps.length) return;
    setBusy(true);
    const step = solution.steps[i];
    await cubeRef.current?.animateMoves(step.moves, 320);
    stateRef.current = step.stateAfter;
    setStepIndex(i);
    setBusy(false);
  }, [solution, busy, cubeRef]);

  const nextStep = useCallback(() => { void playStep(stepIndex + 1); }, [playStep, stepIndex]);

  const prevStep = useCallback(async () => {
    if (!solution || busy || stepIndex < 0) return;
    setBusy(true);
    // 回退：直接跳到上一步的 before 态（不做反向动画，避免复杂）
    const target = stepIndex - 1;
    const st = target < 0 ? solution.initial : solution.steps[target].stateAfter;
    stateRef.current = st;
    cubeRef.current?.setStateInstant(st);
    setStepIndex(target);
    setBusy(false);
  }, [solution, busy, stepIndex, cubeRef]);

  const playAll = useCallback(async () => {
    if (!solution || busy) return;
    setBusy(true);
    for (let i = stepIndex + 1; i < solution.steps.length; i++) {
      const step = solution.steps[i];
      await cubeRef.current?.animateMoves(step.moves, 260);
      stateRef.current = step.stateAfter;
      setStepIndex(i);
    }
    setBusy(false);
  }, [solution, busy, stepIndex, cubeRef]);

  const applyManual = useCallback(async (moves: Move[]) => {
    if (busy) return;
    setBusy(true);
    await cubeRef.current?.animateMoves(moves, 200);
    stateRef.current = applyMoves(stateRef.current, moves);
    setBusy(false);
  }, [busy, cubeRef]);

  return {
    mode, solution, stepIndex, busy,
    reset, scramble, startGuide,
    nextStep, prevStep, playAll, applyManual,
    state: stateRef,
  };
}
