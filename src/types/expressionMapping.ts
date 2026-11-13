// src/types/expressionMapping.ts

/**
 * VRM 1.0 Animation (VRMC_vrm_animation) 允许动画化的预设表情清单
 * 注意：lookUp / lookDown / lookLeft / lookRight 按规范属于 LookAt，禁止放在 expressions.preset 中
 */
export const VRM_PRESET_EXPRESSIONS = [
  'happy',
  'angry',
  'sad',
  'relaxed',
  'surprised',
  'aa',
  'ih',
  'ou',
  'ee',
  'oh',
  'blink',
  'blinkLeft',
  'blinkRight',
  'neutral',
] as const;

export type VrmPresetExpressionName = (typeof VRM_PRESET_EXPRESSIONS)[number];

const PRESET_SET = new Set<string>(VRM_PRESET_EXPRESSIONS);
const FORBIDDEN_CUSTOM_NAMES = new Set<string>([
  ...VRM_PRESET_EXPRESSIONS,
  'lookUp',
  'lookDown',
  'lookLeft',
  'lookRight',
]);

/** MMD / 通用 BlendShape -> VRM 1.0 预设表情映射词库 */
export const EXPRESSION_CANDIDATE_MAP: Record<VrmPresetExpressionName, string[]> = {
  // 口型 (Lip Sync)
  aa: ['あ', 'あ２', 'あ2', 'ぁ', 'a', 'aa', 'mouth_a', 'vrc.v_aa'],
  ih: ['い', 'ぃ', 'i', 'ih', 'mouth_i', 'vrc.v_ih'],
  ou: ['う', 'ぅ', 'u', 'ou', 'mouth_u', 'vrc.v_ou'],
  ee: ['え', 'ぇ', 'e', 'ee', 'mouth_e', 'vrc.v_ee'],
  oh: ['お', 'ぉ', 'o', 'oh', 'mouth_o', 'vrc.v_oh'],

  // 眨眼 (Blink)
  blink: ['まばたき', 'まばたき2', 'まばたき２', '瞬き', '目閉じ', 'blink', 'eye_close'],
  blinkLeft: ['ウィンク', 'ウィンク２', 'ウィンク2', 'ｳｨﾝｸ', 'ｳｨﾝｸ２', 'ウィンク左', '左ウィンク', '左まばたき', 'blinkleft', 'blink_l', 'wink_l'],
  blinkRight: ['ウィンク右', 'ｳｨﾝｸ右', 'ウィンク２右', 'ウィンク2右', '右ウィンク', '右まばたき', 'blinkright', 'blink_r', 'wink_r'],

  // 情绪 (Emotions)
  happy: ['笑い', 'にこり', 'にっこり', '笑顔', '喜び', 'happy', 'joy', 'smile'],
  angry: ['怒り', '怒る', '怒', 'angry'],
  sad: ['悲しい', '悲しみ', '困る', '哀', 'sad', 'sorrow'],
  relaxed: ['なごみ', '落ち着き', '安らぎ', 'relaxed', 'fun'],
  surprised: ['びっくり', '驚き', '驚', 'surprised', 'shock'],
  neutral: ['通常', '真顔', 'neutral'],
};

function normalizeMorphName(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s\.\-]/g, '');
}

const EXACT_TO_PRESET = new Map<string, VrmPresetExpressionName>();
const NORM_TO_PRESET = new Map<string, VrmPresetExpressionName>();

(Object.keys(EXPRESSION_CANDIDATE_MAP) as VrmPresetExpressionName[]).forEach((preset) => {
  EXPRESSION_CANDIDATE_MAP[preset].forEach((alias) => {
    if (!EXACT_TO_PRESET.has(alias)) {
      EXACT_TO_PRESET.set(alias, preset);
    }
    const norm = normalizeMorphName(alias);
    if (!NORM_TO_PRESET.has(norm)) {
      NORM_TO_PRESET.set(norm, preset);
    }
  });
});

export function isPresetExpression(name: string): name is VrmPresetExpressionName {
  return PRESET_SET.has(name);
}

/**
 * 将 MMD Morph 名解析为 VRMA 表情目标
 */
export function resolveExpressionTarget(rawMorphName: string): { key: string; isPreset: boolean } {
  const trimmed = rawMorphName.trim();

  if (EXACT_TO_PRESET.has(trimmed)) {
    return { key: EXACT_TO_PRESET.get(trimmed)!, isPreset: true };
  }

  const norm = normalizeMorphName(trimmed);
  if (NORM_TO_PRESET.has(norm)) {
    return { key: NORM_TO_PRESET.get(norm)!, isPreset: true };
  }

  // 自定义表情按规范不能与预设表情或 LookAt 关键字重名
  const safeCustomKey = FORBIDDEN_CUSTOM_NAMES.has(trimmed) ? `mmd_${trimmed}` : trimmed;
  return { key: safeCustomKey, isPreset: false };
}
