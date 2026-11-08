// src/components/DownloadSection.tsx
import React from 'react';
import { MmdPipeline } from '../hooks/useMmdPipeline';
import { VrmaMetadataState } from '../hooks/useVrmaMetadata';

interface DownloadSectionProps {
  t: any;
  pipeline: MmdPipeline;
  meta: VrmaMetadataState;
  onTestDefault: () => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  t,
  pipeline,
  meta,
  onTestDefault,
}) => {
  const { status, statusType, progress, processing, exportingType, timeline, downloadVrma, downloadGlb, downloadBoth } = pipeline;
  const { maxFrames, startFrame, endFrame, fps } = timeline;

  const isLoaded = maxFrames > 0;
  const frameCount = isLoaded ? endFrame - startFrame + 1 : 0;
  const durationSec = isLoaded ? (frameCount / fps).toFixed(2) : '0';

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#444' }}>
          <strong>{t.statusLabel}</strong>
          <span style={{ color: statusType === 'error' ? '#ff4d4f' : '#1677ff' }}>
            {processing && progress > 0 ? t.bakingProgress(progress) : status}
          </span>
        </div>

        {!isLoaded && !processing && (
          <button
            onClick={onTestDefault}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: '#f0f0f0',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {t.testDefaultBtn}
          </button>
        )}
      </div>

      {isLoaded && (
        <div style={{ borderTop: '1px solid #ebebeb', paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
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
