import React from 'react';
import { ExpressionTracksController } from '../../hooks/useExpressionTracks';
import { TimelineController } from '../../hooks/useMmdPipeline';
import { I18nTexts } from '../../i18n';

interface TransportBarProps {
  t: I18nTexts;
  timeline: TimelineController;
  exprState: ExpressionTracksController;
  disabled: boolean;
}

export const TransportBar: React.FC<TransportBarProps> = ({ t, timeline, exprState, disabled }) => {
  const { maxFrames, fps, currentFrame, startFrame, endFrame, isPlaying, togglePlay, autoSnapLoopEnd } = timeline;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
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
          {t.currentFrameLabel}: <strong>{currentFrame}</strong> / {maxFrames - 1} ({(currentFrame / fps).toFixed(2)}s)
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => exprState.applyAutoBlink(startFrame, endFrame, fps)}
          style={{
            padding: '5px 10px',
            borderRadius: 4,
            border: '1px solid #93c5fd',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: 12,
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {t.exprAutoBlinkBtn}
        </button>
        <button
          type="button"
          disabled={disabled || exprState.tracks.length === 0}
          onClick={exprState.clearAllTracks}
          style={{
            padding: '5px 10px',
            borderRadius: 4,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: 12,
            cursor: disabled || exprState.tracks.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {t.exprClearAllBtn}
        </button>
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
    </div>
  );
};
