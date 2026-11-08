// src/i18n.ts
export type Lang = 'zh' | 'en';

export const I18N = {
  zh: {
    title: 'MMD 动作转 Humanoid / VRMA 动捕解算器',
    statusLabel: '解算状态：',
    exportFormatLabel: '导出格式选择：',
    formatBoth: '同时生成 VRMA + GLB',
    formatVrma: 'VRM 动画 (.vrma)',
    formatGlb: 'Humanoid 模型 (.glb)',
    baseModel: '基准绑定模型',
    defaultModelName: '默认模型 (甘雨.pmx)',
    changeModel: '更换其他模型',
    customModel: '更换自定义模型',
    resetDefaultModel: '切回默认模型',
    vmdAlert: '请放入正确的 .vmd 动作文件！',
    vmdLoaded: (name: string) => `已载入动作: ${name}`,
    vmdPlaceholder: '点击选择 或 拖入待转换的 .vmd 动作文件',
    vmdHint: '基于当前模型计算 3D 关节点并导出',
    startConvert: '开始转换此动作',
    bakingProgress: (p: number) => `正在烘焙解算 (${p}%)...`,
    testDefaultBtn: '测试默认动作 (奶蛙上掌下拳)',
    convertComplete: '✓ 转换完成，请选择下载格式：',
    downloadVrma: '下载 VRMA 动作 (.vrma)',
    downloadGlb: '下载 Humanoid GLB',
    // 状态文案
    statusReady: '就绪：可放入动作文件或直接测试默认动作',
    statusBakingLandmarks: '1/2 抓取 MMD 动作 3D 世界坐标...',
    statusSolvingHumanoid: '2/2 求解骨骼并导出动画数据...',
    statusComplete: '解算完成！动画已在视口播放，可直接下载对应文件。',
    statusError: (msg: string) => `错误: ${msg}`,
  },
  en: {
    title: 'MMD Motion to Humanoid / VRMA MoCap Solver',
    statusLabel: 'Solver Status: ',
    exportFormatLabel: 'Export Format: ',
    formatBoth: 'VRMA + GLB (Both)',
    formatVrma: 'VRM Animation (.vrma)',
    formatGlb: 'Humanoid Model (.glb)',
    baseModel: 'Reference Rig Model',
    defaultModelName: 'Default Model (Ganyu.pmx)',
    changeModel: 'Change Model',
    customModel: 'Upload Custom Model',
    resetDefaultModel: 'Reset to Default',
    vmdAlert: 'Please provide a valid .vmd motion file!',
    vmdLoaded: (name: string) => `Loaded Motion: ${name}`,
    vmdPlaceholder: 'Click to select or drag & drop .vmd motion file here',
    vmdHint: 'Calculates 3D joint transforms based on reference model',
    startConvert: 'Convert Motion',
    bakingProgress: (p: number) => `Baking & Solving (${p}%)...`,
    testDefaultBtn: 'Test Default Motion',
    convertComplete: '✓ Conversion completed! Choose download format:',
    downloadVrma: 'Download VRMA (.vrma)',
    downloadGlb: 'Download Humanoid GLB',
    // 状态文案
    statusReady: 'Ready: Drop a motion file or test default motion',
    statusBakingLandmarks: '1/2 Extracting MMD motion 3D world coordinates...',
    statusSolvingHumanoid: '2/2 Solving skeleton & exporting animation data...',
    statusComplete: 'Complete! Motion playing in viewport, ready to download.',
    statusError: (msg: string) => `Error: ${msg}`,
  },
};

/**
 * 自动检测浏览器语言并读取本地缓存
 */
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
