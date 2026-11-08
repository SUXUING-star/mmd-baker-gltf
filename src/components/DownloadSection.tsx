// src/components/DownloadSection.tsx
import React from 'react';
import { DownloadItem, ExportFormat, PipelineDownloadResult } from '../hooks/useMmdPipeline';

interface DownloadSectionProps {
  t: any;
  status: string;
  statusType: string;
  progress: number;
  processing: boolean;
  maxFrames: number;
  exportFormat: ExportFormat;
  setExportFormat: (fmt: ExportFormat) => void;
  downloads: PipelineDownloadResult | null;
  onExport: () => void;
  onTestDefault: () => void;
  onDownload: (item: DownloadItem) => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  t,
  status,
  statusType,
  progress,
  processing,
  maxFrames,
  exportFormat,
  setExportFormat,
  downloads,
  onExport,
  onTestDefault,
  onDownload,
}) => {
  return (
    <div>
      {/* 解算状态信息栏 */}
      <div style={{ padding: '10px 14px', background: '#f0f5ff', borderRadius: 6, marginBottom: 14, fontSize: 14, color: '#1d39c4' }}>
        <strong>{t.statusLabel}</strong> {status} {processing && statusType === 'analyzing' && `(${progress}%)`}
      </div>

      {/* 导出格式配置 Radio */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: '#fafafa', border: '1px solid #eee', borderRadius: 6, marginBottom: 14 }}>
        <strong style={{ fontSize: 14, color: '#333', marginRight: 16 }}>{t.exportFormatLabel}</strong>
        {(['both', 'vrma', 'glb'] as ExportFormat[]).map((fmt) => (
          <label key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 14, marginRight: 16 }}>
            <input
              type="radio"
              name="format"
              value={fmt}
              checked={exportFormat === fmt}
              disabled={processing}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            />
            {fmt === 'both' ? t.formatBoth : fmt === 'vrma' ? t.formatVrma : t.formatGlb}
          </label>
        ))}
      </div>

      {/* 核心操作按钮 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          disabled={processing || maxFrames === 0}
          onClick={onExport}
          style={{
            flex: 2,
            padding: '12px 0',
            background: processing || maxFrames === 0 ? '#ccc' : '#52c41a',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            cursor: processing || maxFrames === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {processing && statusType === 'exporting' ? '正在解算导出中...' : t.startConvert}
        </button>

        <button
          disabled={processing}
          onClick={onTestDefault}
          style={{
            flex: 1,
            padding: '12px 0',
            background: processing ? '#eee' : '#fff',
            color: processing ? '#999' : '#333',
            fontSize: 14,
            fontWeight: 500,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            cursor: processing ? 'not-allowed' : 'pointer',
          }}
        >
          {t.testDefaultBtn}
        </button>
      </div>

      {/* 下载卡片 */}
      {downloads && (
        <div style={{ padding: '14px 18px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#389e0d', fontSize: 14, fontWeight: 500 }}>
            {t.convertComplete}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {downloads.vrma && (
              <button
                onClick={() => onDownload(downloads.vrma!)}
                style={{ padding: '8px 18px', background: '#722ed1', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {t.downloadVrma}
              </button>
            )}
            {downloads.glb && (
              <button
                onClick={() => onDownload(downloads.glb!)}
                style={{ padding: '8px 18px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {t.downloadGlb}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
