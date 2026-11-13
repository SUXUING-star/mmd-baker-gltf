// src/App.tsx
import { useMemo, useRef, useState } from 'react';
import { ClipSection } from './components/ClipSection';
import { DownloadSection } from './components/DownloadSection';
import { DropZoneSection } from './components/DropZoneSection';
import { LoopTransitionSection } from './components/LoopTransitionSection';
import { MetadataSection } from './components/MetadataSection';
import { ThreeCanvas } from './components/ThreeCanvas';
import { useExpressionTracks } from './hooks/useExpressionTracks';
import { useLoopOptions } from './hooks/useLoopOptions';
import { useMmdPipeline } from './hooks/useMmdPipeline';
import { useThreeScene } from './hooks/useThreeScene';
import { useVrmaMetadata } from './hooks/useVrmaMetadata';
import { detectInitialLanguage, I18N, Lang } from './i18n';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

const DEFAULT_PMX_PATH = `${BASE}ganyu_by_原神/甘雨.pmx`;
const DEFAULT_VMD_PATH = `${BASE}奶蛙上掌下拳.vmd`;

export default function App() {
  const [lang, setLang] = useState<Lang>(detectInitialLanguage);
  const t = useMemo(() => I18N[lang], [lang]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const threeBridge = useThreeScene(canvasContainerRef);

  const loopState = useLoopOptions();
  const exprState = useExpressionTracks();
  const pipeline = useMmdPipeline(
    threeBridge,
    DEFAULT_PMX_PATH,
    DEFAULT_VMD_PATH,
    lang,
    loopState.loopOptions,
    exprState.tracks
  );
  const meta = useVrmaMetadata();

  const isBaked = pipeline.timeline.maxFrames > 0;

  const switchLanguage = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#ffffff', padding: '24px 0', boxSizing: 'border-box', overflowY: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>

        {/* 顶部标题与语言切换 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#111', fontSize: 20, fontWeight: 700 }}>{t.title}</h2>
          <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', padding: 3, borderRadius: 6 }}>
            {(['zh', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => switchLanguage(l)}
                style={{
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: lang === l ? '#1677ff' : 'transparent',
                  color: lang === l ? '#fff' : '#666',
                  fontWeight: lang === l ? 600 : 400,
                }}
              >
                {l === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* 1. 3D 预览视口 */}
        <ThreeCanvas containerRef={canvasContainerRef} />

        {/* 2. 统一 PR 时间轴与表情编辑器 */}
        <ClipSection
          t={t}
          timeline={pipeline.timeline}
          exprState={exprState}
          availableMorphs={pipeline.availableMorphs}
          vmdExpressionTracks={pipeline.vmdExpressionTracks}
          getFrameVmdExpressions={pipeline.getFrameVmdExpressions}
          disabled={pipeline.processing}
        />

        {/* 3. 动作循环衔接面板 */}
        <LoopTransitionSection
          t={t}
          loopState={loopState}
          disabled={pipeline.processing}
          isBaked={isBaked}
          onApply={(opts) => pipeline.applyLoopAndRefresh(opts)}
        />



        {/* 5. 模型与动作文件投递区 */}
        <DropZoneSection t={t} pipeline={pipeline} />

        {/* 6. VRMA Metadata 表单 */}
        <MetadataSection t={t} meta={meta} disabled={pipeline.processing} />

        {/* 7. 核心烘焙控制与下载面板 */}
        <DownloadSection t={t} pipeline={pipeline} meta={meta} />

      </div>
    </div>
  );
}
