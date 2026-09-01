// app/modules/guides/[id]/page.tsx
// EXAMPLE section reusing the app/modules/ template. Rename the folder and
// adjust copy/basePath below to match your real section.

'use client';

import '../../modules.css';
import { useParams } from 'next/navigation';
import ModuleReaderPage from '../../components/ModuleReaderPage';
import { getGuideById, guides } from '@/lib/guides';

export default function GuidePage() {
	const params = useParams();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const item = id ? getGuideById(id) : undefined;

	return (
		<ModuleReaderPage
			item={item}
			allModules={guides}
			basePath="/modules/guides"
			// No badgeLabel — these sample items have no badgeNum, so no badge
			// is shown. Add badgeLabel="Chapter" (etc.) if your items do.
			backLabel="Guides"
			heroHint="Replace with a short hero hint for this section."
		/>
	);
}
