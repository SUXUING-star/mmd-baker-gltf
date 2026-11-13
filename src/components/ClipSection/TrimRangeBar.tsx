import React from 'react';
import { TimelineController } from '../../hooks/useMmdPipeline';
import { I18nTexts } from '../../i18n';

interface TrimRangeBarProps {
  t: I18nTexts;
  timeline: TimelineController;
  disabled: boolean;
}

export const TrimRangeBar: React.FC<TrimRangeBarProps> = ({ t, timeline, disabled }) => {
  const { maxFrames, fps, startFrame, endFrame, setStart, setEnd } = timeline;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12, paddingTop: 10, marginTop: 10 }}>
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
    </>
  );
};
