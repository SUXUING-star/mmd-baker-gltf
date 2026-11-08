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
    changeModel: '更换模型',
    customModel: '自定义 PMX',
    resetDefaultModel: '切回默认',
    vmdAlert: '请放入正确的 .vmd 动作文件！',
    vmdLoaded: (name: string) => `已载入动作: ${name}`,
    vmdPlaceholder: '点击选择 或 拖入待转换的 .vmd 动作文件',
    vmdHint: '拖入后自动解析并可在下侧时间轴预览/剪辑',
    startConvert: '导出所选区间动画 (GLB / VRMA)',
    bakingProgress: (p: number) => `正在烘焙解算 (${p}%)...`,
    testDefaultBtn: '载入默认动作 (奶蛙上掌下拳)',
    convertComplete: '✓ 转换完成，请选择下载格式：',
    downloadVrma: '下载 VRMA 动作 (.vrma)',
    downloadGlb: '下载 Humanoid GLB',
    // Timeline 控制器
    timelineTitle: '🎬 动作时间轴 & 循环剪辑',
    play: '▶ 播放预览',
    pause: '⏸ 暂停',
    autoTrimLoop: '✨ 一键对齐首尾循环',
    currentFrameLabel: '当前播放帧',
    startFrameLabel: '循环起点 (Start)',
    endFrameLabel: '循环终点 (End)',
    trimmedDurationLabel: (sec: string, frames: number) => `有效导出片段: ${sec} 秒 (${frames} 帧)`,
    // 状态文案
    statusReady: '就绪：请放入 VMD 动作文件',
    statusAnalyzing: '正在解析动作骨骼坐标...',
    statusReadyToExport: '动作已载入！可自由预览/剪辑区间，准备就绪后点击导出',
    statusSolvingHumanoid: '正在解算 Humanoid 骨骼并打包文件...',
    statusComplete: '解算完成！已生成对应模型与动画，可直接下载',
    statusError: (msg: string) => `错误: ${msg}`,
  },
  en: {
    title: 'MMD Motion to Humanoid / VRMA MoCap Solver',
    statusLabel: 'Status: ',
    exportFormatLabel: 'Export Format: ',
    formatBoth: 'VRMA + GLB (Both)',
    formatVrma: 'VRM Animation (.vrma)',
    formatGlb: 'Humanoid Model (.glb)',
    baseModel: 'Reference Rig Model',
    defaultModelName: 'Default Model (Ganyu.pmx)',
    changeModel: 'Change Model',
    customModel: 'Upload Custom Model',
    resetDefaultModel: 'Reset Default',
    vmdAlert: 'Please provide a valid .vmd motion file!',
    vmdLoaded: (name: string) => `Loaded Motion: ${name}`,
    vmdPlaceholder: 'Click or Drag & Drop .vmd file here',
    vmdHint: 'Auto loads into timeline for live preview & loop trimming',
    startConvert: 'Export Selected Range (GLB / VRMA)',
    bakingProgress: (p: number) => `Baking & Solving (${p}%)...`,
    testDefaultBtn: 'Load Default Motion',
    convertComplete: '✓ Conversion completed! Choose download format:',
    downloadVrma: 'Download VRMA (.vrma)',
    downloadGlb: 'Download Humanoid GLB',
    // Timeline
    timelineTitle: '🎬 Timeline & Loop Trimmer',
    play: '▶ Play',
    pause: '⏸ Pause',
    autoTrimLoop: '✨ Auto-Snap Seamless Loop',
    currentFrameLabel: 'Current Frame',
    startFrameLabel: 'Loop Start',
    endFrameLabel: 'Loop End',
    trimmedDurationLabel: (sec: string, frames: number) => `Export Duration: ${sec}s (${frames} frames)`,
    // 状态文案
    statusReady: 'Ready: Load a .vmd motion file',
    statusAnalyzing: 'Analyzing MMD motion bone keyframes...',
    statusReadyToExport: 'Motion loaded! Preview, adjust range, and click export anytime',
    statusSolvingHumanoid: 'Solving skeleton & generating output files...',
    statusComplete: 'Complete! Output ready for download.',
    statusError: (msg: string) => `Error: ${msg}`,
  },
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
