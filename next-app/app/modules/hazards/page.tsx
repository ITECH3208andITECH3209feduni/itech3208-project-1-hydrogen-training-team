// app/modules/hazards/page.tsx
// Hazard Modules listing page
// All layout/filter/auth logic lives in ModuleListingPage component — this file supplies the data.

'use client';

import '../modules.css';
import ModuleListingPage from '../components/ModuleListingPage';
import { useModules } from '@/hooks/modules/useModules';
import { hazardModules } from '@/lib/modules/hazards';

export default function HazardModulesPage() {
	const { modules, usingDefaults } = useModules('hazards', hazardModules);
	
	return (
		<ModuleListingPage
			items={modules}
			basePath="/modules/hazards"
			heading="Hydrogen Safety Modules"
			subheading="5 modules · Each linked to a real lab hazard · Learn, identify, respond"
			usingDefaults={usingDefaults}
		/>
	);
}
