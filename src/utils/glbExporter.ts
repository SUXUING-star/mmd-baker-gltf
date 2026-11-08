// src/utils/glbExporter.ts
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { HUMANOID_BONES, HumanoidBoneName, LandmarkData } from '../types/types';
import { solveAllHumanoidQuaternions } from './mathSolver';

export async function exportFull52HumanoidGLB(json: LandmarkData): Promise<Blob> {
  const scene = new THREE.Scene();

  const bones: Record<HumanoidBoneName, THREE.Bone> = {} as any;
  HUMANOID_BONES.forEach((name) => {
    bones[name] = new THREE.Bone();
    bones[name].name = name;
  });

  // T-Pose 局部偏移
  bones.hips.position.set(0, 0.95, 0);
  bones.spine.position.set(0, 0.12, 0);
  bones.chest.position.set(0, 0.14, 0);
  bones.upperChest.position.set(0, 0.12, 0);
  bones.neck.position.set(0, 0.10, 0);
  bones.head.position.set(0, 0.12, 0);

  bones.leftShoulder.position.set(0.08, 0.04, 0);
  bones.leftUpperArm.position.set(0.12, 0, 0);
  bones.leftLowerArm.position.set(0.24, 0, 0);
  bones.leftHand.position.set(0.22, 0, 0);

  bones.rightShoulder.position.set(-0.08, 0.04, 0);
  bones.rightUpperArm.position.set(-0.12, 0, 0);
  bones.rightLowerArm.position.set(-0.24, 0, 0);
  bones.rightHand.position.set(-0.22, 0, 0);

  bones.leftUpperLeg.position.set(0.1, -0.05, 0);
  bones.leftLowerLeg.position.set(0, -0.42, 0);
  bones.leftFoot.position.set(0, -0.40, 0);
  bones.leftToes.position.set(0, -0.05, 0.14);

  bones.rightUpperLeg.position.set(-0.1, -0.05, 0);
  bones.rightLowerLeg.position.set(0, -0.42, 0);
  bones.rightFoot.position.set(0, -0.40, 0);
  bones.rightToes.position.set(0, -0.05, 0.14);

  // 骨骼树构建
  bones.hips.add(bones.spine);
  bones.spine.add(bones.chest);
  bones.chest.add(bones.upperChest);
  bones.upperChest.add(bones.neck);
  bones.neck.add(bones.head);

  bones.hips.add(bones.leftUpperLeg);
  bones.leftUpperLeg.add(bones.leftLowerLeg);
  bones.leftLowerLeg.add(bones.leftFoot);
  bones.leftFoot.add(bones.leftToes);

  bones.hips.add(bones.rightUpperLeg);
  bones.rightUpperLeg.add(bones.rightLowerLeg);
  bones.rightLowerLeg.add(bones.rightFoot);
  bones.rightFoot.add(bones.rightToes);

  bones.upperChest.add(bones.leftShoulder);
  bones.leftShoulder.add(bones.leftUpperArm);
  bones.leftShoulder.add(bones.leftLowerArm);
  bones.leftLowerArm.add(bones.leftHand);

  bones.upperChest.add(bones.rightShoulder);
  bones.rightShoulder.add(bones.rightUpperArm);
  bones.rightShoulder.add(bones.rightLowerArm);
  bones.rightLowerArm.add(bones.rightHand);

  const fingerList = HUMANOID_BONES.filter((b) =>
    b.includes('Thumb') || b.includes('Index') || b.includes('Middle') || b.includes('Ring') || b.includes('Little')
  );
  fingerList.forEach((f) => bones[f].position.set(f.startsWith('left') ? 0.03 : -0.03, 0, 0));

  bones.leftHand.add(bones.leftThumbMetacarpal); bones.leftThumbMetacarpal.add(bones.leftThumbProximal); bones.leftThumbProximal.add(bones.leftThumbDistal);
  bones.leftHand.add(bones.leftIndexProximal); bones.leftIndexProximal.add(bones.leftIndexIntermediate); bones.leftIndexIntermediate.add(bones.leftIndexDistal);
  bones.leftHand.add(bones.leftMiddleProximal); bones.leftMiddleProximal.add(bones.leftMiddleIntermediate); bones.leftMiddleIntermediate.add(bones.leftMiddleDistal);
  bones.leftHand.add(bones.leftRingProximal); bones.leftRingProximal.add(bones.leftRingIntermediate); bones.leftRingIntermediate.add(bones.leftRingDistal);
  bones.leftHand.add(bones.leftLittleProximal); bones.leftLittleProximal.add(bones.leftLittleIntermediate); bones.leftLittleIntermediate.add(bones.leftLittleDistal);

  bones.rightHand.add(bones.rightThumbMetacarpal); bones.rightThumbMetacarpal.add(bones.rightThumbProximal); bones.rightThumbProximal.add(bones.rightThumbDistal);
  bones.rightHand.add(bones.rightIndexProximal); bones.rightIndexProximal.add(bones.rightIndexIntermediate); bones.rightIndexIntermediate.add(bones.rightIndexDistal);
  bones.rightHand.add(bones.rightMiddleProximal); bones.rightMiddleProximal.add(bones.rightMiddleIntermediate); bones.rightMiddleIntermediate.add(bones.rightMiddleDistal);
  bones.rightHand.add(bones.rightRingProximal); bones.rightRingProximal.add(bones.rightRingIntermediate); bones.rightRingIntermediate.add(bones.rightRingDistal);
  bones.rightHand.add(bones.rightLittleProximal); bones.rightLittleProximal.add(bones.rightLittleIntermediate); bones.rightLittleIntermediate.add(bones.rightLittleDistal);

  // 绑定虚拟蒙皮，通过 Validator 校验
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

  // 关键帧四元数求解
  const { times, hipsPositions, quatTracksData } = solveAllHumanoidQuaternions(json);

  const tracks: THREE.KeyframeTrack[] = [];
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hipsPositions));
  HUMANOID_BONES.forEach((name) => {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, quatTracksData[name]));
  });

  const duration = times[times.length - 1] || 0;
  const clip = new THREE.AnimationClip('MMD_Pointcloud_Pure_Solved', duration, tracks);

  const exporter = new GLTFExporter();
  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => resolve(new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' })),
      (err) => reject(err),
      { binary: true, animations: [clip] }
    );
  });
}
