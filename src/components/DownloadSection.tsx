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
    bakeTargetType,
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
  const isBaked = statusType === 'ready_to_export' || maxFrames > 0;
  const frameCount = isBaked ? Math.max(1, endFrame - startFrame + 1) : 0;
  const durationSec = isBaked ? (frameCount / fps).toFixed(2) : '0';
  const isExporting = exportingType !== null;
  const isBusy = processing || isExporting;

  return (
    <div style={{ paddingTop: 4, marginBottom: 16 }}>
      {/* 状态与演示按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#374151' }}>
          <strong>{t.statusLabel}</strong>
          <span
            style={{
              marginLeft: 4,
              fontWeight: 600,
              color: statusType === 'error' ? '#dc2626' : processing ? '#d97706' : isBaked ? '#1677ff' : '#4b5563',
            }}
          >
            {processing && progress > 0
              ? bakeTargetType === 'motion'
                ? t.bakingProgress(progress)
                : t.bakingCameraProgress(progress)
              : status}
          </span>
        </div>

        {!isBusy && (
          <button
            type="button"
            onClick={loadDefaultDemo}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              background: 'transparent',
              border: '1px solid #d9d9d9',
              borderRadius: 2,
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            {t.testDefaultBtn}
          </button>
        )}
      </div>

      {/* 烘焙控制按钮 */}
      <div style={{ marginBottom: isBaked ? 10 : 0 }}>
        <button
          type="button"
          onClick={startBake}
          disabled={isBusy}
          style={{
            width: '100%',
            padding: '9px 12px',
            background: '#1677ff',
            color: '#ffffff',
            border: 'none',
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.6 : 1,
          }}
        >
          {processing
            ? bakeTargetType === 'motion'
              ? t.bakingProgress(progress)
              : t.bakingCameraProgress(progress)
            : isBaked
            ? bakeTargetType === 'motion'
              ? t.reBakeBtn
              : t.reBakeCameraBtn
            : bakeTargetType === 'motion'
            ? t.startBakeBtn
            : t.startBakeCameraBtn}
        </button>
      </div>

      {/* 导出区域 */}
      {isBaked && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
            {t.currentExportInfo(startFrame, endFrame, frameCount, durationSec)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => downloadVrma(meta.getVrmaMetaOptions())}
                disabled={isBusy}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: 'transparent',
                  color: '#1677ff',
                  border: '1px solid #1677ff',
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                {exportingType === 'vrma'
                  ? t.exportingVrma
                  : bakeTargetType === 'camera'
                  ? t.downloadCameraVrma
                  : t.downloadVrma}
              </button>

              <button
                type="button"
                onClick={() => downloadGlb()}
                disabled={isBusy}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: 'transparent',
                  color: '#374151',
                  border: '1px solid #d9d9d9',
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                {exportingType === 'glb'
                  ? t.exportingGlb
                  : bakeTargetType === 'camera'
                  ? t.downloadCameraGlb
                  : t.downloadGlb}
              </button>
            </div>

            <button
              type="button"
              onClick={() => downloadBoth(meta.getVrmaMetaOptions())}
              disabled={isBusy}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#111827',
                color: '#ffffff',
                border: 'none',
                borderRadius: 2,
                fontWeight: 600,
                fontSize: 12,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.6 : 1,
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
