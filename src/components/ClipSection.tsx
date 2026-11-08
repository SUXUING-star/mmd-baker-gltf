// src/components/ClipSection.tsx
import React from 'react';
import { TimelineController } from '../hooks/useMmdPipeline';

interface ClipSectionProps {
  t: any;
  timeline: TimelineController;
  disabled?: boolean;
}

export const ClipSection: React.FC<ClipSectionProps> = ({ t, timeline, disabled = false }) => {
  const { maxFrames, fps, currentFrame, startFrame, endFrame, isPlaying, togglePlay, seek, setStart, setEnd, autoSnapLoopEnd } = timeline;

  if (maxFrames === 0) return null;

  return (
    <div style={{ padding: '14px 16px', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 16 }}>
      {/* 头部控制器 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={togglePlay}
            disabled={disabled}
            style={{
              padding: '6px 16px',
              background: isPlaying ? '#ff4d4f' : '#1677ff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 13,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isPlaying ? t.pause : t.play}
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
            {t.currentFrameLabel}: <strong>{currentFrame}</strong> / {maxFrames - 1} 帧 ({(currentFrame / fps).toFixed(2)}s)
          </span>
        </div>

        <button
          onClick={autoSnapLoopEnd}
          disabled={disabled}
          style={{
            fontSize: 12,
            padding: '5px 12px',
            background: '#722ed1',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {t.autoTrimLoop}
        </button>
      </div>

      {/* 播放条指针滑块 */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="range"
          min={0}
          max={maxFrames - 1}
          value={currentFrame}
          disabled={disabled}
          onChange={(e) => seek(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* 循环截取 Start / End 控制器 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12, paddingTop: 10, borderTop: '1px dashed #e8e8e8' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
            <span>{t.startFrameLabel}: <strong>{startFrame}</strong></span>
            <span>{(startFrame / fps).toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, endFrame - 1)}
            value={startFrame}
            disabled={disabled}
            onChange={(e) => setStart(Number(e.target.value))}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
            <span>{t.endFrameLabel}: <strong>{endFrame}</strong></span>
            <span>{(endFrame / fps).toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={startFrame + 1}
            max={maxFrames - 1}
            value={endFrame}
            disabled={disabled}
            onChange={(e) => setEnd(Number(e.target.value))}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#389e0d', fontWeight: 500 }}>
        {t.trimmedDurationLabel(((endFrame - startFrame) / fps).toFixed(2), endFrame - startFrame + 1)}
      </div>
    </div>
  );
};
