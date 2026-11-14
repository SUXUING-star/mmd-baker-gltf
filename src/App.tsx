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
const DEFAULT_VMD_PATH = `${BASE}motion.vmd`;

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

  const isBaked = pipeline.statusType === 'ready_to_export' || pipeline.timeline.maxFrames > 0;

  const switchLanguage = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  return (
    <div className="mmd-page">
      <style>{`
        .mmd-page {
          min-height: 100vh;
          width: 100%;
          background: #ffffff;
          padding: 16px 0;
          box-sizing: border-box;
          overflow-y: auto;
          color: #1f2937;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .mmd-shell {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 16px;
          box-sizing: border-box;
        }

        /* 手机端默认纵向单列 */
        .mmd-workspace {
          display: flex;
          flex-direction: column;
        }

        .mmd-col-left,
        .mmd-col-center,
        .mmd-col-right {
          display: contents;
        }

        .mmd-slot-canvas { order: 1; }
        .mmd-slot-clip { order: 2; }
        .mmd-slot-loop { order: 3; }
        .mmd-slot-dropzone { order: 4; }
        .mmd-slot-meta { order: 5; }
        .mmd-slot-download { order: 6; }

        .mmd-dropzone-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        /* 电脑端 (>= 1024px) 三栏布局 */
        @media (min-width: 1024px) {
          .mmd-shell {
            max-width: 1600px;
            padding: 0 20px;
          }

          .mmd-workspace {
            display: grid;
            grid-template-columns: 220px minmax(0, 1fr) 300px;
            gap: 16px;
            align-items: start;
          }

          .mmd-col-left,
          .mmd-col-center,
          .mmd-col-right {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .mmd-slot-canvas,
          .mmd-slot-clip,
          .mmd-slot-loop,
          .mmd-slot-dropzone,
          .mmd-slot-meta,
          .mmd-slot-download {
            order: initial;
          }

          .mmd-dropzone-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      `}</style>

      <div className="mmd-shell">
        {/* 顶部标题与语言切换 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, color: '#111827', fontSize: 18, fontWeight: 700 }}>{t.title}</h2>
          <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', padding: 2, borderRadius: 4 }}>
            {(['zh', 'en', 'ja'] as const).map((l) => (
              <button
                key={l}
                onClick={() => switchLanguage(l)}
                style={{
                  border: 'none',
                  borderRadius: 3,
                  padding: '3px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: lang === l ? '#1677ff' : 'transparent',
                  color: lang === l ? '#ffffff' : '#4b5563',
                  fontWeight: lang === l ? 600 : 400,
                }}
              >
                {l === 'zh' ? '中文' : l === 'en' ? 'English' : '日本語'}
              </button>
            ))}
          </div>
        </div>

        {/* 响应式三栏工作区 */}
        <div className="mmd-workspace">
          {/* 左栏：模型与动作/镜头导入 */}
          <div className="mmd-col-left">
            <div className="mmd-slot-dropzone">
              <DropZoneSection t={t} pipeline={pipeline} />
            </div>
          </div>

          {/* 中间栏：3D 视口与拖动进度条/表情轨 */}
          <div className="mmd-col-center">
            <div className="mmd-slot-canvas">
              <ThreeCanvas
                t={t}
                containerRef={canvasContainerRef}
                viewMode={threeBridge.viewMode}
                onToggleViewMode={threeBridge.setViewMode}
                isCameraMode={pipeline.bakeTargetType === 'camera'}
              />
            </div>

            <div className="mmd-slot-clip">
              <ClipSection
                t={t}
                timeline={pipeline.timeline}
                exprState={exprState}
                availableMorphs={pipeline.availableMorphs}
                vmdExpressionTracks={pipeline.vmdExpressionTracks}
                getFrameVmdExpressions={pipeline.getFrameVmdExpressions}
                disabled={pipeline.processing}
              />
            </div>
          </div>

          {/* 右栏：元数据 + 烘焙导出 */}
          <div className="mmd-col-right">
            {pipeline.bakeTargetType === 'motion' && (
              <div className="mmd-slot-loop">
                <LoopTransitionSection
                  t={t}
                  loopState={loopState}
                  disabled={pipeline.processing}
                  isBaked={isBaked}
                  onApply={(opts) => pipeline.applyLoopAndRefresh(opts)}
                />
              </div>
            )}

            <div className="mmd-slot-meta">
              <MetadataSection t={t} meta={meta} disabled={pipeline.processing} />
            </div>

            <div className="mmd-slot-download">
              <DownloadSection t={t} pipeline={pipeline} meta={meta} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
