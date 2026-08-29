// lib/moduleTypes.ts
// Shared shape for the listing+reader template used by every section under app/modules/ (e.g. app/modules/hazard-modules).
// Each section has its own data file (e.g. lib/hazardModules.ts) built from ModuleData[], plus its own thin wrapper pages under app/modules/<section>/.
/**
 * ? means the field is optional.
 * It won't be loaded if it is not included in the data file or is null.
*/

export type ModuleStatus = 'done' | 'progress' | 'todo';

export interface ModuleSection {
	num: string;
	heading: string;
	body: string;
	listType?: 'ul' | 'ol';
	items?: string[];
	callout?: string;
}

export interface ModuleData {
	id: string;
	title: string;
	icon: string;
	iconBg: string;			// Tailwind-style inline colour for the icon background
	description: string;
	status: ModuleStatus;
	progress: number;		// Possible values: 0-100
	sections: ModuleSection[];
	keyTakeaway: string;
	prevId?: string | null;
	nextId?: string | null;
	/**
	 * Optional small numbered badge shown top-left of the card and in the reader hero.
	 * Leave undefined to hide the badge entirely for sections that don't need one.
	 */
	badgeNum?: string | number;
	/**
	 * Optional stable, human-readable identifier (e.g. "gas-leak-detection").
	 * Not used for routing — routes built from `id` — but kept for analytics event names, test selectors, or a future move to slug-based URLs.
	 */
	slug?: string;
	videoUrl?: string | null;
	videoType?: "youtube" | "mp4" | null;
}
// Helper to look up a module by its numeric id string
export function getModuleById<T extends ModuleData>(items: T[], id: string): T | undefined {
	return items.find((item) => item.id === id);
}
