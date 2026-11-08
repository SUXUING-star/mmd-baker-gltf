// src/solvers/limbSolver.ts
import * as THREE from 'three';
import { getV, inv, makeOrthoBasis, mul } from './mathUtils';

function solveAnatomicalLimb(
  P1: THREE.Vector3,
  P2: THREE.Vector3,
  P3: THREE.Vector3,
  type: 'leftArm' | 'rightArm' | 'leg',
  sideRef: THREE.Vector3,
  upRef: THREE.Vector3
) {
  const dUpper = new THREE.Vector3().subVectors(P2, P1).normalize();
  const dLower = new THREE.Vector3().subVectors(P3, P2).normalize();

  if (type === 'leg') {
    const axisY = dUpper.clone().negate();
    const axisX = new THREE.Vector3().subVectors(
      sideRef,
      axisY.clone().multiplyScalar(sideRef.dot(axisY))
    ).normalize();
    const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();
    const upperWorldQ = makeOrthoBasis(axisX, axisY, axisZ);

    const lowerY = dLower.clone().negate();
    const lowerX = new THREE.Vector3().subVectors(
      sideRef,
      lowerY.clone().multiplyScalar(sideRef.dot(lowerY))
    ).normalize();
    const lowerZ = new THREE.Vector3().crossVectors(lowerX, lowerY).normalize();
    const lowerWorldQ = makeOrthoBasis(lowerX, lowerY, lowerZ);

    return { upperWorldQ, lowerWorldQ };
  } else if (type === 'leftArm') {
    const axisX = dUpper.clone();
    const axisY = new THREE.Vector3().subVectors(
      upRef,
      axisX.clone().multiplyScalar(upRef.dot(axisX))
    ).normalize();
    const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();
    const upperWorldQ = makeOrthoBasis(axisX, axisY, axisZ);

    const lowerX = dLower.clone();
    const lowerY = new THREE.Vector3().subVectors(
      upRef,
      lowerX.clone().multiplyScalar(upRef.dot(lowerX))
    ).normalize();
    const lowerZ = new THREE.Vector3().crossVectors(lowerX, lowerY).normalize();
    const lowerWorldQ = makeOrthoBasis(lowerX, lowerY, lowerZ);

    return { upperWorldQ, lowerWorldQ };
  } else {
    const axisX = dUpper.clone().negate();
    const axisY = new THREE.Vector3().subVectors(
      upRef,
      axisX.clone().multiplyScalar(upRef.dot(axisX))
    ).normalize();
    const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();
    const upperWorldQ = makeOrthoBasis(axisX, axisY, axisZ);

    const lowerX = dLower.clone().negate();
    const lowerY = new THREE.Vector3().subVectors(
      upRef,
      lowerX.clone().multiplyScalar(upRef.dot(lowerX))
    ).normalize();
    const lowerZ = new THREE.Vector3().crossVectors(lowerX, lowerY).normalize();
    const lowerWorldQ = makeOrthoBasis(lowerX, lowerY, lowerZ);

    return { upperWorldQ, lowerWorldQ };
  }
}

/**
 * 严格几何对称手掌朝向求解器
 */
 // 替换 limbSolver.ts 里的 solveHandWorldQ 函数
 function solveHandWorldQ(
   pWrist: THREE.Vector3,
   pIndex1: THREE.Vector3,
   pPinky1: THREE.Vector3,
   pMiddle1: THREE.Vector3,
   isLeft: boolean,
   fallbackArmQ: THREE.Quaternion
 ): THREE.Quaternion {
   const dir = new THREE.Vector3().subVectors(pMiddle1, pWrist);
   if (dir.lengthSq() < 1e-4) {
     return fallbackArmQ.clone();
   }
   const boneDir = dir.normalize();

   const axisX = isLeft ? boneDir.clone() : boneDir.clone().negate();

   const sideVecDiff = new THREE.Vector3().subVectors(pIndex1, pPinky1);
   if (sideVecDiff.lengthSq() < 1e-4) {
     return fallbackArmQ.clone();
   }
   const sideVec = sideVecDiff.normalize();

   const axisY = isLeft
     ? new THREE.Vector3().crossVectors(sideVec, boneDir).normalize()
     : new THREE.Vector3().crossVectors(boneDir, sideVec).normalize();

   if (axisY.lengthSq() < 1e-4 || isNaN(axisY.x)) {
     return fallbackArmQ.clone();
   }

   const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();
   return makeOrthoBasis(axisX, axisY, axisZ);
 }

export function solveLimbs(
  lm: Record<string, [number, number, number]>,
  spineWorldQ: THREE.Quaternion,
  hipsWorldQ: THREE.Quaternion,
  hipSideOrtho: THREE.Vector3,
  chestUp: THREE.Vector3
) {
  const pUpperChest = getV(lm, '上半身2', getV(lm, '上半身'));

  const pLShoulder = getV(lm, '左肩', pUpperChest);
  const pLArm = getV(lm, '左腕', pLShoulder);
  const pLElbow = getV(lm, '左ひじ');
  const pLWrist = getV(lm, '左手首');

  const pRShoulder = getV(lm, '右肩', pUpperChest);
  const pRArm = getV(lm, '右腕', pRShoulder);
  const pRElbow = getV(lm, '右ひじ');
  const pRWrist = getV(lm, '右手首');

  const pLHip = getV(lm, '左足');
  const pLKnee = getV(lm, '左ひざ');
  const pLAnkle = getV(lm, '左足首');

  const pRHip = getV(lm, '右足');
  const pRKnee = getV(lm, '右ひざ');
  const pRAnkle = getV(lm, '右足首');

  const leftArm = solveAnatomicalLimb(pLArm, pLElbow, pLWrist, 'leftArm', hipSideOrtho, chestUp);
  const rightArm = solveAnatomicalLimb(pRArm, pRElbow, pRWrist, 'rightArm', hipSideOrtho, chestUp);
  const leftLeg = solveAnatomicalLimb(pLHip, pLKnee, pLAnkle, 'leg', hipSideOrtho, chestUp);
  const rightLeg = solveAnatomicalLimb(pRHip, pRKnee, pRAnkle, 'leg', hipSideOrtho, chestUp);

  const pLIndex1 = getV(lm, '左人指１', pLWrist);
  const pLPinky1 = getV(lm, '左小指１', pLWrist);
  const pLMiddle1 = getV(lm, '左中指１', pLWrist);
  const leftHandWorldQ = solveHandWorldQ(pLWrist, pLIndex1, pLPinky1, pLMiddle1, true, leftArm.lowerWorldQ);

  const pRIndex1 = getV(lm, '右人指１', pRWrist);
  const pRPinky1 = getV(lm, '右小指１', pRWrist);
  const pRMiddle1 = getV(lm, '右中指１', pRWrist);
  const rightHandWorldQ = solveHandWorldQ(pRWrist, pRIndex1, pRPinky1, pRMiddle1, false, rightArm.lowerWorldQ);

  const sInv = inv(spineWorldQ);
  const hInv = inv(hipsWorldQ);

  return {
    leftHandWorldQ,
    rightHandWorldQ,
    localRotations: {
      leftShoulder: new THREE.Quaternion(0, 0, 0, 1),
      leftUpperArm: mul(sInv, leftArm.upperWorldQ),
      leftLowerArm: mul(inv(leftArm.upperWorldQ), leftArm.lowerWorldQ),
      leftHand: mul(inv(leftArm.lowerWorldQ), leftHandWorldQ),

      rightShoulder: new THREE.Quaternion(0, 0, 0, 1),
      rightUpperArm: mul(sInv, rightArm.upperWorldQ),
      rightLowerArm: mul(inv(rightArm.upperWorldQ), rightArm.lowerWorldQ),
      rightHand: mul(inv(rightArm.lowerWorldQ), rightHandWorldQ),

      leftUpperLeg: mul(hInv, leftLeg.upperWorldQ),
      leftLowerLeg: mul(inv(leftLeg.upperWorldQ), leftLeg.lowerWorldQ),
      leftFoot: new THREE.Quaternion(0, 0, 0, 1),
      leftToes: new THREE.Quaternion(0, 0, 0, 1),

      rightUpperLeg: mul(hInv, rightLeg.upperWorldQ),
      rightLowerLeg: mul(inv(rightLeg.upperWorldQ), rightLeg.lowerWorldQ),
      rightFoot: new THREE.Quaternion(0, 0, 0, 1),
      rightToes: new THREE.Quaternion(0, 0, 0, 1),
    },
  };
}
