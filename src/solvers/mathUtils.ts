// src/solvers/mathUtils.ts
import * as THREE from 'three';

export const inv = (q: THREE.Quaternion) => q.clone().invert();
export const mul = (pInv: THREE.Quaternion, childWorld: THREE.Quaternion) =>
  pInv.clone().multiply(childWorld).normalize();

export const getV = (
  lm: Record<string, [number, number, number]>,
  name: string,
  fallback = new THREE.Vector3()
): THREE.Vector3 => {
  const p = lm[name];
  return p ? new THREE.Vector3(p[0], p[1], p[2]) : fallback.clone();
};

export const clamp = (val: number, min: number, max: number): number =>
  Math.max(Math.min(val, max), min);

/** 正交基矩阵转四元数（杜绝奇异点与 NaN） */
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

/** 跨帧四元数符号连续化，防止相邻帧符号反相闪烁 */
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
