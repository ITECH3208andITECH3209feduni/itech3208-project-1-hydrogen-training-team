'use client';

import { useState } from 'react';
import LabImage from '@/components/LabImage';
import HazardPopup from '@/components/HazardPopup';
import { HazardType, hazardData } from '@/lib/hazards';

export default function Home() {
  const [activeHazard, setActiveHazard] = useState<HazardType | null>(null);

  const handleHotspotClick = (type: HazardType) => {
    setActiveHazard(type);
  };

  const handleClose = () => {
    setActiveHazard(null);
  };

  return (
    <main>
      <h1 style={{ marginTop: '20px', fontSize: '28px', textAlign: 'center' }}>
        Interactive Hydrogen Lab
      </h1>
      <p style={{ color: '#666', textAlign: 'center', marginTop: '8px' }}>
        Click on highlighted areas to identify hazards.
      </p>

      <LabImage onHotspotClick={handleHotspotClick} />

      {activeHazard && (
        <HazardPopup
          info={hazardData[activeHazard]}
          onClose={handleClose}
        />
      )}
    </main>
  );
}
