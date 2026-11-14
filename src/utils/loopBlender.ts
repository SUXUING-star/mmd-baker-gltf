// src/utils/loopBlender.ts
import { LandmarkData, LandmarkFrame } from '../types/types';

export type LoopBlendMode = 'idle' | 'tail' | 'cyclic' | 'mirror';

export interface LoopBlendOptions {
  enabled: boolean;
  mode: LoopBlendMode;
  blendDuration: number;
  blendHipsXZ: boolean;
  headStabilizer?: boolean;
}

export const DEFAULT_LOOP_OPTIONS: LoopBlendOptions = {
  enabled: false,
  mode: 'idle',
  blendDuration: 0.8,
  blendHipsXZ: true,
  headStabilizer: true,
};

// src/utils/loopBlender.ts (骨骼镜像解析模块)
import { BONE_CANDIDATE_MAP, StandardBoneKey } from '../types/boneMapping';

/**
 * 1. 自动从项目的 BONE_CANDIDATE_MAP 派生左右标准骨骼双向映射表
 */
const BONE_MIRROR_CACHE = new Map<string, string>();

(function initSemanticMirrorMap() {
  const keys = Object.keys(BONE_CANDIDATE_MAP) as StandardBoneKey[];
  for (const key of keys) {
    let partnerKey: StandardBoneKey | null = null;
    if (key.startsWith('Left')) {
      partnerKey = ('Right' + key.slice(4)) as StandardBoneKey;
    } else if (key.startsWith('Right')) {
      partnerKey = ('Left' + key.slice(5)) as StandardBoneKey;
    }

    if (partnerKey && BONE_CANDIDATE_MAP[partnerKey]) {
      // 映射 StandardBone Key 自身 (如 LeftUpperArm <-> RightUpperArm)
      BONE_MIRROR_CACHE.set(key, partnerKey);
      BONE_MIRROR_CACHE.set(partnerKey, key);

      // 按词库对等索引映射所有别名 (如 左腕 <-> 右腕, UpperArm_L <-> UpperArm_R)
      const leftCands = BONE_CANDIDATE_MAP[key];
      const rightCands = BONE_CANDIDATE_MAP[partnerKey];
      const len = Math.min(leftCands.length, rightCands.length);
      for (let i = 0; i < len; i++) {
        BONE_MIRROR_CACHE.set(leftCands[i], rightCands[i]);
        BONE_MIRROR_CACHE.set(rightCands[i], leftCands[i]);
      }
    }
  }
})();

/**
 * 声明式正则替换规则集（自动感知原字符串的大小写格式）
 */
interface SymmetryRule {
  pattern: RegExp;
  replacer: (match: string, ...groups: string[]) => string;
}

const SYMMETRY_RULES: SymmetryRule[] = [
  // 规则 1: 中日文 CJK 镜像 ('左' <-> '右')
  {
    pattern: /[左右]/g,
    replacer: (m) => (m === '左' ? '右' : '左'),
  },

  // 规则 2: 独立单词、词首或驼峰中的 Left <-> Right (保持大写/小写/全大写风格)
  // 支持: leftArm, LeftHand, blinkLeft, arm_left, LEFT_SHOULDER
  {
    pattern: /(^|[^a-zA-Z])(left|right)(?=[^a-zA-Z]|$)|([a-z])(Left|Right)(?=[A-Z\d_]|$)/g,
    replacer: (match, p1, word1, p2, word2) => {
      const prefix = p1 ?? p2 ?? '';
      const word = word1 ?? word2;
      const target = word.toLowerCase() === 'left' ? 'right' : 'left';

      let preserved: string;
      if (word === word.toUpperCase()) {
        preserved = target.toUpperCase(); // 全大写 LEFT -> RIGHT
      } else if (word[0] === word[0].toUpperCase()) {
        preserved = target.charAt(0).toUpperCase() + target.slice(1); // 首字母大写 Left -> Right
      } else {
        preserved = target.toLowerCase(); // 全小写 left -> right
      }

      return `${prefix}${preserved}`;
    },
  },

  // 规则 3: 分隔符单字母标签: 如 _L, .L, -L, _L_, .l. (保持大小写)
  {
    pattern: /([_.\-:])([lr])([_.\-:\d]|$)/gi,
    replacer: (_, sep, letter, suffix) => {
      const target = letter.toLowerCase() === 'l' ? 'r' : 'l';
      const preserved = letter === letter.toUpperCase() ? target.toUpperCase() : target.toLowerCase();
      return `${sep}${preserved}${suffix}`;
    },
  },
];

/**
 * 获取任意骨骼名或表情名镜像对侧名称
 */
export function getMirroredBoneName(name: string): string {
  // 1. 命中缓存或标准词库
  if (BONE_MIRROR_CACHE.has(name)) {
    return BONE_MIRROR_CACHE.get(name)!;
  }

  // 2. 声明式规则逐级解析
  let mirrored = name;
  for (const rule of SYMMETRY_RULES) {
    if (rule.pattern.test(mirrored)) {
      // 重置正则状态并执行替换
      rule.pattern.lastIndex = 0;
      mirrored = mirrored.replace(rule.pattern, rule.replacer);
      break;
    }
  }

  // 3. 记录缓存，后续调用直接 O(1)
  BONE_MIRROR_CACHE.set(name, mirrored);
  return mirrored;
}

/**
 * 镜像单帧 3D Landmark 骨骼点位并叠加空间位移偏移量
 */
function mirrorFrameLandmarks(
  lm: Record<string, [number, number, number]>,
  offset: [number, number, number] = [0, 0, 0]
): Record<string, [number, number, number]> {
  const mirrored: Record<string, [number, number, number]> = {};
  for (const k in lm) {
    const mirrorKey = getMirroredBoneName(k);
    const sourcePos = lm[mirrorKey] || lm[k];
    mirrored[k] = [
      Number((-sourcePos[0] + offset[0]).toFixed(4)),
      Number((sourcePos[1] + offset[1]).toFixed(4)),
      Number((sourcePos[2] + offset[2]).toFixed(4)),
    ];
  }
  return mirrored;
}

/**
 * 镜像单帧表情 Morph 权重 (例如 blinkLeft <-> blinkRight)
 */
function mirrorExpressions(expr?: Record<string, number>): Record<string, number> | undefined {
  if (!expr) return undefined;
  const mirrored: Record<string, number> = {};
  for (const k in expr) {
    const mirrorKey = getMirroredBoneName(k);
    mirrored[k] = expr[mirrorKey] !== undefined ? expr[mirrorKey] : expr[k];
  }
  return mirrored;
}

/**
 * 三次 Hermite 样条曲线插值 (保持动能与速度矢量 C1 连续)
 */
function cubicHermiteInterpolate(
  p0: [number, number, number],
  v0: [number, number, number],
  p1: [number, number, number],
  v1: [number, number, number],
  u: number,
  T: number
): [number, number, number] {
  const u2 = u * u;
  const u3 = u2 * u;

  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;

  const m0x = T * v0[0];
  const m0y = T * v0[1];
  const m0z = T * v0[2];

  const m1x = T * v1[0];
  const m1y = T * v1[1];
  const m1z = T * v1[2];

  return [
    Number((h00 * p0[0] + h10 * m0x + h01 * p1[0] + h11 * m1x).toFixed(4)),
    Number((h00 * p0[1] + h10 * m0y + h01 * p1[1] + h11 * m1y).toFixed(4)),
    Number((h00 * p0[2] + h10 * m0z + h01 * p1[2] + h11 * m1z).toFixed(4)),
  ];
}

export function applyLoopToLandmarkData(
  landmarkData: LandmarkData,
  options: LoopBlendOptions
): LandmarkData {
  if (!options.enabled || landmarkData.frames.length < 6) {
    return landmarkData;
  }

  const baseFrames = landmarkData.frames;
  const originalCount = baseFrames.length;
  const fps = landmarkData.fps || 30;
  const dt = 1 / fps;

  const insertCount = Math.max(4, Math.round(options.blendDuration * fps));
  const T = insertCount * dt;

  const fStart = baseFrames[0];
  const fStartNext = baseFrames[1];
  const fEnd = baseFrames[originalCount - 1];
  const fEndPrev = baseFrames[originalCount - 2];

  // 计算原动作末尾速度与开头速度
  const vEnd: Record<string, [number, number, number]> = {};
  const vStart: Record<string, [number, number, number]> = {};
  for (const k in fEnd.landmarks) {
    const pEnd = fEnd.landmarks[k];
    const pEndP = fEndPrev.landmarks[k] || pEnd;
    vEnd[k] = [
      (pEnd[0] - pEndP[0]) / dt,
      (pEnd[1] - pEndP[1]) / dt,
      (pEnd[2] - pEndP[2]) / dt,
    ];

    const pStart = fStart.landmarks[k] || pEnd;
    const pStartN = fStartNext.landmarks[k] || pStart;
    vStart[k] = [
      (pStartN[0] - pStart[0]) / dt,
      (pStartN[1] - pStart[1]) / dt,
      (pStartN[2] - pStart[2]) / dt,
    ];
  }

  // =========================================================================
  // Mode 4: Mirror 模式 —— 左右镜像对称完全补帧 (左手变右手、左腿变右腿，完整步态复制缝合)
  // =========================================================================
  if (options.mode === 'mirror') {
    const pStartHips = fStart.landmarks['hips'] || fStart.landmarks['腰'] || [0, 0, 0];
    const pEndHips = fEnd.landmarks['hips'] || fEnd.landmarks['腰'] || [0, 0, 0];

    const dx = pEndHips[0] - pStartHips[0];
    const dz = pEndHips[2] - pStartHips[2];

    // 计算镜像段空间基准偏移，使第二段无缝接在第一段结束位置上，并继续向前推进
    const mirrorOffset: [number, number, number] = options.blendHipsXZ
      ? [Number((pEndHips[0] + pStartHips[0]).toFixed(4)), 0, Number(dz.toFixed(4))]
      : [0, 0, 0];

    // 生成镜像半周期帧集合
    const mirroredFrames: LandmarkFrame[] = baseFrames.map((f) => ({
      time: 0,
      landmarks: mirrorFrameLandmarks(f.landmarks, mirrorOffset),
      expressions: mirrorExpressions(f.expressions),
    }));

    const resultFrames: LandmarkFrame[] = [];

    // 1. 压入前半段（原动作）
    for (const f of baseFrames) {
      resultFrames.push({
        time: 0,
        landmarks: { ...f.landmarks },
        expressions: f.expressions ? { ...f.expressions } : undefined,
      });
    }

    // 2. 接缝 A 插补：在【前半段末尾】与【镜像段开头】之间插入 Hermite 缝合过渡帧
    const seamAStart = resultFrames[resultFrames.length - 1];
    const seamAStartPrev = resultFrames[resultFrames.length - 2];
    const seamAEnd = mirroredFrames[0];
    const seamAEndNext = mirroredFrames[1];

    for (let step = 1; step <= insertCount; step++) {
      const u = step / (insertCount + 1);
      const interpLm: Record<string, [number, number, number]> = {};

      for (const k in seamAStart.landmarks) {
        const p0 = seamAStart.landmarks[k];
        const p0Prev = seamAStartPrev.landmarks[k] || p0;
        const v0: [number, number, number] = [(p0[0] - p0Prev[0]) / dt, (p0[1] - p0Prev[1]) / dt, (p0[2] - p0Prev[2]) / dt];

        const p1 = seamAEnd.landmarks[k] || p0;
        const p1Next = seamAEndNext.landmarks[k] || p1;
        const v1: [number, number, number] = [(p1Next[0] - p1[0]) / dt, (p1Next[1] - p1[1]) / dt, (p1Next[2] - p1[2]) / dt];

        interpLm[k] = cubicHermiteInterpolate(p0, v0, p1, v1, u, T);
      }

      resultFrames.push({
        time: 0,
        landmarks: interpLm,
        expressions: seamAStart.expressions,
      });
    }

    // 3. 压入后半段（镜像翻转动作）
    for (const f of mirroredFrames) {
      resultFrames.push({
        time: 0,
        landmarks: { ...f.landmarks },
        expressions: f.expressions ? { ...f.expressions } : undefined,
      });
    }

    // 4. 接缝 B 插补：在【镜像段末尾】与【下一循环首帧】之间插入 Hermite 缝合过渡帧
    const seamBStart = resultFrames[resultFrames.length - 1];
    const seamBStartPrev = resultFrames[resultFrames.length - 2];
    // 下一循环起始帧的位移推进偏移 (前移两倍 dz，横向回归)
    const nextLoopStrideOffset: [number, number, number] = options.blendHipsXZ
      ? [0, 0, Number((dz * 2).toFixed(4))]
      : [0, 0, 0];
    const seamBEndLm = mirrorFrameLandmarks(fStart.landmarks, [0, 0, 0]); // 回归起始姿态点位

    for (let step = 1; step <= insertCount; step++) {
      const u = step / (insertCount + 1);
      const interpLm: Record<string, [number, number, number]> = {};

      for (const k in seamBStart.landmarks) {
        const p0 = seamBStart.landmarks[k];
        const p0Prev = seamBStartPrev.landmarks[k] || p0;
        const v0: [number, number, number] = [(p0[0] - p0Prev[0]) / dt, (p0[1] - p0Prev[1]) / dt, (p0[2] - p0Prev[2]) / dt];

        const p1 = fStart.landmarks[k] || p0;
        const p1Target: [number, number, number] = [
          p1[0] + nextLoopStrideOffset[0],
          p1[1] + nextLoopStrideOffset[1],
          p1[2] + nextLoopStrideOffset[2],
        ];
        const p1Next = fStartNext.landmarks[k] || p1;
        const v1: [number, number, number] = [(p1Next[0] - p1[0]) / dt, (p1Next[1] - p1[1]) / dt, (p1Next[2] - p1[2]) / dt];

        interpLm[k] = cubicHermiteInterpolate(p0, v0, p1Target, v1, u, T);
      }

      resultFrames.push({
        time: 0,
        landmarks: interpLm,
        expressions: seamBStart.expressions,
      });
    }

    // 重置时间轴，递增计算每一个补帧的精确时间戳
    const totalFrames = resultFrames.length;
    for (let i = 0; i < totalFrames; i++) {
      resultFrames[i].time = Number((i * dt).toFixed(3));
    }
    const duration = totalFrames > 0 ? resultFrames[totalFrames - 1].time : 0;

    return {
      ...landmarkData,
      totalFrames,
      duration,
      frames: resultFrames,
    };
  }

  // =========================================================================
  // Mode 1: Idle 模式 —— 尾部 Hermite 动能连续性插帧
  // =========================================================================
  if (options.mode === 'idle') {
    const newFrames: LandmarkFrame[] = baseFrames.map((f) => ({
      time: f.time,
      landmarks: { ...f.landmarks },
      expressions: f.expressions ? { ...f.expressions } : undefined,
    }));
    const lastTime = newFrames[newFrames.length - 1].time;

    for (let step = 1; step <= insertCount; step++) {
      const currentTime = Number((lastTime + step * dt).toFixed(3));
      const u = step / insertCount;

      const interpolatedLm: Record<string, [number, number, number]> = {};
      for (const k in fEnd.landmarks) {
        const pEnd = fEnd.landmarks[k];
        const pStart = fStart.landmarks[k] || pEnd;
        const ve = vEnd[k] || [0, 0, 0];
        const vs = vStart[k] || [0, 0, 0];

        const pHermite = cubicHermiteInterpolate(pEnd, ve, pStart, vs, u, T);
        const isHipsOrRoot = k === 'hips' || k === 'root' || k === '腰' || k === 'センター' || k === '全親';
        if (isHipsOrRoot && !options.blendHipsXZ) {
          interpolatedLm[k] = [pEnd[0], pHermite[1], pEnd[2]];
        } else {
          interpolatedLm[k] = pHermite;
        }
      }

      let interpolatedExpr: Record<string, number> | undefined;
      if (fEnd.expressions || fStart.expressions) {
        interpolatedExpr = {};
        const allKeys = new Set([
          ...Object.keys(fEnd.expressions || {}),
          ...Object.keys(fStart.expressions || {}),
        ]);
        const w = u * u * (3 - 2 * u);
        allKeys.forEach((key) => {
          const vE = fEnd.expressions?.[key] ?? 0;
          const vS = fStart.expressions?.[key] ?? 0;
          interpolatedExpr![key] = Number((vE + (vS - vE) * w).toFixed(4));
        });
      }

      newFrames.push({
        time: currentTime,
        landmarks: interpolatedLm,
        ...(interpolatedExpr ? { expressions: interpolatedExpr } : {}),
      });
    }

    return {
      ...landmarkData,
      totalFrames: newFrames.length,
      duration: newFrames[newFrames.length - 1].time,
      frames: newFrames,
    };
  }

  // =========================================================================
  // Mode 2: Cyclic / Walk 模式 —— 循环动作步幅推进补帧
  // =========================================================================
  if (options.mode === 'cyclic') {
    const newFrames: LandmarkFrame[] = baseFrames.map((f) => ({
      time: f.time,
      landmarks: { ...f.landmarks },
      expressions: f.expressions ? { ...f.expressions } : undefined,
    }));
    const lastTime = newFrames[newFrames.length - 1].time;

    const pEndHips = fEnd.landmarks['hips'] || fEnd.landmarks['腰'] || [0, 0, 0];
    const pStartHips = fStart.landmarks['hips'] || fStart.landmarks['腰'] || [0, 0, 0];
    const dx = pEndHips[0] - pStartHips[0];
    const dz = pEndHips[2] - pStartHips[2];

    for (let step = 1; step <= insertCount; step++) {
      const currentTime = Number((lastTime + step * dt).toFixed(3));
      const u = step / insertCount;

      const interpolatedLm: Record<string, [number, number, number]> = {};
      for (const k in fEnd.landmarks) {
        const pEnd = fEnd.landmarks[k];
        const pStart = fStart.landmarks[k] || pEnd;
        const ve = vEnd[k] || [0, 0, 0];
        const vs = vStart[k] || [0, 0, 0];

        const pHermite = cubicHermiteInterpolate(pEnd, ve, pStart, vs, u, T);
        const offsetX = options.blendHipsXZ ? dx * u : 0;
        const offsetZ = options.blendHipsXZ ? dz * u : 0;

        interpolatedLm[k] = [
          Number((pHermite[0] + offsetX).toFixed(4)),
          pHermite[1],
          Number((pHermite[2] + offsetZ).toFixed(4)),
        ];
      }

      let interpolatedExpr: Record<string, number> | undefined;
      if (fEnd.expressions || fStart.expressions) {
        interpolatedExpr = {};
        const allKeys = new Set([
          ...Object.keys(fEnd.expressions || {}),
          ...Object.keys(fStart.expressions || {}),
        ]);
        const w = u * u * (3 - 2 * u);
        allKeys.forEach((key) => {
          const vE = fEnd.expressions?.[key] ?? 0;
          const vS = fStart.expressions?.[key] ?? 0;
          interpolatedExpr![key] = Number((vE + (vS - vE) * w).toFixed(4));
        });
      }

      newFrames.push({
        time: currentTime,
        landmarks: interpolatedLm,
        ...(interpolatedExpr ? { expressions: interpolatedExpr } : {}),
      });
    }

    return {
      ...landmarkData,
      totalFrames: newFrames.length,
      duration: newFrames[newFrames.length - 1].time,
      frames: newFrames,
    };
  }

  // =========================================================================
  // Mode 3: Tail 模式 —— 帧内 Crossfade
  // =========================================================================
  const newFrames: LandmarkFrame[] = baseFrames.map((f) => ({
    time: f.time,
    landmarks: { ...f.landmarks },
    expressions: f.expressions ? { ...f.expressions } : undefined,
  }));
  const blendFrames = Math.min(insertCount, Math.floor(originalCount * 0.4));
  const blendStartIdx = originalCount - blendFrames;

  for (let i = blendStartIdx; i < originalCount; i++) {
    const u = (i - blendStartIdx + 1) / blendFrames;
    const w = u * u * (3 - 2 * u);

    const frameLm = newFrames[i].landmarks;
    for (const k in frameLm) {
      const pCur = frameLm[k];
      const pStart = fStart.landmarks[k] || pCur;

      const isHipsOrRoot = k === 'hips' || k === 'root' || k === '腰' || k === 'センター' || k === '全親';
      if (isHipsOrRoot && !options.blendHipsXZ) {
        frameLm[k] = [pCur[0], Number((pCur[1] * (1 - w) + pStart[1] * w).toFixed(4)), pCur[2]];
      } else {
        frameLm[k] = [
          Number((pCur[0] * (1 - w) + pStart[0] * w).toFixed(4)),
          Number((pCur[1] * (1 - w) + pStart[1] * w).toFixed(4)),
          Number((pCur[2] * (1 - w) + pStart[2] * w).toFixed(4)),
        ];
      }
    }
  }

  return {
    ...landmarkData,
    totalFrames: newFrames.length,
    duration: newFrames[newFrames.length - 1].time,
    frames: newFrames,
  };
}
