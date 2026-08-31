// app/modules/guides/[id]/page.tsx
// EXAMPLE section reusing the app/modules/ template. Rename the folder and
// adjust copy/basePath below to match your real section.

'use client';

import '../../modules.css';
import { useParams } from 'next/navigation';
import ModuleReaderPage from '../../components/ModuleReaderPage';
import { useModuleById } from '@/hooks/useModules';
import { guides } from '@/lib/guides';

export default function GuidePage() {
	const params = useParams();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const { item, usingDefaults } = useModuleById('guides', guides, id);

	return (
		<ModuleReaderPage
			item={item}
			section="guides"
			basePath="/modules/guides"
			// No badgeLabel — these items have no badgeNum, so no badge is shown.
			backLabel="Guides"
			heroHint="Replace with a short hero hint for this section."
			usingDefaults={usingDefaults}
		/>
	);
}
