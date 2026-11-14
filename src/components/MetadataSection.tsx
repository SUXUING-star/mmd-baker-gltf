// src/components/MetadataSection.tsx
import React from 'react';
import { VrmaMetadataState } from '../hooks/useVrmaMetadata';

interface MetadataSectionProps {
  t: any;
  meta: VrmaMetadataState;
  disabled?: boolean;
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({ t, meta, disabled = false }) => {
  const { metadata, updateField } = meta;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
        {t.metadataTitle}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 3 }}>
            {t.metaTitle}
          </label>
          <input
            type="text"
            value={metadata.title}
            placeholder={t.metaTitlePlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('title', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 2, background: 'transparent' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 3 }}>
            {t.metaAuthors}
          </label>
          <input
            type="text"
            value={metadata.authors}
            placeholder={t.metaAuthorsPlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('authors', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 2, background: 'transparent' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 3 }}>
            {t.metaCopyright}
          </label>
          <input
            type="text"
            value={metadata.copyrightInformation}
            placeholder={t.metaCopyrightPlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('copyrightInformation', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 2, background: 'transparent' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 3 }}>
            {t.metaLicense}
          </label>
          <input
            type="text"
            value={metadata.licenseUrl}
            placeholder={t.metaLicensePlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('licenseUrl', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 2, background: 'transparent' }}
          />
        </div>
      </div>
    </div>
  );
};
