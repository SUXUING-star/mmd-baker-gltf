
import * as THREE from 'three';
import { HUMANOID_BONES, HumanoidBoneName, LandmarkData } from '../types/types';
import { ensureQuatContinuity } from '../solvers/mathUtils';
import { solveHips } from '../solvers/hipsSolver';
import { solveSpine } from '../solvers/spineSolver';
import { solveLimbs } from '../solvers/limbSolver';
import { solveFingers } from '../solvers/fingerSolver';

export function solveAllHumanoidQuaternions(data: LandmarkData) {
  const { frames } = data;
  if (frames.length === 0) {
    return { times: [], hipsPositions: [], quatTracksData: {} as any };
  }

  const f0 = frames[0].landmarks;
  const pPelvis0Y = f0['下半身'] ? f0['下半身'][1] : (f0['センター'] ? f0['センター'][1] : 9.5);
  const pLAnkle0Y = f0['左足首'] ? f0['左足首'][1] : 1.0;
  const pRAnkle0Y = f0['右足首'] ? f0['右足首'][1] : 1.0;
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

    // 关键修正：类型断言解决 TS 2739 展开属性缺失报错
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

  return { times, hipsPositions, quatTracksData };
}
