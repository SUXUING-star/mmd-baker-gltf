// src/types/boneMapping.ts
import * as THREE from 'three';

/** 内部统一标准语义骨骼 Key */
export const StandardBone = {
  Root: 'Root',
  Hips: 'Hips',
  Spine: 'Spine',
  Chest: 'Chest',
  Neck: 'Neck',
  Head: 'Head',

  LeftShoulder: 'LeftShoulder',
  LeftUpperArm: 'LeftUpperArm',
  LeftLowerArm: 'LeftLowerArm',
  LeftHand: 'LeftHand',

  RightShoulder: 'RightShoulder',
  RightUpperArm: 'RightUpperArm',
  RightLowerArm: 'RightLowerArm',
  RightHand: 'RightHand',

  LeftUpperLeg: 'LeftUpperLeg',
  LeftLowerLeg: 'LeftLowerLeg',
  LeftFoot: 'LeftFoot',
  LeftToes: 'LeftToes',

  RightUpperLeg: 'RightUpperLeg',
  RightLowerLeg: 'RightLowerLeg',
  RightFoot: 'RightFoot',
  RightToes: 'RightToes',

  // 左手 5 指 (0=根部掌骨/大拇指根, 1=近节, 2=中节, 3=远节)
  LeftThumb0: 'LeftThumb0', LeftThumb1: 'LeftThumb1', LeftThumb2: 'LeftThumb2',
  LeftIndex1: 'LeftIndex1', LeftIndex2: 'LeftIndex2', LeftIndex3: 'LeftIndex3',
  LeftMiddle1: 'LeftMiddle1', LeftMiddle2: 'LeftMiddle2', LeftMiddle3: 'LeftMiddle3',
  LeftRing1: 'LeftRing1', LeftRing2: 'LeftRing2', LeftRing3: 'LeftRing3',
  LeftLittle1: 'LeftLittle1', LeftLittle2: 'LeftLittle2', LeftLittle3: 'LeftLittle3',

  // 右手 5 指
  RightThumb0: 'RightThumb0', RightThumb1: 'RightThumb1', RightThumb2: 'RightThumb2',
  RightIndex1: 'RightIndex1', RightIndex2: 'RightIndex2', RightIndex3: 'RightIndex3',
  RightMiddle1: 'RightMiddle1', RightMiddle2: 'RightMiddle2', RightMiddle3: 'RightMiddle3',
  RightRing1: 'RightRing1', RightRing2: 'RightRing2', RightRing3: 'RightRing3',
  RightLittle1: 'RightLittle1', RightLittle2: 'RightLittle2', RightLittle3: 'RightLittle3',
} as const;

export type StandardBoneKey = (typeof StandardBone)[keyof typeof StandardBone];

/** 垃圾/辅助骨骼黑名单关键字（防止误匹配终端骨或控制杆） */
const GARBAGE_BONE_KEYWORDS = [
  '_end', 'end', 'pole', 'target', 'handle', 'mmd_shadow', 'mmd_dummy',
  'dummy', 'shadow', 'ik_parent', 'eye_control', '_ik', 'effector'
];

/**
 * 标准骨骼 -> 别名候选词库（按优先级排列）
 * 覆盖：日文原生 MMD、UmaViewer 提取骨骼、英文 Mixamo/VRM 命名
 */
export const BONE_CANDIDATE_MAP: Record<StandardBoneKey, string[]> = {
  [StandardBone.Root]: ['センター', 'center', 'Position', 'Root', '全ての親', 'root'],
  [StandardBone.Hips]: ['下半身', 'Hips', 'Hip', 'hips', 'hip', 'Pelvis', 'pelvis'],
  [StandardBone.Spine]: ['上半身', 'Spine', 'spine', 'Spine1'],
  [StandardBone.Chest]: ['上半身2', 'Chest', 'chest', '胸', 'Spine2', 'upperChest'],
  [StandardBone.Neck]: ['首', 'Neck', 'neck'],
  [StandardBone.Head]: ['頭', 'Head', 'head'],

  [StandardBone.LeftShoulder]: ['左肩', 'ShoulderL', 'Shoulder_L', 'leftShoulder', 'shoulder.L'],
  [StandardBone.LeftUpperArm]: ['左腕', 'UpperArmL', 'Arm_L', 'UpperArm_L', 'leftUpperArm', 'arm.L'],
  [StandardBone.LeftLowerArm]: ['左ひじ', 'LowerArmL', 'Elbow_L', 'LowerArm_L', 'leftLowerArm', 'elbow.L'],
  [StandardBone.LeftHand]: ['左手首', 'HandL', 'Wrist_L', 'Hand_L', 'leftHand', 'wrist.L'],

  [StandardBone.RightShoulder]: ['右肩', 'ShoulderR', 'Shoulder_R', 'rightShoulder', 'shoulder.R'],
  [StandardBone.RightUpperArm]: ['右腕', 'UpperArmR', 'Arm_R', 'UpperArm_R', 'rightUpperArm', 'arm.R'],
  [StandardBone.RightLowerArm]: ['右ひじ', 'LowerArmR', 'Elbow_R', 'LowerArm_R', 'rightLowerArm', 'elbow.R'],
  [StandardBone.RightHand]: ['右手首', 'HandR', 'Wrist_R', 'Hand_R', 'rightHand', 'wrist.R'],

  [StandardBone.LeftUpperLeg]: ['左足', 'UpperLegL', 'Leg_L', 'Thigh_L', 'leftUpperLeg', 'leg.L'],
  [StandardBone.LeftLowerLeg]: ['左ひざ', 'LowerLegL', 'Knee_L', 'LowerLeg_L', 'leftLowerLeg', 'knee.L'],
  [StandardBone.LeftFoot]: ['左足首', 'FootL', 'Ankle_L', 'Foot_L', 'leftFoot', 'ankle.L'],
  [StandardBone.LeftToes]: ['左つま先', 'ToesL', 'Toe_L', 'leftToes', 'toe.L'],

  [StandardBone.RightUpperLeg]: ['右足', 'UpperLegR', 'Leg_R', 'Thigh_R', 'rightUpperLeg', 'leg.R'],
  [StandardBone.RightLowerLeg]: ['右ひざ', 'LowerLegR', 'Knee_R', 'LowerLeg_R', 'rightLowerLeg', 'knee.R'],
  [StandardBone.RightFoot]: ['右足首', 'FootR', 'Ankle_R', 'Foot_R', 'rightFoot', 'ankle.R'],
  [StandardBone.RightToes]: ['右つま先', 'ToesR', 'Toe_R', 'rightToes', 'toe.R'],

  // 左手 5 指
  [StandardBone.LeftThumb0]: ['左親指０', 'Thumb0L', 'Thumb_0_L', 'Thumb0_L', 'leftThumb0'],
  [StandardBone.LeftThumb1]: ['左親指１', 'Thumb1L', 'Thumb_1_L', 'Thumb1_L', 'leftThumb1'],
  [StandardBone.LeftThumb2]: ['左親指２', 'Thumb2L', 'Thumb_2_L', 'Thumb2_L', 'leftThumb2'],
  [StandardBone.LeftIndex1]: ['左人指１', 'Index1L', 'Index_1_L', 'Index1_L', 'leftIndex1'],
  [StandardBone.LeftIndex2]: ['左人指２', 'Index2L', 'Index_2_L', 'Index2_L', 'leftIndex2'],
  [StandardBone.LeftIndex3]: ['左人指３', 'Index3L', 'Index_3_L', 'Index3_L', 'leftIndex3'],
  [StandardBone.LeftMiddle1]: ['左中指１', 'Middle1L', 'Middle_1_L', 'Middle1_L', 'leftMiddle1'],
  [StandardBone.LeftMiddle2]: ['左中指２', 'Middle2L', 'Middle_2_L', 'Middle2_L', 'leftMiddle2'],
  [StandardBone.LeftMiddle3]: ['左中指３', 'Middle3L', 'Middle_3_L', 'Middle3_L', 'leftMiddle3'],
  [StandardBone.LeftRing1]: ['左薬指１', 'Ring1L', 'Ring_1_L', 'Ring1_L', 'leftRing1'],
  [StandardBone.LeftRing2]: ['左薬指２', 'Ring2L', 'Ring_2_L', 'Ring2_L', 'leftRing2'],
  [StandardBone.LeftRing3]: ['左薬指３', 'Ring3L', 'Ring_3_L', 'Ring3_L', 'leftRing3'],
  [StandardBone.LeftLittle1]: ['左小指１', 'Little1L', 'Pinky1L', 'Little_1_L', 'Pinky_1_L', 'leftLittle1'],
  [StandardBone.LeftLittle2]: ['左小指２', 'Little2L', 'Pinky2L', 'Little_2_L', 'Pinky_2_L', 'leftLittle2'],
  [StandardBone.LeftLittle3]: ['左小指３', 'Little3L', 'Pinky3L', 'Little_3_L', 'Pinky_3_L', 'leftLittle3'],

  // 右手 5 指
  [StandardBone.RightThumb0]: ['右親指０', 'Thumb0R', 'Thumb_0_R', 'Thumb0_R', 'rightThumb0'],
  [StandardBone.RightThumb1]: ['右親指１', 'Thumb1R', 'Thumb_1_R', 'Thumb1_R', 'rightThumb1'],
  [StandardBone.RightThumb2]: ['右親指２', 'Thumb2R', 'Thumb_2_R', 'Thumb2_R', 'rightThumb2'],
  [StandardBone.RightIndex1]: ['右人指１', 'Index1R', 'Index_1_R', 'Index1_R', 'rightIndex1'],
  [StandardBone.RightIndex2]: ['右人指２', 'Index2R', 'Index_2_R', 'Index2_R', 'rightIndex2'],
  [StandardBone.RightIndex3]: ['右人指３', 'Index3R', 'Index_3_R', 'Index3_R', 'rightIndex3'],
  [StandardBone.RightMiddle1]: ['右中指１', 'Middle1R', 'Middle_1_R', 'Middle1_R', 'rightMiddle1'],
  [StandardBone.RightMiddle2]: ['右中指２', 'Middle2R', 'Middle_2_R', 'Middle2_R', 'rightMiddle2'],
  [StandardBone.RightMiddle3]: ['右中指３', 'Middle3R', 'Middle_3_R', 'Middle3_R', 'rightMiddle3'],
  [StandardBone.RightRing1]: ['右薬指１', 'Ring1R', 'Ring_1_R', 'Ring1_R', 'rightRing1'],
  [StandardBone.RightRing2]: ['右薬指２', 'Ring2R', 'Ring_2_R', 'Ring2_R', 'rightRing2'],
  [StandardBone.RightRing3]: ['右薬指３', 'Ring3R', 'Ring_3_R', 'Ring3_R', 'rightRing3'],
  [StandardBone.RightLittle1]: ['右小指１', 'Little1R', 'Pinky1R', 'Little_1_R', 'Pinky_1_R', 'rightLittle1'],
  [StandardBone.RightLittle2]: ['右小指２', 'Little2R', 'Pinky2R', 'Little_2_R', 'Pinky_2_R', 'rightLittle2'],
  [StandardBone.RightLittle3]: ['右小指３', 'Little3R', 'Pinky3R', 'Little_3_R', 'Pinky_3_R', 'rightLittle3'],
};

/** 字符归一化 (转小写，去除所有下划线、空格、点) */
function normalizeBoneName(name: string): string {
  return name.toLowerCase().replace(/[_\s\.]/g, '');
}

/** 智能解析骨骼树，将模型实际存在的骨骼映射至标准键 */
export function resolveModelBones(bones: THREE.Bone[]): Map<StandardBoneKey, THREE.Bone> {
  const result = new Map<StandardBoneKey, THREE.Bone>();

  // 1. 过滤垃圾骨骼并建立查找表
  const validBones: THREE.Bone[] = [];
  const nameToBone = new Map<string, THREE.Bone>();
  const normalizedMap = new Map<string, THREE.Bone>();

  bones.forEach((b) => {
    const rawName = b.name.trim();
    const lower = rawName.toLowerCase();
    const isGarbage = GARBAGE_BONE_KEYWORDS.some((kw) => lower.includes(kw));
    if (isGarbage) return;

    validBones.push(b);
    nameToBone.set(rawName, b);
    normalizedMap.set(normalizeBoneName(rawName), b);
  });

  // 2. 针对每一个标准骨骼，按候选优先级进行两级搜索
  (Object.keys(BONE_CANDIDATE_MAP) as StandardBoneKey[]).forEach((stdKey) => {
    const candidates = BONE_CANDIDATE_MAP[stdKey];

    // 第一级：精确命中
    for (const cand of candidates) {
      if (nameToBone.has(cand)) {
        result.set(stdKey, nameToBone.get(cand)!);
        return;
      }
    }

    // 第二级：归一化模糊命中（忽略大小写、下划线）
    for (const cand of candidates) {
      const norm = normalizeBoneName(cand);
      if (normalizedMap.has(norm)) {
        result.set(stdKey, normalizedMap.get(norm)!);
        return;
      }
    }
  });

  return result;
}
