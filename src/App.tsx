// src/App.tsx
import { useMemo, useRef, useState } from 'react';
import { ClipSection } from './components/ClipSection';
import { DownloadSection } from './components/DownloadSection';
import { DropZoneSection } from './components/DropZoneSection';
import { ThreeCanvas } from './components/ThreeCanvas';
import { useMmdPipeline } from './hooks/useMmdPipeline';
import { useThreeScene } from './hooks/useThreeScene';
import { detectInitialLanguage, I18N, Lang } from './i18n';

const DEFAULT_PMX_PATH = '/ganyu_by_原神/甘雨.pmx';
const DEFAULT_VMD_PATH = '/奶蛙上掌下拳.vmd';

export default function App() {
  const [lang, setLang] = useState<Lang>(detectInitialLanguage);
  const [customPmxFile, setCustomPmxFile] = useState<File | null>(null);
  const [vmdFile, setVmdFile] = useState<File | null>(null);

  const t = useMemo(() => I18N[lang], [lang]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const threeBridge = useThreeScene(canvasContainerRef);

  const {
    status,
    statusType,
    progress,
    processing,
    exportFormat,
    setExportFormat,
    downloads,
    loadMotion,
    exportMotion,
    downloadFile,
    maxFrames,
    fps,
    currentFrame,
    startFrame,
    setStartFrame,
    endFrame,
    setEndFrame,
    isPlaying,
    togglePlay,
    stopPlayback,
    seekToFrame,
    autoSnapLoopEnd,
  } = useMmdPipeline(threeBridge, lang);

  const activePmxTarget = customPmxFile || DEFAULT_PMX_PATH;
  const activeVmdTarget = vmdFile || DEFAULT_VMD_PATH;

  const switchLanguage = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const handleSelectPmx = (file: File | null) => {
    setCustomPmxFile(file);
    if (file || vmdFile) {
      loadMotion(file || DEFAULT_PMX_PATH, activeVmdTarget);
    }
  };

  const handleSelectVmd = (file: File) => {
    setVmdFile(file);
    loadMotion(activePmxTarget, file);
  };

  const handleResetPmx = () => {
    setCustomPmxFile(null);
    loadMotion(DEFAULT_PMX_PATH, activeVmdTarget);
  };

  return (
    // 单层优雅页面结构，彻底消除套娃卡片背景
    <div style={{ minHeight: '100vh', width: '100%', background: '#ffffff', padding: '24px 0', boxSizing: 'border-box', overflowY: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>

        {/* 页眉 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#111', fontSize: 20, fontWeight: 700 }}>{t.title}</h2>
          <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', padding: 3, borderRadius: 6 }}>
            <button
              onClick={() => switchLanguage('zh')}
              style={{
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                background: lang === 'zh' ? '#1677ff' : 'transparent',
                color: lang === 'zh' ? '#fff' : '#666',
                fontWeight: lang === 'zh' ? 600 : 400,
              }}
            >
              中文
            </button>
            <button
              onClick={() => switchLanguage('en')}
              style={{
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                background: lang === 'en' ? '#1677ff' : 'transparent',
                color: lang === 'en' ? '#fff' : '#666',
                fontWeight: lang === 'en' ? 600 : 400,
              }}
            >
              English
            </button>
          </div>
        </div>

        {/* 1. 3D Canvas 视口 */}
        <ThreeCanvas containerRef={canvasContainerRef} />

        {/* 2. Timeline 时间轴与剪辑组 (载入数据后展示) */}
        <ClipSection
          t={t}
          maxFrames={maxFrames}
          fps={fps}
          currentFrame={currentFrame}
          startFrame={startFrame}
          endFrame={endFrame}
          isPlaying={isPlaying}
          processing={processing}
          onTogglePlay={togglePlay}
          onSeek={(frame) => {
            stopPlayback();
            seekToFrame(frame);
          }}
          onStartFrameChange={(frame) => {
            stopPlayback();
            setStartFrame(frame);
            seekToFrame(frame);
          }}
          onEndFrameChange={(frame) => {
            stopPlayback();
            setEndFrame(frame);
            seekToFrame(frame);
          }}
          onAutoSnapLoopEnd={autoSnapLoopEnd}
        />

        {/* 3. 文件选区组件 */}
        <DropZoneSection
          t={t}
          customPmxFile={customPmxFile}
          vmdFile={vmdFile}
          processing={processing}
          onSelectPmx={handleSelectPmx}
          onSelectVmd={handleSelectVmd}
          onResetPmx={handleResetPmx}
        />

        {/* 4. 状态与导出下载组件 */}
        <DownloadSection
          t={t}
          status={status}
          statusType={statusType}
          progress={progress}
          processing={processing}
          maxFrames={maxFrames}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          downloads={downloads}
          onExport={() => exportMotion(activeVmdTarget)}
          onTestDefault={() => loadMotion(DEFAULT_PMX_PATH, DEFAULT_VMD_PATH)}
          onDownload={downloadFile}
        />

      </div>
    </div>
  );
}
