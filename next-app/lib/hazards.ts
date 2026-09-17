// lib/hazards.ts
// Hazard text and hotspot positions

// TypeScript union type listing every hazard identifier
// Means TypeScript catches typos or invalid hazard names at compile time, not runtime
export type HazardType = 'gas' | 'ventilation' | 'cylinder' | 'chemical' | 'equipment';

// Define hazard data
export interface HazardInfo {
	title: string;
	text: string;
	moduleId: string | null;		// Links to the corresponding page under /modules/[moduleSection]/[moduleId]
	moduleSection: string | null;	// Section of app/modules/ the linked module lives under (e.g. 'hazard-modules')
	videoUrl: string | null;
	videoType: 'youtube' | 'mp4' | null;
}

// Hazard text
export const hazardData: Record<HazardType, HazardInfo> = {
	gas: {
		title: '⚠️ Gas Leak Detection',
		text: 'Hydrogen is highly flammable and difficult to detect. Sensors placed near the ceiling identify leaks early to prevent explosions.',
		moduleId: '1',
		moduleSection: 'hazard-modules',
		videoUrl: null,
		videoType: null,
	},
	ventilation: {
		title: '💨 Ventilation System',
		text: 'Proper ventilation removes hydrogen buildup, reducing fire and explosion risks in the laboratory.',
		moduleId: '2',
		moduleSection: 'hazard-modules',
		videoUrl: null,
		videoType: null,
	},
	cylinder: {
		title: '🧯 Gas Cylinder Storage',
		text: 'Cylinders must be secured upright and stored in ventilated areas away from heat and ignition sources.',
		moduleId: '5',
		moduleSection: 'hazard-modules',
		videoUrl: null,
		videoType: null,
	},
	chemical: {
		title: '🧪 Chemical Storage',
		text: 'Flammable chemicals should be stored in approved safety cabinets to prevent accidental ignition.',
		moduleId: '4',
		moduleSection: 'hazard-modules',
		videoUrl: null,
		videoType: null,
	},
	equipment: {
		title: '🔧 Equipment & Leak Points',
		text: 'Valves, joints, and fittings must be inspected regularly to prevent hydrogen leaks.',
		moduleId: '3',
		moduleSection: 'hazard-modules',
		videoUrl: null,
		videoType: null,
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
