// src/utils/vrmaExporter.ts
import type { VRMCVRMAnimation } from '@pixiv/types-vrmc-vrm-animation-1.0';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { HUMANOID_BONES, HumanoidBoneName, LandmarkData } from '../types/types';
import { solveAllHumanoidQuaternions } from './mathSolver';

/** VRMA 元数据配置接口 */
export interface VrmaMetaOptions {
  title?: string;
  authors?: string[];
  copyrightInformation?: string;
  licenseUrl?: string;
}

/** 构建符合 VRM 1.0 规范的 T-Pose 纯骨骼 Hierarchy */
function createHumanoidBoneNodes(): { scene: THREE.Scene; bones: Record<HumanoidBoneName, THREE.Bone> } {
  const scene = new THREE.Scene();
  const bones: Record<HumanoidBoneName, THREE.Bone> = {} as any;

  HUMANOID_BONES.forEach((name) => {
    bones[name] = new THREE.Bone();
    bones[name].name = name;
  });

  // T-Pose 骨骼基准局部偏移
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

  // 层级结构挂载
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
  bones.leftUpperArm.add(bones.leftLowerArm);
  bones.leftLowerArm.add(bones.leftHand);

  bones.upperChest.add(bones.rightShoulder);
  bones.rightShoulder.add(bones.rightUpperArm);
  bones.rightUpperArm.add(bones.rightLowerArm);
  bones.rightLowerArm.add(bones.rightHand);

  // 手指 30 节骨骼
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

  return { scene, bones };
}

/**
 * 导出符合 Pixiv 官方 VRMC_vrm_animation 1.0 规范的纯动作文件 (.vrma)
 */
export async function exportFull52VRMA(
  json: LandmarkData,
  metaOptions?: VrmaMetaOptions
): Promise<Blob> {
  const { scene, bones } = createHumanoidBoneNodes();
  scene.add(bones.hips);

  const { times, hipsPositions, quatTracksData } = solveAllHumanoidQuaternions(json);

  const tracks: THREE.KeyframeTrack[] = [];
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hipsPositions));
  HUMANOID_BONES.forEach((name) => {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, quatTracksData[name]));
  });

  const duration = times[times.length - 1] || 0;
  const clip = new THREE.AnimationClip('VRMAnimation', duration, tracks);

  const exporter = new GLTFExporter();

  // 注册 VRMC_vrm_animation GLTF 导出器扩展插件
  exporter.register((writer: any) => {
    return {
      name: 'VRMC_vrm_animation',
      afterParse: () => {
        const humanBones: Record<string, { node: number }> = {};
        HUMANOID_BONES.forEach((name) => {
          const bone = bones[name];
          if (bone) {
            const nodeIndex = writer.nodeMap.get(bone);
            if (nodeIndex !== undefined) {
              humanBones[name] = { node: nodeIndex };
            }
          }
        });

        // 构造标准的 VRMC_vrm_animation 扩展结构
        const vrmcAnimation: VRMCVRMAnimation = {
          specVersion: '1.0',
          humanoid: {
            humanBones: humanBones as any,
          },
        };

        const gltfJson = writer.json;

        // 写入用户实际配置的 Asset 与 Metadata
        gltfJson.asset = gltfJson.asset || {};
        gltfJson.asset.generator = 'MMD-to-Humanoid Solver (Pixiv VRMC_vrm_animation 1.0)';
        gltfJson.asset.extras = {
          title: metaOptions?.title?.trim() || 'Untitled VRMA Motion',
          authors: (metaOptions?.authors && metaOptions.authors.length > 0)
            ? metaOptions.authors
            : ['Unknown'],
          copyrightInformation: metaOptions?.copyrightInformation?.trim() || '',
          licenseUrl: metaOptions?.licenseUrl?.trim() || 'https://vrm.dev/licenses/1.0/',
        };

        // 写入 extensions
        gltfJson.extensions = gltfJson.extensions || {};
        gltfJson.extensions['VRMC_vrm_animation'] = vrmcAnimation;

        gltfJson.extensionsUsed = gltfJson.extensionsUsed || [];
        if (!gltfJson.extensionsUsed.includes('VRMC_vrm_animation')) {
          gltfJson.extensionsUsed.push('VRMC_vrm_animation');
        }
      },
    };
  });

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => resolve(new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' })),
      (err) => reject(err),
      { binary: true, animations: [clip] }
    );
  });
}
