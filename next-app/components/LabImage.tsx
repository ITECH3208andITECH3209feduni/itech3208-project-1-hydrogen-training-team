'use client';

import Image from 'next/image';
import { HazardType, hotspots } from '@/lib/hazards';

interface LabImageProps {
  onHotspotClick: (type: HazardType) => void;
}

export default function LabImage({ onHotspotClick }: LabImageProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '70%',
        maxWidth: '900px',
        margin: '30px auto',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
        padding: '20px',
        background: 'white',
      }}
    >
      {/*
        Replace the src below with your actual lab image.
        Place lab.jpg inside the /public folder and update src="/lab.jpg".
        The width/height props are required by next/image; adjust to match your image.
      */}
      <Image
        src="/lab.jpg"
        alt="Hydrogen Lab"
        width={900}
        height={600}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
        priority
      />

      {hotspots.map(({ type, top, left }) => (
        <button
          key={type}
          className="hotspot"
          style={{ top, left }}
          onClick={() => onHotspotClick(type)}
          aria-label={`Inspect ${type} hazard`}
        />
      ))}
    </div>
  );
}
