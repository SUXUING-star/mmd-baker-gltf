// src/solvers/spineSolver.ts
import * as THREE from 'three';
import { makeOrthoBasis, getV, inv, mul } from './mathUtils';

export function solveSpine(
  lm: Record<string, [number, number, number]>,
  hipsWorldQ: THREE.Quaternion,
  hipForward: THREE.Vector3
) {
  const pPelvis = getV(lm, '下半身');
  const pChest = getV(lm, '上半身', pPelvis);
  const pUpperChest = getV(lm, '上半身2', pChest);
  const pNeck = getV(lm, '首', pUpperChest);
  const pHead = getV(lm, '頭', pNeck);

  // 脊柱
  const spineUp = new THREE.Vector3().subVectors(pUpperChest, pPelvis).normalize();
  const spineSide = new THREE.Vector3().crossVectors(spineUp, hipForward).normalize();
  const spineForward = new THREE.Vector3().crossVectors(spineSide, spineUp).normalize();
  const spineWorldQ = makeOrthoBasis(spineSide, spineUp, spineForward);

  // 头颈
  const headUp = new THREE.Vector3().subVectors(pHead, pNeck).normalize();
  const headSide = new THREE.Vector3().crossVectors(headUp, spineForward).normalize();
  const headForward = new THREE.Vector3().crossVectors(headSide, headUp).normalize();
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
