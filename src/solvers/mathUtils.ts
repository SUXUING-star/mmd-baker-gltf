// src/solvers/mathUtils.ts
import * as THREE from 'three';
import { BONE_CANDIDATE_MAP, StandardBoneKey } from '../types/boneMapping';

export const inv = (q: THREE.Quaternion) => q.clone().invert();
export const mul = (pInv: THREE.Quaternion, childWorld: THREE.Quaternion) =>
  pInv.clone().multiply(childWorld).normalize();

export const clamp = (val: number, min: number, max: number): number =>
  Math.max(Math.min(val, max), min);

/**
 * 健壮获取坐标向量：优先查标准语义键，次优查候选字典与别名
 */
export const getV = (
  lm: Record<string, [number, number, number]>,
  name: StandardBoneKey | string,
  fallback = new THREE.Vector3()
): THREE.Vector3 => {
  // 1. 直查
  if (lm[name]) {
    return new THREE.Vector3(lm[name][0], lm[name][1], lm[name][2]);
  }

  // 2. 若是标准键，查候选字典别名
  const candidates = BONE_CANDIDATE_MAP[name as StandardBoneKey];
  if (candidates) {
    for (const cand of candidates) {
      if (lm[cand]) {
        return new THREE.Vector3(lm[cand][0], lm[cand][1], lm[cand][2]);
      }
    }
  }

  return fallback.clone();
};

export const hasBone = (
  lm: Record<string, [number, number, number]>,
  name: StandardBoneKey | string
): boolean => {
  if (lm[name]) return true;
  const candidates = BONE_CANDIDATE_MAP[name as StandardBoneKey];
  if (candidates) {
    return candidates.some((cand) => !!lm[cand]);
  }
  return false;
};

/** 正交基矩阵转四元数 */
export function makeOrthoBasis(
  axisX: THREE.Vector3,
  axisY: THREE.Vector3,
  axisZ: THREE.Vector3
): THREE.Quaternion {
  const x = axisX.clone().normalize();
  const y = axisY.clone().normalize();
  const z = axisZ.clone().normalize();

  if (x.lengthSq() < 1e-4 || y.lengthSq() < 1e-4 || z.lengthSq() < 1e-4) {
    return new THREE.Quaternion(0, 0, 0, 1);
  }

  const m = new THREE.Matrix4();
  m.makeBasis(x, y, z);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return isNaN(q.x) || isNaN(q.y) || isNaN(q.z) || isNaN(q.w)
    ? new THREE.Quaternion(0, 0, 0, 1)
    : q.normalize();
}

/** 跨帧四元数符号连续化 */
export function ensureQuatContinuity(
  target: THREE.Quaternion,
  prev: THREE.Quaternion | undefined
): THREE.Quaternion {
  if (!prev) return target.clone();
  if (target.dot(prev) < 0) {
    target.x = -target.x;
    target.y = -target.y;
    target.z = -target.z;
    target.w = -target.w;
  }
  return target;
}
