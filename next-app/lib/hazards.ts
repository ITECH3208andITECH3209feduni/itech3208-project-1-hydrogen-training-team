// Hazard text and hotspot positions

// TypeScript union type listing every hazard identifier
// Means TypeScript catches typos or invalid hazard names at compile time, not runtime
export type HazardType = 'gas' | 'ventilation' | 'cylinder' | 'chemical' | 'equipment';

// Define hazard data
export interface HazardInfo {
  title: string;
  text: string;
}

// Hazard text
export const hazardData: Record<HazardType, HazardInfo> = {
  gas: {
    title: '⚠️ Gas Leak Detection',
    text: 'Hydrogen is highly flammable and difficult to detect. Sensors placed near the ceiling identify leaks early to prevent explosions.',
  },
  ventilation: {
    title: '💨 Ventilation System',
    text: 'Proper ventilation removes hydrogen buildup, reducing fire and explosion risks in the laboratory.',
  },
  cylinder: {
    title: '🧯 Gas Cylinder Storage',
    text: 'Cylinders must be secured upright and stored in ventilated areas away from heat and ignition sources.',
  },
  chemical: {
    title: '🧪 Chemical Storage',
    text: 'Flammable chemicals should be stored in approved safety cabinets to prevent accidental ignition.',
  },
  equipment: {
    title: '🔧 Equipment & Leak Points',
    text: 'Valves, joints, and fittings must be inspected regularly to prevent hydrogen leaks.',
  },
};

// Define hazard type and position of each hotspot
export interface HotspotConfig {
  type: HazardType;
  top: string;
  left: string;
}

// Hotspot types and positions
export const hotspots: HotspotConfig[] = [
  { type: 'gas',         top: '18%', left: '12%' },
  { type: 'ventilation', top: '28%', left: '45%' },
  { type: 'cylinder',    top: '52%', left: '78%' },
  { type: 'chemical',    top: '68%', left: '70%' },
  { type: 'equipment',   top: '55%', left: '40%' },
];
