// src/solvers/spineSolver.ts
import * as THREE from 'three';
import { StandardBone } from '../types/boneMapping';
import { getV, hasBone, inv, makeOrthoBasis, mul } from './mathUtils';

function computeFaceBasis(
  lm: Record<string, [number, number, number]>
): THREE.Quaternion | null {
  if (
    !hasBone(lm, StandardBone.Head) ||
    !hasBone(lm, StandardBone.LeftEye) ||
    !hasBone(lm, StandardBone.RightEye)
  ) {
    return null;
  }

  const pHead = getV(lm, StandardBone.Head);
  const pLEye = getV(lm, StandardBone.LeftEye);
  const pREye = getV(lm, StandardBone.RightEye);

  const headSide = new THREE.Vector3().subVectors(pLEye, pREye);
  if (headSide.lengthSq() < 1e-6) return null;
  headSide.normalize();

  const eyeMid = new THREE.Vector3().addVectors(pLEye, pREye).multiplyScalar(0.5);
  const toFace = new THREE.Vector3().subVectors(eyeMid, pHead);
  if (toFace.lengthSq() < 1e-6) return null;
  toFace.normalize();

  const headUp = new THREE.Vector3().crossVectors(toFace, headSide);
  if (headUp.lengthSq() < 1e-6) return null;
  headUp.normalize();

  const headForward = new THREE.Vector3().crossVectors(headSide, headUp).normalize();
  return makeOrthoBasis(headSide, headUp, headForward);
}

function buildTorsoBasis(
  upVec: THREE.Vector3,
  sideRef: THREE.Vector3,
  forwardFallback: THREE.Vector3
): THREE.Quaternion {
  const up = upVec.lengthSq() < 1e-4 ? new THREE.Vector3(0, 1, 0) : upVec.clone().normalize();
  let forward = new THREE.Vector3().crossVectors(sideRef, up);
  if (forward.lengthSq() < 1e-4) {
    forward = forwardFallback.clone();
  } else {
    forward.normalize();
  }
  if (forward.dot(forwardFallback) < 0) {
    forward.negate();
  }
  const side = new THREE.Vector3().crossVectors(up, forward).normalize();
  return makeOrthoBasis(side, up, forward);
}

export function solveSpine(
  lm: Record<string, [number, number, number]>,
  hipsWorldQ: THREE.Quaternion,
  hipForward: THREE.Vector3,
  restLm?: Record<string, [number, number, number]>
) {
  const rawCenter = getV(lm, StandardBone.Root);
  const pLHip = getV(lm, StandardBone.LeftUpperLeg, rawCenter);
  const pRHip = getV(lm, StandardBone.RightUpperLeg, rawCenter);
  const hipJointCenter = new THREE.Vector3().addVectors(pLHip, pRHip).multiplyScalar(0.5);

  const pChest = getV(lm, StandardBone.Spine, hipJointCenter);
  const pUpperChest = getV(lm, StandardBone.Chest, pChest);
  const pNeck = getV(lm, StandardBone.Neck, pUpperChest);
  const pHead = getV(lm, StandardBone.Head, pNeck);

  const pLShoulder = getV(lm, StandardBone.LeftShoulder, getV(lm, StandardBone.LeftUpperArm, pUpperChest));
  const pRShoulder = getV(lm, StandardBone.RightShoulder, getV(lm, StandardBone.RightUpperArm, pUpperChest));

  // 1. 骨盆侧向 & 胸腔侧向
  const hipSide = new THREE.Vector3(1, 0, 0).applyQuaternion(hipsWorldQ).normalize();
  let chestSideRef = new THREE.Vector3().subVectors(pLShoulder, pRShoulder);
  if (chestSideRef.lengthSq() < 1e-4) {
    chestSideRef = hipSide.clone();
  } else {
    chestSideRef.normalize();
  }

  // 2. 下段脊柱 (Spine): 骨盆 -> 上胸，扭转取骨盆与双肩的过渡 (35%)
  const lowerUp = new THREE.Vector3().subVectors(pUpperChest, hipJointCenter);
  const lowerSideRef = hipSide.clone().lerp(chestSideRef, 0.35).normalize();
  const lowerSpineWorldQ = buildTorsoBasis(
    lowerUp.lengthSq() > 1e-4 ? lowerUp : new THREE.Vector3().subVectors(pNeck, hipJointCenter),
    lowerSideRef,
    hipForward
  );

  // 3. 上段胸腔 (UpperChest): 胸骨 -> 颈根，跟随双肩朝向
  let upperUp = new THREE.Vector3().subVectors(pNeck, pChest);
  if (upperUp.lengthSq() < 1e-4) {
    upperUp = new THREE.Vector3().subVectors(pNeck, hipJointCenter);
  }
  const upperChestWorldQ = buildTorsoBasis(upperUp, chestSideRef, hipForward);

  const spineUp = new THREE.Vector3(0, 1, 0).applyQuaternion(upperChestWorldQ).normalize();
  const spineForward = new THREE.Vector3(0, 0, 1).applyQuaternion(upperChestWorldQ).normalize();
  const spineSide = new THREE.Vector3(1, 0, 0).applyQuaternion(upperChestWorldQ).normalize();

  // 4. 头颈基底：优先用双目+头骨精准定面部朝向并扣除 Rest Pose 偏角
  let headWorldQ = computeFaceBasis(lm);
  if (headWorldQ) {
    const restHeadQ = restLm ? computeFaceBasis(restLm) : null;
    if (restHeadQ) {
      headWorldQ = headWorldQ.clone().multiply(inv(restHeadQ)).normalize();
    }
  } else {
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
    headWorldQ = makeOrthoBasis(headSide, headUp, headForward);
  }

  const hInv = inv(hipsWorldQ);
  const lowerInv = inv(lowerSpineWorldQ);
  const upperInv = inv(upperChestWorldQ);
  const identityQ = new THREE.Quaternion(0, 0, 0, 1);

  // 分段分配：spine -> lowerSpine, chest & upperChest 平分下段到上段的增量
  const spineLocal = mul(hInv, lowerSpineWorldQ);
  const midTotalLocal = mul(lowerInv, upperChestWorldQ);
  const chestLocal = identityQ.clone().slerp(midTotalLocal, 0.5).normalize();
  const upperChestLocal = mul(inv(chestLocal), midTotalLocal);

  // 将头部总旋转自然分配给 neck (35%) 与 head (65%)
  const totalHeadLocal = mul(upperInv, headWorldQ);
  const neckLocal = identityQ.clone().slerp(totalHeadLocal, 0.35).normalize();
  const headLocal = mul(inv(neckLocal), totalHeadLocal);

  return {
    spineWorldQ: upperChestWorldQ,
    spineUp,
    localRotations: {
      spine: spineLocal,
      chest: chestLocal,
      upperChest: upperChestLocal,
      neck: neckLocal,
      head: headLocal,
    },
  };
}
