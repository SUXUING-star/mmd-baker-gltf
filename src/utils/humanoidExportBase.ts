// src/utils/humanoidExportBase.ts
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { isPresetExpression } from '../types/expressionMapping';
import { HUMANOID_BONES, HumanoidBoneName, LandmarkData } from '../types/types';
import { DEFAULT_LOOP_OPTIONS, LoopBlendOptions } from './loopBlender';
import { solveAllHumanoidQuaternions } from './mathSolver';

export interface ExpressionNodeBinding {
  node: THREE.Object3D;
  expressionName: string;
  isPreset: boolean;
}

/**
 * 构建符合 VRM 1.0 / Humanoid 规范的 52 根 T-Pose 骨骼与父子层级
 */
export function createHumanoidBoneHierarchy(): Record<HumanoidBoneName, THREE.Bone> {
  const bones: Record<HumanoidBoneName, THREE.Bone> = {} as Record<HumanoidBoneName, THREE.Bone>;

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

  // 躯干与头部
  bones.hips.add(bones.spine);
  bones.spine.add(bones.chest);
  bones.chest.add(bones.upperChest);
  bones.upperChest.add(bones.neck);
  bones.neck.add(bones.head);

  // 双腿
  bones.hips.add(bones.leftUpperLeg);
  bones.leftUpperLeg.add(bones.leftLowerLeg);
  bones.leftLowerLeg.add(bones.leftFoot);
  bones.leftFoot.add(bones.leftToes);

  bones.hips.add(bones.rightUpperLeg);
  bones.rightUpperLeg.add(bones.rightLowerLeg);
  bones.rightLowerLeg.add(bones.rightFoot);
  bones.rightFoot.add(bones.rightToes);

  // 双臂
  bones.upperChest.add(bones.leftShoulder);
  bones.leftShoulder.add(bones.leftUpperArm);
  bones.leftUpperArm.add(bones.leftLowerArm);
  bones.leftLowerArm.add(bones.leftHand);

  bones.upperChest.add(bones.rightShoulder);
  bones.rightShoulder.add(bones.rightUpperArm);
  bones.rightUpperArm.add(bones.rightLowerArm);
  bones.rightLowerArm.add(bones.rightHand);

  // 手指 30 节骨骼
  const fingerList = HUMANOID_BONES.filter(
    (b) => b.includes('Thumb') || b.includes('Index') || b.includes('Middle') || b.includes('Ring') || b.includes('Little')
  );
  fingerList.forEach((f) => bones[f].position.set(f.startsWith('left') ? 0.03 : -0.03, 0, 0));

  bones.leftHand.add(bones.leftThumbMetacarpal);
  bones.leftThumbMetacarpal.add(bones.leftThumbProximal);
  bones.leftThumbProximal.add(bones.leftThumbDistal);
  bones.leftHand.add(bones.leftIndexProximal);
  bones.leftIndexProximal.add(bones.leftIndexIntermediate);
  bones.leftIndexIntermediate.add(bones.leftIndexDistal);
  bones.leftHand.add(bones.leftMiddleProximal);
  bones.leftMiddleProximal.add(bones.leftMiddleIntermediate);
  bones.leftMiddleIntermediate.add(bones.leftMiddleDistal);
  bones.leftHand.add(bones.leftRingProximal);
  bones.leftRingProximal.add(bones.leftRingIntermediate);
  bones.leftRingIntermediate.add(bones.leftRingDistal);
  bones.leftHand.add(bones.leftLittleProximal);
  bones.leftLittleProximal.add(bones.leftLittleIntermediate);
  bones.leftLittleIntermediate.add(bones.leftLittleDistal);

  bones.rightHand.add(bones.rightThumbMetacarpal);
  bones.rightThumbMetacarpal.add(bones.rightThumbProximal);
  bones.rightThumbProximal.add(bones.rightThumbDistal);
  bones.rightHand.add(bones.rightIndexProximal);
  bones.rightIndexProximal.add(bones.rightIndexIntermediate);
  bones.rightIndexIntermediate.add(bones.rightIndexDistal);
  bones.rightHand.add(bones.rightMiddleProximal);
  bones.rightMiddleProximal.add(bones.rightMiddleIntermediate);
  bones.rightMiddleIntermediate.add(bones.rightMiddleDistal);
  bones.rightHand.add(bones.rightRingProximal);
  bones.rightRingProximal.add(bones.rightRingIntermediate);
  bones.rightRingIntermediate.add(bones.rightRingDistal);
  bones.rightHand.add(bones.rightLittleProximal);
  bones.rightLittleProximal.add(bones.rightLittleIntermediate);
  bones.rightLittleIntermediate.add(bones.rightLittleDistal);

  return bones;
}

/**
 * 求解全部 52 根骨骼四元数并构建 AnimationClip，同时返回时间轴数组供表情轨道复用
 */
export function buildHumanoidAnimationClipWithTimes(
  json: LandmarkData,
  clipName: string,
  loopOptions: LoopBlendOptions = DEFAULT_LOOP_OPTIONS
): { clip: THREE.AnimationClip; times: number[] } {
  const { times, hipsPositions, quatTracksData } = solveAllHumanoidQuaternions(json, loopOptions);

  const tracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack('hips.position', times, hipsPositions),
    ...HUMANOID_BONES.map((name) => new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, quatTracksData[name])),
  ];

  const duration = times[times.length - 1] || 0;
  return {
    clip: new THREE.AnimationClip(clipName, duration, tracks),
    times,
  };
}

/**
 * 求解全部 52 根骨骼四元数并构建 AnimationClip
 */
export function buildHumanoidAnimationClip(
  json: LandmarkData,
  clipName: string,
  loopOptions: LoopBlendOptions = DEFAULT_LOOP_OPTIONS
): THREE.AnimationClip {
  return buildHumanoidAnimationClipWithTimes(json, clipName, loopOptions).clip;
}

/**
 * 为存在有效动画的表情创建 VRMA 节点与 position.x 权重轨道
 */
export function buildVrmaExpressionTracks(
  json: LandmarkData,
  times: number[],
  loopOptions: LoopBlendOptions = DEFAULT_LOOP_OPTIONS
): {
  bindings: ExpressionNodeBinding[];
  tracks: THREE.KeyframeTrack[];
} {
  const frames = json.frames;
  if (!frames.length || times.length !== frames.length) {
    return { bindings: [], tracks: [] };
  }

  // 统计真正出现过非零权重的表情，过滤全程为 0 的无效表情
  const activeNames = new Set<string>();
  for (const frame of frames) {
    if (!frame.expressions) continue;
    for (const [name, weight] of Object.entries(frame.expressions)) {
      if (weight > 1e-4) {
        activeNames.add(name);
      }
    }
  }

  const bindings: ExpressionNodeBinding[] = [];
  const tracks: THREE.KeyframeTrack[] = [];
  const fps = json.fps || 30;
  const totalFrames = frames.length;

  Array.from(activeNames).forEach((exprName, idx) => {
    // 节点名使用纯 ASCII 安全字符，避免含 "." / "[" / "]" 等的日文 Morph 名破坏 Three.js PropertyBinding
    const node = new THREE.Object3D();
    node.name = `vrma_expr_${idx}`;

    const positions = new Float32Array(totalFrames * 3);
    const startVal = frames[0].expressions?.[exprName] ?? 0;
    const endVal = frames[totalFrames - 1].expressions?.[exprName] ?? 0;

    for (let i = 0; i < totalFrames; i++) {
      let w = frames[i].expressions?.[exprName] ?? 0;

      if (loopOptions.enabled && totalFrames > 1) {
        if (loopOptions.mode === 'idle') {
          const u = i / (totalFrames - 1);
          const blendWeight = 0.5 * (1 - Math.cos(Math.PI * u));
          w = w + (startVal - endVal) * blendWeight;
        } else if (loopOptions.mode === 'tail') {
          const blendSec = Math.min(loopOptions.blendDuration, (totalFrames / fps) * 0.45);
          const blendFrames = Math.max(2, Math.round(blendSec * fps));
          const blendStart = totalFrames - blendFrames;
          if (i >= blendStart) {
            const localU = (i - blendStart + 1) / blendFrames;
            const blendWeight = 0.5 * (1 - Math.cos(Math.PI * localU));
            w = w * (1 - blendWeight) + startVal * blendWeight;
          }
        }
      }

      // VRMA 规范要求 weight 位于 [0, 1]，写入平移动画的 X 分量
      positions[i * 3 + 0] = Math.max(0, Math.min(1, w));
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    bindings.push({
      node,
      expressionName: exprName,
      isPreset: isPresetExpression(exprName),
    });
    tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, times, positions));
  });

  return { bindings, tracks };
}

/**
 * 通用 GLTF/GLB 二进制导出封装，允许传入插件注册回调
 */
export function exportSceneToBinaryGltf(
  scene: THREE.Scene,
  clip: THREE.AnimationClip,
  configureExporter?: (exporter: GLTFExporter) => void
): Promise<Blob> {
  const exporter = new GLTFExporter();
  configureExporter?.(exporter);

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => resolve(new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' })),
      (err) => reject(err),
      { binary: true, animations: [clip] }
    );
  });
}
