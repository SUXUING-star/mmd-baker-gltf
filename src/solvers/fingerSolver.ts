// src/solvers/fingerSolver.ts
import * as THREE from 'three';
import { StandardBone } from '../types/boneMapping';
import { clamp, getV } from './mathUtils';

const PI = Math.PI;

function getJointBendAngle(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3
): number {
  const v1 = new THREE.Vector3().subVectors(p1, p0);
  const v2 = new THREE.Vector3().subVectors(p2, p1);
  const l1 = v1.length();
  const l2 = v2.length();
  if (l1 < 1e-4 || l2 < 1e-4) return 0;

  const dot = clamp(v1.dot(v2) / (l1 * l2), -1.0, 1.0);
  return Math.acos(dot);
}

export function solveFingers(
  lm: Record<string, [number, number, number]>,
  isLeft: boolean
) {
  const sideKey = isLeft ? 'left' : 'right';
  const wristKey = isLeft ? StandardBone.LeftHand : StandardBone.RightHand;
  const wrist = getV(lm, wristKey);
  const results: Record<string, THREE.Quaternion> = {};

  const fingerGroups = [
    {
      name: 'Index',
      k1: isLeft ? StandardBone.LeftIndex1 : StandardBone.RightIndex1,
      k2: isLeft ? StandardBone.LeftIndex2 : StandardBone.RightIndex2,
      k3: isLeft ? StandardBone.LeftIndex3 : StandardBone.RightIndex3,
    },
    {
      name: 'Middle',
      k1: isLeft ? StandardBone.LeftMiddle1 : StandardBone.RightMiddle1,
      k2: isLeft ? StandardBone.LeftMiddle2 : StandardBone.RightMiddle2,
      k3: isLeft ? StandardBone.LeftMiddle3 : StandardBone.RightMiddle3,
    },
    {
      name: 'Ring',
      k1: isLeft ? StandardBone.LeftRing1 : StandardBone.RightRing1,
      k2: isLeft ? StandardBone.LeftRing2 : StandardBone.RightRing2,
      k3: isLeft ? StandardBone.LeftRing3 : StandardBone.RightRing3,
    },
    {
      name: 'Little',
      k1: isLeft ? StandardBone.LeftLittle1 : StandardBone.RightLittle1,
      k2: isLeft ? StandardBone.LeftLittle2 : StandardBone.RightLittle2,
      k3: isLeft ? StandardBone.LeftLittle3 : StandardBone.RightLittle3,
    },
  ] as const;

  // 1. 食指、中指、无名指、小指
  fingerGroups.forEach(({ name, k1, k2, k3 }) => {
    const p1 = getV(lm, k1, wrist);
    const p2 = getV(lm, k2, p1);
    const p3 = getV(lm, k3, p2);

    const bProx = clamp(getJointBendAngle(wrist, p1, p2), 0, PI * 0.6);
    const bInter = clamp(getJointBendAngle(p1, p2, p3), 0, PI * 0.6);
    const bDist = bInter * 0.75;

    const zRotProx = isLeft ? -bProx : bProx;
    const zRotInter = isLeft ? -bInter : bInter;
    const zRotDist = isLeft ? -bDist : bDist;

    results[`${sideKey}${name}Proximal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, zRotProx, 'XYZ')
    );
    results[`${sideKey}${name}Intermediate`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, zRotInter, 'XYZ')
    );
    results[`${sideKey}${name}Distal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, zRotDist, 'XYZ')
    );
  });

  // 2. 大拇指
  const t0Key = isLeft ? StandardBone.LeftThumb0 : StandardBone.RightThumb0;
  const t1Key = isLeft ? StandardBone.LeftThumb1 : StandardBone.RightThumb1;
  const t2Key = isLeft ? StandardBone.LeftThumb2 : StandardBone.RightThumb2;

  const t0 = getV(lm, t0Key, wrist);
  const t1 = getV(lm, t1Key, t0);
  const t2 = getV(lm, t2Key, t1);

  const tBendBase = clamp(getJointBendAngle(wrist, t0, t1), 0, PI * 0.5);
  const tBendMid = clamp(getJointBendAngle(t0, t1, t2), 0, PI * 0.5);

  if (isLeft) {
    results[`leftThumbMetacarpal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0.1, -0.25, -tBendBase * 0.6, 'XYZ')
    );
    results[`leftThumbProximal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, -tBendMid * 0.8, 'XYZ')
    );
    results[`leftThumbDistal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, -tBendMid * 0.6, 'XYZ')
    );
  } else {
    results[`rightThumbMetacarpal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0.1, 0.25, tBendBase * 0.6, 'XYZ')
    );
    results[`rightThumbProximal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, tBendMid * 0.8, 'XYZ')
    );
    results[`rightThumbDistal`] = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, tBendMid * 0.6, 'XYZ')
    );
  }

  return results;
}
