// src/solvers/hipsSolver.ts
import * as THREE from 'three';
import { StandardBone } from '../types/boneMapping';
import { getV, hasBone, makeOrthoBasis } from './mathUtils';

export function solveHips(
  lm: Record<string, [number, number, number]>,
  scaleFactor: number,
  ankleBaseY: number
) {
  const rawCenter = getV(lm, StandardBone.Root);
  const pLHip = getV(lm, StandardBone.LeftUpperLeg, rawCenter);
  const pRHip = getV(lm, StandardBone.RightUpperLeg, rawCenter);

  // 1. 骨盆对称几何中心
  const hipJointCenter = new THREE.Vector3().addVectors(pLHip, pRHip).multiplyScalar(0.5);

  let pPelvis = hasBone(lm, StandardBone.Hips)
    ? getV(lm, StandardBone.Hips)
    : hipJointCenter;
  if (pPelvis.lengthSq() < 1e-4) pPelvis = rawCenter;

  // 2. 躯干双肩中点参考
  const pChest = getV(lm, StandardBone.Spine, pPelvis);
  const pUpperChest = getV(lm, StandardBone.Chest, pChest);
  const pLShoulder = getV(lm, StandardBone.LeftShoulder, getV(lm, StandardBone.LeftUpperArm, pUpperChest));
  const pRShoulder = getV(lm, StandardBone.RightShoulder, getV(lm, StandardBone.RightUpperArm, pUpperChest));
  const shoulderMid = new THREE.Vector3().addVectors(pLShoulder, pRShoulder).multiplyScalar(0.5);

  // 3. 骨盆侧向向量（右胯 -> 左胯）
  let hipSide = new THREE.Vector3().subVectors(pLHip, pRHip);
  if (hipSide.lengthSq() < 1e-4) {
    hipSide = new THREE.Vector3(1, 0, 0);
  } else {
    hipSide.normalize();
  }

  // 4. 躯干垂直向上向量
  let torsoUp = new THREE.Vector3().subVectors(shoulderMid, hipJointCenter);
  if (torsoUp.lengthSq() < 1e-4) {
    torsoUp = new THREE.Vector3(0, 1, 0);
  } else {
    torsoUp.normalize();
  }

  // 5. 正交基构建
  let hipForward = new THREE.Vector3().crossVectors(hipSide, torsoUp).normalize();
  if (hipForward.lengthSq() < 1e-4) {
    hipForward = new THREE.Vector3(0, 0, 1);
  }

  const hipUp = new THREE.Vector3().crossVectors(hipForward, hipSide).normalize();
  const hipSideOrtho = new THREE.Vector3().crossVectors(hipUp, hipForward).normalize();

  const hipsWorldQ = makeOrthoBasis(hipSideOrtho, hipUp, hipForward);

  // 6. 全局位移计算
  const hipsY = 0.08 + Math.max(0, pPelvis.y - ankleBaseY) * scaleFactor;
  const hipsPosition = new THREE.Vector3(
    hipJointCenter.x * scaleFactor,
    hipsY,
    hipJointCenter.z * scaleFactor
  );

  return { hipsWorldQ, hipsPosition, hipUp, hipForward, hipSideOrtho };
}
