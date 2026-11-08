// src/components/ThreeCanvas.tsx
import React from 'react';

interface ThreeCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ containerRef }) => {
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 380,
        borderRadius: 8,
        border: '1px solid #d9d9d9',
        background: '#ffffff',
        marginBottom: 16,
      }}
    />
  );
};
