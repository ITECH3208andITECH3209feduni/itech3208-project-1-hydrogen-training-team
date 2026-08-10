// app/modules/hazard-modules/page.tsx
// Hazard Modules listing page
// All layout/filter/auth logic lives in ModuleListingPage — this file supplies the data.

'use client';

import '../modules.css';
import ModuleListingPage from '../components/ModuleListingPage';
import { hazardModules } from '@/lib/hazardModules';

export default function HazardModulesPage() {
	return (
		<ModuleListingPage
			items={hazardModules}
			basePath="/modules/hazard-modules"
			heading="Hydrogen Safety Modules"
			subheading="5 modules · Each linked to a real lab hazard · Learn, identify, respond"
		/>
	);
}
