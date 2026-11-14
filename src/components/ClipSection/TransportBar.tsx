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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={togglePlay}
          disabled={disabled}
          style={{
            padding: '5px 14px',
            background: '#1677ff',
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            fontWeight: 600,
            fontSize: 12,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {isPlaying ? t.pause : t.play}
        </button>
        <span style={{ fontSize: 12, color: '#374151' }}>
          {t.currentFrameLabel}: <strong>{currentFrame}</strong> / {maxFrames - 1} ({(currentFrame / fps).toFixed(2)}s)
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => exprState.applyAutoBlink(startFrame, endFrame, fps)}
          style={{
            padding: '4px 8px',
            borderRadius: 2,
            border: '1px solid #d9d9d9',
            background: '#ffffff',
            color: '#374151',
            fontSize: 11,
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
            padding: '4px 8px',
            borderRadius: 2,
            border: '1px solid #d9d9d9',
            background: '#ffffff',
            color: '#dc2626',
            fontSize: 11,
            cursor: disabled || exprState.tracks.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {t.exprClearAllBtn}
        </button>
        <button
          onClick={autoSnapLoopEnd}
          disabled={disabled}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            background: '#ffffff',
            color: '#1677ff',
            border: '1px solid #1677ff',
            borderRadius: 2,
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
