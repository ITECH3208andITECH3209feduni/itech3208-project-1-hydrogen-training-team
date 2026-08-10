// app/modules/guides/page.tsx
// EXAMPLE section reusing the app/modules/ template. Rename the folder and
// adjust the copy/basePath below to match your real section.

'use client';

import '../modules.css';
import ModuleListingPage from '../components/ModuleListingPage';
import { guides } from '@/lib/guides';

export default function GuidesPage() {
	return (
		<ModuleListingPage
			items={guides}
			basePath="/modules/guides"
			heading="Guides"
			subheading="Replace with a short subheading for this section."
		/>
	);
}
