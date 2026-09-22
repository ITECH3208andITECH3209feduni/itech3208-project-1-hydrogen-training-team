// hooks/lab/useModuleOptions.ts
// Supplies the "Linked Module" topic/id dropdown options for HotspotEditor.tsx.

import { useState, useEffect } from 'react';

export interface ModuleOption {
	id: string;
	title: string;
	badgeNum?: number | null;	// badge number for modules that have one
}

export interface ModuleTopicOptions {
	value: string;				// module's topic name — the topic dropdown value
	options: ModuleOption[];	// module ids and titles — the module dropdown values
}

interface ModuleOptionRow {
	topic: string;
	id: string;
	badge_num: number | null;
	title: string;
}

export function useModuleOptions(): ModuleTopicOptions[] {
	const [topics, setTopics] = useState<ModuleTopicOptions[]>([]);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const res = await fetch('/api/lab/load-module-options', { cache: 'no-store' });
				const json = await res.json();
				if (cancelled) return;

				if (!json.ok) {
					console.error('load-module-options API error:', json.error);
					return;	// leave topics as [] — show dropdowns as empty
				}

				const rows: ModuleOptionRow[] = json.data ?? [];

				// Group the data into entries by topic (i.e. go from one topic --> one ID, to one topic --> many IDs)
				const byTopic = new Map<string, ModuleTopicOptions>();
				for (const row of rows) {
					if (!byTopic.has(row.topic)) {
						byTopic.set(row.topic, { value: row.topic, options: [] });
					}
					byTopic.get(row.topic)!.options.push({
						id: row.id,
						title: row.title,
						badgeNum: row.badge_num,
					});
				}

				setTopics(Array.from(byTopic.values()));
			} catch {
				if (!cancelled) {
					console.error('Failed to load module options');
				}
			}
		}

		load();
		return () => { cancelled = true; };
	}, []);

	return topics;
}
