// src/i18n.ts
export type Lang = 'zh' | 'en';

const zh = {
  title: 'MMD 动作转 Humanoid / VRMA 动捕解算器',
  statusLabel: '当前状态：',
  baseModel: '基准绑定模型',
  defaultModelName: '默认模型 (甘雨.pmx)',
  changeModel: '选择 PMX 文件',
  selectFolder: '选择模型文件夹',
  customModel: '上传 PMX 文件',
  resetDefaultModel: '切回默认',
  pmxAlert: '拖拽的内容中未找到有效的 .pmx 模型文件！',
  pmxDropHint: '支持拖入 .pmx 文件或整个模型文件夹',
  vmdAlert: '请放入正确的 .vmd 动作文件！',
  vmdLoaded: (name: string) => `已载入动作: ${name}`,
  vmdPlaceholder: '点击选择 或 拖入待转换的 .vmd 动作文件',
  vmdHint: '拖入后点击下方按钮开始烘焙骨骼数据',
  // 烘焙控制主按钮
  startBakeBtn: '🚀 开始烘焙解算骨骼 (Start Bake)',
  reBakeBtn: '🔄 重新烘焙解算骨骼',
  bakingProgress: (p: number) => `正在烘焙解算骨骼 (${p}%)...`,
  testDefaultBtn: '载入默认演示 (甘雨 + 奶蛙拳)',
  // 下载按钮
  downloadVrma: '下载当前片段 VRMA (.vrma)',
  downloadGlb: '下载当前片段 GLB (.glb)',
  downloadBoth: '一键下载两者',
  exportingVrma: '正在导出 VRMA...',
  exportingGlb: '正在导出 GLB...',
  currentExportInfo: (start: number, end: number, count: number, sec: string) =>
    `当前导出范围: 第 ${start} ~ ${end} 帧 (共 ${count} 帧 / ${sec} 秒)`,
  // Timeline 控制器
  timelineTitle: '🎬 动作时间轴 & 循环剪辑',
  play: '▶ 播放预览',
  pause: '⏸ 暂停',
  autoTrimLoop: '✨ 一键对齐首尾循环',
  currentFrameLabel: '当前播放帧',
  startFrameLabel: '循环起点 (Start)',
  endFrameLabel: '循环终点 (End)',
  trimmedDurationLabel: (sec: string, frames: number) => `有效区间: ${sec} 秒 (${frames} 帧)`,
  // ⭐ 循环平滑后处理组件
  loopSectionTitle: '动作衔接与平滑循环 (Loop Transition)',
  loopSectionDesc: '消除首尾帧姿态不连贯导致的抽搐抖动',
  enableLoopBlend: '开启循环平滑',
  loopModeLabel: '平滑模式',
  loopModeIdle: '🌿 待机呼吸自然闭环 (推荐：防头部上抽/消除呼吸断层)',
  loopModeTail: '尾部柔和淡出 (普通动作首尾闭合)',
  loopModeCyclic: '全局误差均摊 (适合行走/跳舞周期动作)',
  loopDurationLabel: '衔接平滑时长',
  blendHipsXZLabel: '平滑骨盆水平位移 (保持原地动作呼吸稳定)',
  headStabilizerLabel: '🧠 头部与颈部防抽搐阻尼滤波 (消除待机回绕时抬头抽动)',
  // VRMA Metadata
  metadataTitle: '📝 VRMA 元数据配置 (Metadata)',
  metaTitle: '动作标题 (Title)',
  metaTitlePlaceholder: '输入动作名称',
  metaAuthors: '动作作者 (Authors)',
  metaAuthorsPlaceholder: '输入作者名，多个作者用英文逗号分隔',
  metaCopyright: '版权信息 (Copyright)',
  metaCopyrightPlaceholder: '输入版权归属信息 (选填)',
  metaLicense: '授权协议 (License URL)',
  metaLicensePlaceholder: '如 https://vrm.dev/licenses/1.0/',
  // 状态文案
  statusReady: '就绪：模型与动作已就位，请点击【开始烘焙解算】',
  statusAnalyzing: '正在解析动作并提取 3D 骨骼...',
  statusReadyToExport: '烘焙完成！可自由调整上方时间轴区间，随时点击下方下载',
  statusSolvingHumanoid: '正在导出文件...',
  statusError: (msg: string) => `解算失败: ${msg}`,
};

export type I18nTexts = typeof zh;

const en: I18nTexts = {
  title: 'MMD Motion to Humanoid / VRMA MoCap Solver',
  statusLabel: 'Status: ',
  baseModel: 'Reference Rig Model',
  defaultModelName: 'Default Model (Ganyu.pmx)',
  changeModel: 'Select PMX File',
  selectFolder: 'Select Model Folder',
  customModel: 'Upload PMX File',
  resetDefaultModel: 'Reset Default',
  pmxAlert: 'No valid .pmx model file found in the dropped content!',
  pmxDropHint: 'Supports dragging .pmx file or entire folder',
  vmdAlert: 'Please provide a valid .vmd motion file!',
  vmdLoaded: (name: string) => `Loaded Motion: ${name}`,
  vmdPlaceholder: 'Click or Drag & Drop .vmd file here',
  vmdHint: 'Drop file and click button below to bake bones',
  // Baking main button
  startBakeBtn: '🚀 Start Baking Motion',
  reBakeBtn: '🔄 Re-Bake Motion',
  bakingProgress: (p: number) => `Baking MMD bones (${p}%)...`,
  testDefaultBtn: 'Load Default Demo (Ganyu + Punch)',
  // Download Buttons
  downloadVrma: 'Download VRMA (.vrma)',
  downloadGlb: 'Download Humanoid (.glb)',
  downloadBoth: 'Download Both',
  exportingVrma: 'Exporting VRMA...',
  exportingGlb: 'Exporting GLB...',
  currentExportInfo: (start: number, end: number, count: number, sec: string) =>
    `Export Range: Frames ${start} ~ ${end} (${count} frames / ${sec}s)`,
  // Timeline
  timelineTitle: '🎬 Timeline & Loop Trimmer',
  play: '▶ Play',
  pause: '⏸ Pause',
  autoTrimLoop: '✨ Auto-Snap Loop',
  currentFrameLabel: 'Current Frame',
  startFrameLabel: 'Loop Start',
  endFrameLabel: 'Loop End',
  trimmedDurationLabel: (sec: string, frames: number) => `Range Duration: ${sec}s (${frames} frames)`,
  // ⭐ Loop Transition
  loopSectionTitle: 'Loop Smoothing & Transition',
  loopSectionDesc: 'Removes twitching caused by discontinuous start/end frames',
  enableLoopBlend: 'Enable Loop Blending',
  loopModeLabel: 'Blend Mode',
  loopModeIdle: '🌿 Idle Natural Breathing (Fixes head twitch / pops)',
  loopModeTail: 'Tail Soft Crossfade (For normal clips)',
  loopModeCyclic: 'Global Cyclic Distribution (For walk/dance loops)',
  loopDurationLabel: 'Transition Duration',
  blendHipsXZLabel: 'Smooth Pelvis Horizontal Drift (For in-place idle)',
  headStabilizerLabel: '🧠 Head & Neck Anti-Twitch Damper (Removes snap on loop)',
  // VRMA Metadata
  metadataTitle: '📝 VRMA Metadata Settings',
  metaTitle: 'Title',
  metaTitlePlaceholder: 'Motion Title',
  metaAuthors: 'Authors',
  metaAuthorsPlaceholder: 'Author names (comma separated)',
  metaCopyright: 'Copyright',
  metaCopyrightPlaceholder: 'Copyright notices (optional)',
  metaLicense: 'License URL',
  metaLicensePlaceholder: 'e.g. https://vrm.dev/licenses/1.0/',
  // 状态文案
  statusReady: 'Ready: Model & motion selected, click [Start Baking] below',
  statusAnalyzing: 'Analyzing & baking MMD keyframes...',
  statusReadyToExport: 'Bake complete! Trim range on timeline and click download directly',
  statusSolvingHumanoid: 'Exporting file...',
  statusError: (msg: string) => `Error: ${msg}`,
};

export const I18N: Record<Lang, I18nTexts> = {
  zh,
  en,
};

export const detectInitialLanguage = (): Lang => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('app_lang') as Lang | null;
    if (saved && (saved === 'zh' || saved === 'en')) return saved;

    const browserLang =
      window.navigator.language ||
      (window.navigator as unknown as { userLanguage?: string }).userLanguage ||
      '';
    return browserLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }
  return 'zh';
};
