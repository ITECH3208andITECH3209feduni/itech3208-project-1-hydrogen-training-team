// lib/hazardModules.ts
// Content for the "Hazard Modules" section (app/modules/hazard-modules/).
// Types come from lib/moduleTypes.ts.

import { ModuleData, getModuleById } from './moduleTypes';

export const hazardModules: ModuleData[] = [
	{
		id: '1',
		slug: 'gas-leak-detection',
		badgeNum: 1,
		icon: '💨',
		iconBg: 'rgba(0,180,216,0.15)',
		title: 'Gas Leak Detection',
		description:
			'Understand how hydrogen leaks occur, why they are dangerous, and how to detect and respond to them safely.',
		status: 'todo',
		progress: 0,
		sections: [
			{
				num: '01',
				heading: 'What is a Hydrogen Gas Leak?',
				body: 'A hydrogen gas leak happens when hydrogen escapes from equipment such as cylinders, valves, regulators, pipes, or tubing. In laboratory environments, leaks are usually caused by loose connections, damaged equipment, worn seals, or poor maintenance.\n\nHydrogen leaks are especially dangerous because hydrogen is <strong>colourless</strong>, <strong>odourless</strong>, and <strong>highly flammable</strong>. This means a leak may not be noticed until it becomes a serious safety risk.',
			},
			{
				num: '02',
				heading: 'Why Are Hydrogen Leaks Dangerous?',
				body: 'The biggest danger of a hydrogen leak is fire or explosion. Hydrogen can ignite very easily, even from small ignition sources such as electrical sparks, static electricity, hot surfaces, or open flames.\n\nSince hydrogen rises quickly and can collect near ceilings or enclosed spaces, poor ventilation can make the situation much more dangerous.',
			},
			{
				num: '03',
				heading: 'Common Signs of a Leak',
				body: 'Although hydrogen cannot be seen or smelled, there are still warning signs that may indicate a leak:',
				listType: 'ul',
				items: [
					'Hissing sounds near equipment or cylinders',
					'Sudden pressure drops on gauges',
					'Hydrogen detector alarms activating',
					'Damaged tubing or loose fittings',
					'Poor ventilation in the room',
				],
				callout: '💡 Any suspected leak should always be treated seriously.',
			},
			{
				num: '04',
				heading: 'Hydrogen Detection Systems',
				body: 'Because hydrogen leaks are difficult to detect manually, laboratories use hydrogen sensors and gas detection systems. These detectors are usually mounted near ceilings, placed above hydrogen equipment, and connected to alarms or warning lights. Hydrogen sensors help detect dangerous gas build-up before it reaches flammable levels.',
			},
			{
				num: '05',
				heading: 'What To Do If a Leak Is Suspected',
				body: 'If you suspect a hydrogen leak, follow these steps immediately:',
				listType: 'ol',
				items: [
					'Avoid anything that could create a spark or flame',
					'Alert nearby people immediately',
					'Increase ventilation if safe to do so',
					'Leave the area if the leak appears serious',
					'Inform supervisors or emergency personnel',
				],
				callout: '💡 Never attempt to repair a major leak unless properly trained.',
			},
			{
				num: '06',
				heading: 'Preventing Hydrogen Leaks',
				body: 'Hydrogen leaks can often be prevented through proper maintenance and safe handling practices:',
				listType: 'ul',
				items: [
					'Regularly checking fittings and tubing',
					'Inspecting equipment for damage',
					'Using leak detection systems',
					'Ensuring good ventilation',
					'Properly securing gas cylinders',
				],
			},
		],
		keyTakeaway:
			'Hydrogen leaks are difficult to detect but can quickly become dangerous if ignored. Understanding the warning signs, using proper detection systems, and responding safely are essential for maintaining a safe hydrogen laboratory environment.',
		nextId: '2',
	},
	{
		id: '2',
		slug: 'ventilation-system',
		badgeNum: 2,
		icon: '🌬️',
		iconBg: 'rgba(0,229,160,0.12)',
		title: 'Ventilation System',
		description:
			'Learn how ventilation systems protect against hydrogen accumulation and what to do when they fail.',
		status: 'todo',
		progress: 0,
		sections: [
			{
				num: '01',
				heading: 'Why Ventilation Is Important',
				body: 'Ventilation plays a major role in hydrogen safety. Since hydrogen is much lighter than air, leaked gas rises quickly and can collect near ceilings or enclosed spaces if there is not enough airflow.\n\nA proper ventilation system helps remove hydrogen gas from the environment before it can build up to dangerous levels.',
			},
			{
				num: '02',
				heading: 'Risks of Poor Ventilation',
				body: 'Poor ventilation increases the risk of hydrogen accumulation, which can lead to fire, explosion, and unsafe working conditions. In enclosed laboratories, even a small leak can become dangerous if the gas is unable to disperse properly.\n\nCommon causes of poor ventilation include:',
				listType: 'ul',
				items: [
					'Closed or poorly ventilated rooms',
					'Blocked vents',
					'Non-functioning exhaust systems',
					'Incorrect use of fume hoods',
				],
			},
			{
				num: '03',
				heading: 'Common Warning Signs',
				body: 'Signs that ventilation may be inadequate include:',
				listType: 'ul',
				items: [
					'Hydrogen detector alarms activating',
					'Stuffy or poorly ventilated rooms',
					'Inactive ventilation systems',
					'Enclosed spaces with limited airflow',
					'Gas build-up near ceilings or overhead spaces',
				],
				callout: '💡 Poor ventilation can allow hydrogen to accumulate without being noticed.',
			},
			{
				num: '04',
				heading: 'Ventilation Safety Measures',
				body: 'To reduce the risk of gas accumulation:',
				listType: 'ul',
				items: [
					'Ensure ventilation systems are working properly',
					'Keep vents and airflow pathways clear',
					'Use fume hoods correctly during experiments',
					'Install hydrogen detectors in high-risk areas',
					'Regularly inspect and maintain ventilation systems',
				],
				callout:
					'💡 Good airflow is one of the most effective ways to reduce hydrogen-related hazards.',
			},
			{
				num: '05',
				heading: 'What To Do If Ventilation Fails',
				body: 'If ventilation systems stop working or hydrogen accumulation is suspected:',
				listType: 'ol',
				items: [
					'Stop work immediately',
					'Avoid ignition sources',
					'Leave the area if necessary',
					'Inform supervisors or emergency personnel',
					'Do not re-enter until the area is confirmed safe',
				],
			},
		],
		keyTakeaway:
			'Ventilation systems are essential in hydrogen laboratories because they help prevent dangerous gas accumulation. Maintaining proper airflow, using ventilation equipment correctly, and responding quickly to ventilation issues are critical parts of hydrogen safety.',
		prevId: '1',
		nextId: '3',
	},
	{
		id: '3',
		slug: 'equipment-and-leak-points',
		badgeNum: 3,
		icon: '🔧',
		iconBg: 'rgba(255,190,80,0.12)',
		title: 'Equipment & Leak Points',
		description:
			'Identify common leak points in hydrogen equipment — valves, regulators, tubing and connectors — and how to inspect them.',
		status: 'todo',
		progress: 0,
		sections: [
			{
				num: '01',
				heading: 'Understanding Equipment Risks',
				body: 'Hydrogen systems rely on equipment such as cylinders, valves, regulators, pipes, tubing, and connectors to safely store and transport gas. If any of these components become damaged, worn out, or incorrectly installed, hydrogen can escape and create a serious safety hazard.\n\nBecause hydrogen is stored under pressure and is highly flammable, even small equipment failures can lead to gas leaks, fire, or explosion.',
			},
			{
				num: '02',
				heading: 'Common Leak Points',
				body: 'Hydrogen leaks most commonly occur at connection points or areas exposed to wear and pressure. Common leak points include:',
				listType: 'ul',
				items: [
					'Cylinder valve connections',
					'Pressure regulators',
					'Pipe and tubing joints',
					'Flexible hoses',
					'O-rings and seals',
					'Threaded fittings and connectors',
				],
				callout: '💡 These areas should always be checked carefully during inspections.',
			},
			{
				num: '03',
				heading: 'Causes of Equipment Failure',
				body: 'Equipment can fail for several reasons, including:',
				listType: 'ul',
				items: [
					'Loose or poorly tightened fittings',
					'Damaged tubing or hoses',
					'Aging components',
					'Poor maintenance',
					'Corrosion or material degradation',
					'Repeated pressure stress on equipment',
				],
				callout:
					'💡 In hydrogen systems, some metals can also weaken over time due to hydrogen embrittlement, which may lead to cracks or sudden failure.',
			},
			{
				num: '04',
				heading: 'Warning Signs of Equipment Problems',
				body: 'Signs of faulty equipment or leaks may include:',
				listType: 'ul',
				items: [
					'Hissing sounds',
					'Pressure drops on gauges',
					'Damaged or cracked tubing',
					'Loose fittings',
					'Detector alarms activating',
					'Visible wear or corrosion on components',
				],
				callout: '💡 Any damaged equipment should be reported immediately and not used until inspected.',
			},
			{
				num: '05',
				heading: 'Safe Practices',
				body: 'To reduce equipment-related risks:',
				listType: 'ul',
				items: [
					'Inspect equipment regularly',
					'Tighten fittings properly',
					'Replace damaged or aging components',
					'Use materials suitable for hydrogen systems',
					'Ensure regulators and valves are installed correctly',
					'Perform routine leak checks',
				],
				callout: '💡 Proper maintenance is one of the most important parts of hydrogen safety.',
			},
		],
		keyTakeaway:
			'Equipment failures and leaks often begin at small connection points such as valves, fittings, or tubing. Regular inspection, proper maintenance, and early detection are essential to prevent hydrogen leaks and maintain a safe laboratory environment.',
		prevId: '2',
		nextId: '4',
	},
	{
		id: '4',
		slug: 'chemical-storage',
		badgeNum: 4,
		icon: '🧪',
		iconBg: 'rgba(255,107,107,0.12)',
		title: 'Chemical Storage',
		description:
			'Explore safe chemical storage practices in hydrogen labs, including labelling, separation of incompatibles, and ventilation.',
		status: 'todo',
		progress: 0,
		sections: [
			{
				num: '01',
				heading: 'Why Chemical Storage Matters',
				body: 'Proper chemical storage is important in any laboratory, especially in environments where hydrogen is present. Incorrectly stored chemicals can increase the risk of fire, explosion, toxic reactions, or equipment damage.\n\nHydrogen itself is highly flammable, which means it should be kept away from incompatible chemicals, heat sources, and ignition sources.',
			},
			{
				num: '02',
				heading: 'Common Chemical Storage Hazards',
				body: 'Unsafe chemical storage can include:',
				listType: 'ul',
				items: [
					'Storing flammable materials near ignition sources',
					'Placing incompatible chemicals together',
					'Poor labelling of containers',
					'Leaking or damaged chemical containers',
					'Overcrowded storage areas',
					'Improper storage of gas cylinders',
				],
				callout:
					'💡 These situations can increase the severity of accidents during a hydrogen leak or fire.',
			},
			{
				num: '03',
				heading: 'Safe Storage Practices',
				body: 'To maintain a safe laboratory environment:',
				listType: 'ul',
				items: [
					'Clearly label all chemicals and gas cylinders',
					'Store flammable chemicals in approved storage areas',
					'Keep incompatible chemicals separated',
					'Secure hydrogen cylinders properly',
					'Ensure storage areas are well ventilated',
					'Regularly inspect containers for damage or leaks',
				],
				callout:
					'💡 Storage areas should always remain clean, organised, and easy to access during emergencies.',
			},
			{
				num: '04',
				heading: 'Warning Signs of Unsafe Storage',
				body: 'Signs of poor chemical storage may include:',
				listType: 'ul',
				items: [
					'Damaged or leaking containers',
					'Missing labels',
					'Strong chemical odours',
					'Blocked walkways or exits',
					'Chemicals stored near heat or electrical equipment',
					'Unsecured gas cylinders',
				],
				callout: '💡 Any unsafe storage conditions should be reported immediately.',
			},
			{
				num: '05',
				heading: 'Emergency Response',
				body: 'If a chemical storage issue is identified:',
				listType: 'ol',
				items: [
					'Avoid touching damaged containers unless trained',
					'Inform laboratory supervisors immediately',
					'Keep ignition sources away from the area',
					'Follow laboratory emergency procedures',
					'Evacuate if there is a major leak or fire risk',
				],
			},
		],
		keyTakeaway:
			'Proper chemical storage is essential for maintaining safety in hydrogen laboratories. Organised storage, correct labelling, good ventilation, and regular inspections help reduce the risk of leaks, fires, and hazardous reactions.',
		prevId: '3',
		nextId: '5',
	},
	{
		id: '5',
		slug: 'gas-cylinder-storage',
		badgeNum: 5,
		icon: '🧯',
		iconBg: 'rgba(180,100,255,0.12)',
		title: 'Gas Cylinder Storage',
		description:
			'Understand how to safely store and handle high-pressure hydrogen gas cylinders, including securing, capping, and inspection.',
		status: 'todo',
		progress: 0,
		sections: [
			{
				num: '01',
				heading: 'Why Proper Gas Cylinder Storage Matters',
				body: 'Hydrogen gas cylinders store gas under very high pressure, which means improper storage can create serious safety risks. A damaged or unsecured cylinder can lead to gas leaks, fire, explosion, or physical injury.\n\nSafe storage helps reduce the risk of accidents and ensures cylinders remain stable and protected while not in use.',
			},
			{
				num: '02',
				heading: 'Common Storage Hazards',
				body: 'Unsafe cylinder storage can include:',
				listType: 'ul',
				items: [
					'Unsecured cylinders',
					'Cylinders stored near heat or ignition sources',
					'Damaged valves or regulators',
					'Poor ventilation in storage areas',
					'Cylinders placed in high-traffic areas',
					'Storing incompatible gases together',
				],
				callout: '💡 Even a small impact to a cylinder valve can cause dangerous gas release.',
			},
			{
				num: '03',
				heading: 'Safe Storage Practices',
				body: 'To safely store hydrogen gas cylinders:',
				listType: 'ul',
				items: [
					'Secure cylinders using chains or straps',
					'Keep cylinders upright at all times',
					'Store cylinders in well-ventilated areas',
					'Keep protective valve caps in place when not in use',
					'Store cylinders away from heat, sparks, and flames',
					'Regularly inspect cylinders and fittings for damage',
				],
				callout: '💡 Storage areas should also remain clean and free from obstacles.',
			},
			{
				num: '04',
				heading: 'Warning Signs of Unsafe Storage',
				body: 'Signs of unsafe cylinder storage may include:',
				listType: 'ul',
				items: [
					'Cylinders standing freely without restraints',
					'Damaged valves or missing caps',
					'Leaking fittings or hissing sounds',
					'Cylinders stored near electrical equipment or heat sources',
					'Visible corrosion or physical damage',
				],
				callout: '💡 Any damaged or unstable cylinder should be reported immediately.',
			},
			{
				num: '05',
				heading: 'Emergency Response',
				body: 'If a cylinder leak or storage issue is identified:',
				listType: 'ol',
				items: [
					'Keep away from ignition sources',
					'Alert nearby personnel',
					'Evacuate the area if necessary',
					'Inform trained laboratory staff or emergency responders',
					'Do not attempt to repair damaged cylinders unless properly trained',
				],
			},
		],
		keyTakeaway:
			'Hydrogen gas cylinders contain large amounts of stored energy and must be handled and stored carefully. Proper securing, ventilation, regular inspection, and safe storage practices are essential to prevent leaks, fires, and serious accidents in laboratory environments.',
		prevId: '4',
	},
];

// Helper to look up a hazard module by its numeric id string (currently unused, considered for deletion)
export function getHazardModuleById(id: string): ModuleData | undefined {
	return getModuleById(hazardModules, id);	// Calls the generic helper from lib/moduleTypes.ts
}
