// src/components/DownloadSection.tsx
import React from 'react';
import { MmdPipeline } from '../hooks/useMmdPipeline';
import { VrmaMetadataState } from '../hooks/useVrmaMetadata';
import { I18nTexts } from '../i18n';

interface DownloadSectionProps {
  t: I18nTexts;
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
  const isExporting = exportingType !== null;
  const isBusy = processing || isExporting;

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* 1. 顶部状态栏与测试 Demo 快捷按钮 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 13, color: '#334155' }}>
          <strong style={{ color: '#0f172a' }}>{t.statusLabel}</strong>
          <span
            style={{
              marginLeft: 6,
              fontWeight: 600,
              color:
                statusType === 'error'
                  ? '#ef4444'
                  : processing
                    ? '#f59e0b'
                    : isBaked
                      ? '#10b981'
                      : '#2563eb',
            }}
          >
            {processing && progress > 0 ? t.bakingProgress(progress) : status}
          </span>
        </div>

        {!isBusy && (
          <button
            type="button"
            onClick={loadDefaultDemo}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#475569',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            {t.testDefaultBtn}
          </button>
        )}
      </div>

      {/* 2. 核心烘焙按钮：开始烘焙 / 重新烘焙 */}
      <div style={{ marginBottom: isBaked ? 16 : 0 }}>
        <button
          type="button"
          onClick={startBake}
          disabled={isBusy}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: isBaked ? '#d97706' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 700,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.6 : 1,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
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

      {/* 3. 烘焙完成后展现的下载区 */}
      {isBaked && (
        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 14 }}>
          {/* 当前导出区间信息 */}
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, fontWeight: 500 }}>
            {t.currentExportInfo(startFrame, endFrame, frameCount, durationSec)}
          </div>

          {/* 下载操作按钮组 */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* 下载 VRMA */}
            <button
              type="button"
              onClick={() => downloadVrma(meta.getVrmaMetaOptions())}
              disabled={isBusy}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '10px 16px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {exportingType === 'vrma' ? t.exportingVrma : t.downloadVrma}
            </button>

            {/* 下载 GLB */}
            <button
              type="button"
              onClick={() => downloadGlb()}
              disabled={isBusy}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '10px 16px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {exportingType === 'glb' ? t.exportingGlb : t.downloadGlb}
            </button>

            {/* 一键下载两者 */}
            <button
              type="button"
              onClick={() => downloadBoth(meta.getVrmaMetaOptions())}
              disabled={isBusy}
              style={{
                padding: '10px 18px',
                background: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
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
