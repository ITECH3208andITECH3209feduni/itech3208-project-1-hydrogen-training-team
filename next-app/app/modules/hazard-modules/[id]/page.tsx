// app/modules/hazard-modules/[id]/page.tsx
// Hazard modules page
// All layout/filter/auth logic lives in ModuleReaderPage component — this file supplies the data.

'use client';

import '../../modules.css';
import { useParams } from 'next/navigation';
import ModuleReaderPage from '../../components/ModuleReaderPage';
import { useModuleById } from '@/hooks/useModules';
import { hazardModules } from '@/lib/hazardModules';

export default function HazardModulePage() {
	const params = useParams();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const { item, usingDefaults } = useModuleById('hazard-modules', hazardModules, id);

	return (
		<ModuleReaderPage
			item={item}
			section="hazard-modules"
			basePath="/modules/hazard-modules"
			badgeLabel="⚠ Hazard"
			backLabel="Hazard Modules"
			heroHint="Read through all sections to complete this module. Then test your knowledge in the Quiz."
			usingDefaults={usingDefaults}
			defaults={hazardModules}
		/>
	);
}
