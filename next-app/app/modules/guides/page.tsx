// app/modules/guides/page.tsx
// EXAMPLE section reusing the app/modules/ template. Rename the folder and
// adjust the copy/basePath below to match your real section.

'use client';

import '../modules.css';
import ModuleListingPage from '../components/ModuleListingPage';
import { useModules } from '@/hooks/useModules';
import { guides } from '@/lib/guides';

export default function GuidesPage() {
	const { modules, usingDefaults } = useModules('guides', guides);

	return (
		<ModuleListingPage
			items={modules}
			basePath="/modules/guides"
			heading="Guides"
			subheading="Replace with a short subheading for this section."
			usingDefaults={usingDefaults}
		/>
	);
}
