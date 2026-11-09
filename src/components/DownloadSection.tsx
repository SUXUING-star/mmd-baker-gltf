// src/components/DownloadSection.tsx
import React from 'react';
import { MmdPipeline } from '../hooks/useMmdPipeline';
import { VrmaMetadataState } from '../hooks/useVrmaMetadata';

interface DownloadSectionProps {
  t: any;
  pipeline: MmdPipeline;
  meta: VrmaMetadataState;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({ t, pipeline, meta }) => {
  const {
    status,
    statusType,
    progress,
    processing,
    exportingType,
    timeline,
    startBake,
    loadDefaultDemo,
    downloadVrma,
    downloadGlb,
    downloadBoth,
  } = pipeline;
  const { maxFrames, startFrame, endFrame, fps } = timeline;

  const isBaked = maxFrames > 0;
  const frameCount = isBaked ? endFrame - startFrame + 1 : 0;
  const durationSec = isBaked ? (frameCount / fps).toFixed(2) : '0';

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, background: '#fafafa' }}>
      {/* 1. 状态与提示 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#333' }}>
          <strong>{t.statusLabel}</strong>
          <span
            style={{
              marginLeft: 6,
              fontWeight: 600,
              color: statusType === 'error' ? '#ff4d4f' : processing ? '#fa8c16' : '#1677ff',
            }}
          >
            {processing && progress > 0 ? t.bakingProgress(progress) : status}
          </span>
        </div>

        {!processing && (
          <button
            onClick={loadDefaultDemo}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: '#ffffff',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#555',
            }}
          >
            {t.testDefaultBtn}
          </button>
        )}
      </div>

      {/* 2. 核心主按钮：开始烘焙 / 重新烘焙 */}
      <div style={{ marginBottom: isBaked ? 16 : 0 }}>
        <button
          onClick={startBake}
          disabled={processing}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: isBaked ? '#fa8c16' : '#1677ff',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 700,
            cursor: processing ? 'not-allowed' : 'pointer',
            opacity: processing ? 0.7 : 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'background 0.2s',
          }}
        >
          {processing
            ? t.bakingProgress(progress)
            : isBaked
              ? t.reBakeBtn
              : t.startBakeBtn}
        </button>
      </div>

      {/* 3. 烘焙完成后展示的下载区域 */}
      {isBaked && (
        <div style={{ borderTop: '1px dashed #d9d9d9', paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontWeight: 500 }}>
            {t.currentExportInfo(startFrame, endFrame, frameCount, durationSec)}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => downloadVrma(meta.getVrmaMetaOptions())}
              disabled={!!exportingType || processing}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '10px 16px',
                background: '#1677ff',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: exportingType || processing ? 'not-allowed' : 'pointer',
                opacity: exportingType || processing ? 0.6 : 1,
              }}
            >
              {exportingType === 'vrma' ? t.exportingVrma : t.downloadVrma}
            </button>

            <button
              onClick={() => downloadGlb()}
              disabled={!!exportingType || processing}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '10px 16px',
                background: '#52c41a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: exportingType || processing ? 'not-allowed' : 'pointer',
                opacity: exportingType || processing ? 0.6 : 1,
              }}
            >
              {exportingType === 'glb' ? t.exportingGlb : t.downloadGlb}
            </button>

            <button
              onClick={() => downloadBoth(meta.getVrmaMetaOptions())}
              disabled={!!exportingType || processing}
              style={{
                padding: '10px 16px',
                background: '#722ed1',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: exportingType || processing ? 'not-allowed' : 'pointer',
                opacity: exportingType || processing ? 0.6 : 1,
              }}
            >
              {t.downloadBoth}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
