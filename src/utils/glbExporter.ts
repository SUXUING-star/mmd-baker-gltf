// src/utils/glbExporter.ts
import * as THREE from 'three';
import { HUMANOID_BONES, LandmarkData } from '../types/types';
import {
    buildHumanoidAnimationClip,
    createHumanoidBoneHierarchy,
    exportSceneToBinaryGltf,
} from './humanoidExportBase';

export async function exportFull52HumanoidGLB(json: LandmarkData): Promise<Blob> {
  const scene = new THREE.Scene();
  const bones = createHumanoidBoneHierarchy();

  const boneArray = HUMANOID_BONES.map((n) => bones[n]);
  const skeleton = new THREE.Skeleton(boneArray);
  const dummyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const posCount = dummyGeometry.attributes.position.count;

  const skinIndices = new Uint16Array(posCount * 4);
  const skinWeights = new Float32Array(posCount * 4);
  for (let i = 0; i < posCount; i++) {
    skinIndices[i * 4 + 0] = 0;
    skinIndices[i * 4 + 1] = 1;
    skinIndices[i * 4 + 2] = 2;
    skinIndices[i * 4 + 3] = 3;
    skinWeights[i * 4 + 0] = 1.0;
  }

  dummyGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  dummyGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const skinnedMesh = new THREE.SkinnedMesh(dummyGeometry, new THREE.MeshStandardMaterial({ color: 0x007acc }));
  skinnedMesh.add(bones.hips);
  skinnedMesh.bind(skeleton);
  scene.add(skinnedMesh);

  const clip = buildHumanoidAnimationClip(json, 'MMD_Pointcloud_Pure_Solved');

  return exportSceneToBinaryGltf(scene, clip);
}
