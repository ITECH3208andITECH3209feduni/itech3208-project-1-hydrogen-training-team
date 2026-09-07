// hooks/useModuleOptions.ts
// Supplies the "Linked Module" section/id dropdown options for HotspotEditor.tsx.

import { useState, useEffect } from 'react';

export interface ModuleOption {
	id: string;
	title: string;
	badgeNum?: number | null;	// badge number for modules that have one
}

export interface ModuleSectionOptions {
	value: string;				// module's section name — the section dropdown value
	options: ModuleOption[];	// module ids and titles — the module dropdown values
}

interface ModuleOptionRow {
	section: string;
	id: string;
	badge_num: number | null;
	title: string;
}

export function useModuleOptions(): ModuleSectionOptions[] {
	const [sections, setSections] = useState<ModuleSectionOptions[]>([]);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const res = await fetch('/api/load-module-options', { cache: 'no-store' });
				const json = await res.json();
				if (cancelled) return;

				if (!json.ok) {
					console.error('load-module-options API error:', json.error);
					return;	// leave sections as [] — show dropdowns as empty
				}

				const rows: ModuleOptionRow[] = json.data ?? [];

				// Group the data into entries by section (i.e. go from one section - one ID, to one section - many IDs)
				const bySection = new Map<string, ModuleSectionOptions>();
				for (const row of rows) {
					if (!bySection.has(row.section)) {
						bySection.set(row.section, { value: row.section, options: [] });
					}
					bySection.get(row.section)!.options.push({
						id: row.id,
						title: row.title,
						badgeNum: row.badge_num,
					});
				}

				setSections(Array.from(bySection.values()));
			} catch {
				if (!cancelled) {
					console.error('Failed to load module options');
				}
			}
		}

		load();
		return () => { cancelled = true; };
	}, []);

	return sections;
}
