'use client';

import { useEffect } from 'react';
import { HazardInfo } from '@/lib/hazards';

interface HazardPopupProps {
  info: HazardInfo;
  onClose: () => void;
}

export default function HazardPopup({ info, onClose }: HazardPopupProps) {
  // Close on Escape key — mirrors the original window.onclick dismiss behaviour
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="popup-overlay"
      onClick={(e) => {
        // Close when clicking the backdrop (mirrors original window.onclick logic)
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
    >
      <div className="popup-content">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="popup-title">{info.title}</h2>
        <p id="popup-text">{info.text}</p>
      </div>
    </div>
  );
}
