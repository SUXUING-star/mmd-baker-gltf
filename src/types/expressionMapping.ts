// src/types/expressionMapping.ts

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

/** MMD / 通用 BlendShape -> VRM 1.0 标准 14 预设映射词库 */
export const EXPRESSION_CANDIDATE_MAP: Record<VrmPresetExpressionName, string[]> = {
  // 口型 (Lip Sync)
  aa: [
    'あ', 'あ2', 'ぁ', 'ワ', 'わ', '口開け', '口開き', '大口', '開口',
    'a', 'aa', 'mouth_a', 'vrc.v_aa',
  ],
  ih: [
    'い', 'ぃ', 'い1', 'い2', 'い3',
    'i', 'ih', 'mouth_i', 'vrc.v_ih',
  ],
  ou: [
    'う', 'ぅ', 'う2', 'ん', 'ン', 'む', '口すぼめ', '口横狭め', 'ω',
    'u', 'ou', 'mouth_u', 'vrc.v_ou',
  ],
  ee: [
    'え', 'ぇ', 'え2', 'にっ',
    'e', 'ee', 'mouth_e', 'vrc.v_ee',
  ],
  oh: [
    'お', 'ぉ', 'お2', 'へ', 'ぺろっ', 'てへぺろ', '舌広げ',
    'o', 'oh', 'mouth_o', 'vrc.v_oh',
  ],

  // 眨眼 (Blink)
  blink: [
    'まばたき', 'まばたき2', '瞬き', '目閉じ', '両目閉じ', '笑い目', 'ぎゅっ',
    'blink', 'eye_close',
  ],
  blinkLeft: [
    'ウィンク', 'ウィンク2', 'ｳｨﾝｸ', 'ｳｨﾝｸ2', 'ウィンク左', '左ウィンク', '左まばたき',
    'blinkleft', 'blink_l', 'wink_l',
  ],
  blinkRight: [
    'ウィンク右', 'ｳｨﾝｸ右', 'ウィンク2右', '右ウィンク', '右まばたき',
    'blinkright', 'blink_r', 'wink_r',
  ],

  // 情绪 (Emotions)
  happy: [
    '笑い', 'にこり', 'にこり左', 'にこり右', 'にっこり', 'にやり', 'にやり2', 'にやり3',
    '笑顔', '喜び', '口角上げ', '口横広げ', 'happy', 'joy', 'smile', 'grin',
  ],
  angry: [
    '怒り', '怒り目', '怒り左', '怒り右', '怒る', '怒', '眼角上', 'きりっ',
    'angry',
  ],
  sad: [
    '悲しい', '悲しみ', '困る', '困る左', '困る右', '哀', '涙', 'しょんぼり', '眼角下',
    'sad', 'sorrow',
  ],
  relaxed: [
    'なごみ', 'なごみ左', 'なごみ右', 'じと目', 'ジト目', '落ち着き', '安らぎ', '照れ', '下眼上',
    'relaxed', 'fun',
  ],
  surprised: [
    'びっくり', '驚き', '驚', '見開き', '星目', 'はぅ',
    'surprised', 'shock',
  ],
  neutral: [
    '通常', '真顔', '真面目', '真面目左', '真面目右',
    'neutral',
  ],
};

function normalizeMorphName(name: string): string {
  return name
    .trim()
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[_\s.\-]/g, '');
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

  const safeCustomKey = FORBIDDEN_CUSTOM_NAMES.has(trimmed) ? `mmd_${trimmed}` : trimmed;
  return { key: safeCustomKey, isPreset: false };
}
