// src/solvers/spineSolver.ts
import * as THREE from 'three';
import { getV, inv, makeOrthoBasis, mul } from './mathUtils';

export function solveSpine(
  lm: Record<string, [number, number, number]>,
  hipsWorldQ: THREE.Quaternion,
  hipForward: THREE.Vector3
) {
  const rawCenter = getV(lm, 'センター');
  const pLHip = getV(lm, '左足', rawCenter);
  const pRHip = getV(lm, '右足', rawCenter);
  const hipJointCenter = new THREE.Vector3().addVectors(pLHip, pRHip).multiplyScalar(0.5);

  const pChest = getV(lm, '上半身', hipJointCenter);
  const pUpperChest = getV(lm, '上半身2', pChest);
  const pNeck = getV(lm, '首', pUpperChest);
  const pHead = getV(lm, '頭', pNeck);

  const pLShoulder = getV(lm, '左肩', getV(lm, '左腕', pUpperChest));
  const pRShoulder = getV(lm, '右肩', getV(lm, '右腕', pUpperChest));

  // 1. 胸腔解剖侧向向量（右肩 -> 左肩）
  let spineSideRef = new THREE.Vector3().subVectors(pLShoulder, pRShoulder);
  if (spineSideRef.lengthSq() < 1e-4) {
    spineSideRef = new THREE.Vector3(1, 0, 0);
  } else {
    spineSideRef.normalize();
  }

  // 2. 脊柱向上向量：双胯几何中点指向颈部/上胸，沿人体中轴线延伸，杜绝前后突刺
  let spineUp = new THREE.Vector3().subVectors(pNeck, hipJointCenter);
  if (spineUp.lengthSq() < 1e-4) {
    spineUp = new THREE.Vector3().subVectors(pUpperChest, hipJointCenter);
  }
  if (spineUp.lengthSq() < 1e-4) {
    spineUp = new THREE.Vector3(0, 1, 0);
  } else {
    spineUp.normalize();
  }

  // 3. 脊柱前向与侧向正交基底
  let spineForward = new THREE.Vector3().crossVectors(spineSideRef, spineUp).normalize();
  if (spineForward.lengthSq() < 1e-4) {
    spineForward = hipForward.clone();
  }

  if (spineForward.dot(hipForward) < 0) {
    spineForward.negate();
  }

  const spineSide = new THREE.Vector3().crossVectors(spineUp, spineForward).normalize();
  const spineWorldQ = makeOrthoBasis(spineSide, spineUp, spineForward);

  // 4. 头颈正交基底
  let headUp = new THREE.Vector3().subVectors(pHead, pNeck);
  if (headUp.lengthSq() < 1e-4) {
    headUp = spineUp.clone();
  } else {
    headUp.normalize();
  }

  let headForward = new THREE.Vector3().crossVectors(spineSide, headUp).normalize();
  if (headForward.lengthSq() < 1e-4) {
    headForward = spineForward.clone();
  }
  if (headForward.dot(spineForward) < 0) {
    headForward.negate();
  }

  const headSide = new THREE.Vector3().crossVectors(headUp, headForward).normalize();
  const headWorldQ = makeOrthoBasis(headSide, headUp, headForward);

  const hInv = inv(hipsWorldQ);
  const sInv = inv(spineWorldQ);

  return {
    spineWorldQ,
    localRotations: {
      spine: mul(hInv, spineWorldQ),
      chest: new THREE.Quaternion(0, 0, 0, 1),
      upperChest: new THREE.Quaternion(0, 0, 0, 1),
      neck: mul(sInv, headWorldQ),
      head: new THREE.Quaternion(0, 0, 0, 1),
    },
  };
}
