// src/solvers/hipsSolver.ts
import * as THREE from 'three';
import { getV, makeOrthoBasis } from './mathUtils';

export function solveHips(
  lm: Record<string, [number, number, number]>,
  scaleFactor: number,
  ankleBaseY: number
) {
  const rawCenter = getV(lm, 'センター');
  const pLHip = getV(lm, '左足', rawCenter);
  const pRHip = getV(lm, '右足', rawCenter);

  // 1. 骨盆对称几何中心（彻底规避原神/初音下半身骨骼向后埋入臀部造成的 Z 轴偏移）
  const hipJointCenter = new THREE.Vector3().addVectors(pLHip, pRHip).multiplyScalar(0.5);

  let pPelvis = lm['下半身'] ? getV(lm, '下半身') : hipJointCenter;
  if (pPelvis.lengthSq() < 1e-4) pPelvis = rawCenter;

  // 2. 躯干双肩中点参考（用于构建绝对垂直的躯干冠状中轴）
  const pChest = getV(lm, '上半身', pPelvis);
  const pUpperChest = getV(lm, '上半身2', pChest);
  const pLShoulder = getV(lm, '左肩', getV(lm, '左腕', pUpperChest));
  const pRShoulder = getV(lm, '右肩', getV(lm, '右腕', pUpperChest));
  const shoulderMid = new THREE.Vector3().addVectors(pLShoulder, pRShoulder).multiplyScalar(0.5);

  // 3. 骨盆侧向向量（右胯 -> 左胯，严格沿 +X）
  let hipSide = new THREE.Vector3().subVectors(pLHip, pRHip);
  if (hipSide.lengthSq() < 1e-4) {
    hipSide = new THREE.Vector3(1, 0, 0);
  } else {
    hipSide.normalize();
  }

  // 4. 躯干垂直向上向量：双胯中点 -> 双肩中点
  // 彻底消除由 "下半身(偏后) -> 上半身(偏前)" 引起的 25° 假性前趴角！
  let torsoUp = new THREE.Vector3().subVectors(shoulderMid, hipJointCenter);
  if (torsoUp.lengthSq() < 1e-4) {
    torsoUp = new THREE.Vector3(0, 1, 0);
  } else {
    torsoUp.normalize();
  }

  // 5. 骨盆正交前向 (+Z) 与真正交向上 (+Y)
  let hipForward = new THREE.Vector3().crossVectors(hipSide, torsoUp).normalize();
  if (hipForward.lengthSq() < 1e-4) {
    hipForward = new THREE.Vector3(0, 0, 1);
  }

  const hipUp = new THREE.Vector3().crossVectors(hipForward, hipSide).normalize();
  const hipSideOrtho = new THREE.Vector3().crossVectors(hipUp, hipForward).normalize();

  const hipsWorldQ = makeOrthoBasis(hipSideOrtho, hipUp, hipForward);

  // 6. 消除模型下半身骨骼 Z 轴深埋导致的全局前后位移漂移
  const hipsY = 0.08 + Math.max(0, pPelvis.y - ankleBaseY) * scaleFactor;
  const hipsPosition = new THREE.Vector3(
    hipJointCenter.x * scaleFactor,
    hipsY,
    hipJointCenter.z * scaleFactor
  );

  return { hipsWorldQ, hipsPosition, hipUp, hipForward, hipSideOrtho };
}
