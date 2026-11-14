import React from 'react';
import type { ExpressionTracksController } from '../../hooks/useExpressionTracks';
import type { TimelineController } from '../../hooks/useMmdPipeline';
import type { I18nTexts } from '../../i18n';
import type { ModelMorphInfo } from '../../types/types';
import type { VmdExpressionTrackSummary } from '../../utils/vmdExpressionAnalyzer';
import { ExpressionControls } from './ExpressionControls';
import { PrTimeline } from './PrTimeline';
import { TransportBar } from './TransportBar';
import { TrimRangeBar } from './TrimRangeBar';

interface ClipSectionProps {
  t: I18nTexts;
  timeline: TimelineController;
  exprState: ExpressionTracksController;
  availableMorphs: ModelMorphInfo[];
  vmdExpressionTracks: VmdExpressionTrackSummary[];
  getFrameVmdExpressions: (frame: number) => Record<string, number>;
  disabled?: boolean;
}

export const ClipSection: React.FC<ClipSectionProps> = ({
  t,
  timeline,
  exprState,
  availableMorphs,
  vmdExpressionTracks,
  getFrameVmdExpressions,
  disabled = false,
}) => {
  if (timeline.maxFrames === 0) return null;

  return (
    <div style={{ padding: '14px 16px', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 16 }}>
      <TransportBar t={t} timeline={timeline} exprState={exprState} disabled={disabled} />
      <PrTimeline
        t={t}
        timeline={timeline}
        exprState={exprState}
        vmdExpressionTracks={vmdExpressionTracks}
        getFrameVmdExpressions={getFrameVmdExpressions}
        disabled={disabled}
      />
      <TrimRangeBar t={t} timeline={timeline} disabled={disabled} />
      <ExpressionControls
        t={t}
        timeline={timeline}
        exprState={exprState}
        availableMorphs={availableMorphs}
        vmdExpressionTracks={vmdExpressionTracks}
        disabled={disabled}
      />
    </div>
  );
};
