// lib/guides.ts
// EXAMPLE data file for a new section built on the app/modules/ template.
// Rename this file (and app/modules/guides/**) to whatever your new section
// is actually called, then replace the sample entries below with your real
// content. Shape must match ModuleData from lib/moduleTypes.ts.

import { ModuleData, getModuleById } from './moduleTypes';

export const guides: ModuleData[] = [
	{
		id: '1',
		slug: 'sample-guide-one',
		title: 'Sample Guide One',
		icon: '📘',
		iconBg: 'rgba(0,180,216,0.15)',
		description: 'Replace this with a short description of the first item.',
		status: 'todo',
		progress: 0,
		// badgeNum is optional — omit it entirely if this section doesn't need
		// a numbered badge (e.g. it isn't tied to a specific hazard/chapter).
		sections: [
			{
				num: '1.1',
				heading: 'First section heading',
				body: 'Replace with your section body text.\n\nUse a blank line to start a new paragraph.',
				listType: 'ul',
				items: ['First point', 'Second point', 'Third point'],
				callout: 'Optional callout text shown in a highlighted box.',
			},
			{
				num: '1.2',
				heading: 'Second section heading',
				body: 'Another section body goes here.',
				listType: 'ol',
				items: ['Step one', 'Step two', 'Step three'],
			},
		],
		keyTakeaway: 'Replace with the one-sentence takeaway for this item.',
		prevId: undefined,
		nextId: '2',
	},
	{
		id: '2',
		slug: 'sample-guide-two',
		title: 'Sample Guide Two',
		icon: '📗',
		iconBg: 'rgba(0,229,160,0.15)',
		description: 'Replace this with a short description of the second item.',
		status: 'progress',
		progress: 40,
		sections: [
			{
				num: '2.1',
				heading: 'Section heading',
				body: 'Body text for this section.',
			},
		],
		keyTakeaway: 'Replace with the takeaway for this item.',
		prevId: '1',
		nextId: undefined,
	},
];

export function getGuideById(id: string) {
	return getModuleById(guides, id);
}
