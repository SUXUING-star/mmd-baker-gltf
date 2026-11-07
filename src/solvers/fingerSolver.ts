// src/solvers/fingerSolver.ts
import * as THREE from 'three';
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
  const prefix = isLeft ? '左' : '右';
  const sideKey = isLeft ? 'left' : 'right';

  const wrist = getV(lm, `${prefix}手首`);
  const results: Record<string, THREE.Quaternion> = {};

  const fingerConfigs = [
    { name: 'Index', mmd: '人指' },
    { name: 'Middle', mmd: '中指' },
    { name: 'Ring', mmd: '薬指' },
    { name: 'Little', mmd: '小指' },
  ] as const;

  // 1. 食指、中指、无名指、小指
  fingerConfigs.forEach(({ name, mmd }) => {
    const p1 = lm[`${prefix}${mmd}１`] ? getV(lm, `${prefix}${mmd}１`) : wrist;
    const p2 = lm[`${prefix}${mmd}２`] ? getV(lm, `${prefix}${mmd}２`) : p1;
    const p3 = lm[`${prefix}${mmd}３`] ? getV(lm, `${prefix}${mmd}３`) : p2;

    const bProx = clamp(getJointBendAngle(wrist, p1, p2), 0, PI * 0.6);
    const bInter = clamp(getJointBendAngle(p1, p2, p3), 0, PI * 0.6);
    const bDist = bInter * 0.75;

    // 显式左右分明：左手绕 -Z 扣向掌心，右手绕 +Z 扣向掌心
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

  // 2. 大拇指 (对掌显式镜像)
  const t0 = lm[`${prefix}親指０`] ? getV(lm, `${prefix}親指０`) : wrist;
  const t1 = lm[`${prefix}親指１`] ? getV(lm, `${prefix}親指１`) : t0;
  const t2 = lm[`${prefix}親指２`] ? getV(lm, `${prefix}親指２`) : t1;

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
