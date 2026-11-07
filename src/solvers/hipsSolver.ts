// src/solvers/hipsSolver.ts
import * as THREE from 'three';
import { makeOrthoBasis, getV } from './mathUtils';

export function solveHips(
  lm: Record<string, [number, number, number]>,
  scaleFactor: number,
  ankleBaseY: number
) {
  const pPelvis = getV(lm, '下半身', getV(lm, 'センター'));
  const pChest = getV(lm, '上半身', pPelvis);
  const pLHip = getV(lm, '左足', pPelvis);
  const pRHip = getV(lm, '右足', pPelvis);

  // 1. 骨盆朝向正交基底
  const hipSide = new THREE.Vector3().subVectors(pLHip, pRHip).normalize();
  const hipUp = new THREE.Vector3().subVectors(pChest, pPelvis).normalize();
  const hipForward = new THREE.Vector3().crossVectors(hipSide, hipUp).normalize();
  const hipSideOrtho = new THREE.Vector3().crossVectors(hipUp, hipForward).normalize();

  const hipsWorldQ = makeOrthoBasis(hipSideOrtho, hipUp, hipForward);

  // 2. 关键几何公式：
  // 鞋底板厚度（0.08m）+ 真实下半身相对脚踝高度 * 比例尺
  // 确保脚掌完全、平稳、严丝合缝切在 Y = 0.000m 地面上！
  const hipsY = 0.08 + Math.max(0, pPelvis.y - ankleBaseY) * scaleFactor;

  const hipsPosition = new THREE.Vector3(
    pPelvis.x * scaleFactor,
    hipsY,
    pPelvis.z * scaleFactor
  );

  return { hipsWorldQ, hipsPosition, hipUp, hipForward, hipSideOrtho };
}
