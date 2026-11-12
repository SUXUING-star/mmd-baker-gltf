// src/utils/mathSolver.ts
import * as THREE from 'three';
import { solveFingers } from '../solvers/fingerSolver';
import { solveHips } from '../solvers/hipsSolver';
import { solveLimbs } from '../solvers/limbSolver';
import { ensureQuatContinuity, getV, hasBone } from '../solvers/mathUtils';
import { solveSpine } from '../solvers/spineSolver';
import { StandardBone } from '../types/boneMapping';
import { HUMANOID_BONES, HumanoidBoneName, LandmarkData } from '../types/types';
import { blendMotionForLoop, DEFAULT_LOOP_OPTIONS, LoopBlendOptions } from './loopBlender';

export function solveAllHumanoidQuaternions(
  data: LandmarkData,
  loopOptions: LoopBlendOptions = DEFAULT_LOOP_OPTIONS
) {
  const { frames } = data;
  if (frames.length === 0) {
    return { times: [], hipsPositions: [], quatTracksData: {} as any };
  }

  const f0 = frames[0].landmarks;

  const pPelvis0 = hasBone(f0, StandardBone.Hips)
    ? getV(f0, StandardBone.Hips)
    : getV(f0, StandardBone.Root, new THREE.Vector3(0, 9.5, 0));
  const pPelvis0Y = pPelvis0.y;

  const pLAnkle0Y = getV(f0, StandardBone.LeftFoot, new THREE.Vector3(0, 1.0, 0)).y;
  const pRAnkle0Y = getV(f0, StandardBone.RightFoot, new THREE.Vector3(0, 1.0, 0)).y;
  const ankleBaseY = (pLAnkle0Y + pRAnkle0Y) / 2;

  const mmdLegSpan = Math.max(0.5, pPelvis0Y - ankleBaseY);
  const scaleFactor = 0.87 / mmdLegSpan;

  const times: number[] = [];
  const hipsPositions: number[] = [];
  const quatTracksData: Record<HumanoidBoneName, number[]> = {} as any;

  HUMANOID_BONES.forEach((k) => (quatTracksData[k] = []));
  const prevQuats: Partial<Record<HumanoidBoneName, THREE.Quaternion>> = {};

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const lm = frame.landmarks;
    times.push(frame.time);

    const hips = solveHips(lm, scaleFactor, ankleBaseY);
    const spine = solveSpine(lm, hips.hipsWorldQ, hips.hipForward);
    const limbs = solveLimbs(
      lm,
      spine.spineWorldQ,
      hips.hipsWorldQ,
      hips.hipSideOrtho,
      hips.hipUp
    );

    const leftFingers = solveFingers(lm, true);
    const rightFingers = solveFingers(lm, false);

    const localMap = {
      hips: hips.hipsWorldQ,
      ...spine.localRotations,
      ...limbs.localRotations,
      ...leftFingers,
      ...rightFingers,
    } as Record<HumanoidBoneName, THREE.Quaternion>;

    hipsPositions.push(hips.hipsPosition.x, hips.hipsPosition.y, hips.hipsPosition.z);

    HUMANOID_BONES.forEach((k) => {
      const qRaw = localMap[k] || new THREE.Quaternion(0, 0, 0, 1);
      const qContinuous = ensureQuatContinuity(qRaw, prevQuats[k]);
      prevQuats[k] = qContinuous.clone();

      quatTracksData[k].push(qContinuous.x, qContinuous.y, qContinuous.z, qContinuous.w);
    });
  }

  // 5 点高斯滤波平滑
  const frameCount = times.length;
  if (frameCount > 4) {
    const smoothedY = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      const p0 = hipsPositions[Math.max(0, i - 2) * 3 + 1];
      const p1 = hipsPositions[Math.max(0, i - 1) * 3 + 1];
      const p2 = hipsPositions[i * 3 + 1];
      const p3 = hipsPositions[Math.min(frameCount - 1, i + 1) * 3 + 1];
      const p4 = hipsPositions[Math.min(frameCount - 1, i + 2) * 3 + 1];
      smoothedY[i] = (p0 + p1 * 2 + p2 * 4 + p3 * 2 + p4) / 10;
    }
    for (let i = 0; i < frameCount; i++) {
      hipsPositions[i * 3 + 1] = smoothedY[i];
    }
  }

  // 后处理：动作循环衔接（可选）
  if (loopOptions.enabled) {
    const blended = blendMotionForLoop(times, hipsPositions, quatTracksData, loopOptions);
    return {
      times,
      hipsPositions: blended.hipsPositions,
      quatTracksData: blended.quatTracksData,
    };
  }

  return { times, hipsPositions, quatTracksData };
}
