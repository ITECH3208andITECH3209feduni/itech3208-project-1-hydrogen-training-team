// lib/questionhazards.ts
// Question bank + metadata for the Hydrogen Hazards quiz

export interface QuizQuestion {
	id: number;
	question: string;
	options: string[];
	correctIndex: number;
	explanation: string;
}

export const QUIZ_TITLE = 'Hydrogen Hazards Quiz';
export const QUIZ_SLUG = 'hazards';
// Matches the quiz_id used in the user_quiz_progress and quiz_requirements
// tables (see app/api/quizzes/progress/route.ts and lib/quizRequirements.sql)
// — not the same as QUIZ_SLUG, which is only the URL segment.
export const QUIZ_ID = 'hydrogen-hazards';
export const PASS_THRESHOLD = 70; // percent required to pass

export const questionhazards: QuizQuestion[] = [
	{
		id: 1,
		question:
			'What makes hydrogen leaks especially difficult to detect using human senses alone?',
		options: [
			'It has a very faint, pleasant scent',
			'It is colourless, odourless, and tasteless',
			'It is often visually mistaken for a heat shimmer',
			'It makes no sound when leaking',
		],
		correctIndex: 1,
		explanation:
			'Hydrogen cannot be seen, smelled, or tasted, which is why dedicated hydrogen gas detectors are essential safety equipment in any hydrogen facility.',
	},
	{
		id: 2,
		question: "What is hydrogen's flammability range in air?",
		options: ['1–10%', '4–75%', '15–30%', '50–90%'],
		correctIndex: 1,
		explanation:
			'Hydrogen is flammable across an unusually wide range, from 4% to 75% concentration in air, making it easier to accidentally create an ignitable mixture.',
	},
	{
		id: 3,
		question: 'Compared with air, hydrogen gas is:',
		options: [
			'14 times heavier, so it pools at floor level',
			'About the same density, so it stays where it is released',
			'14 times lighter, so it rises and disperses upward',
			'Heavier when cold and lighter when warm',
		],
		correctIndex: 2,
		explanation:
			'Hydrogen is about 14 times lighter than air and disperses rapidly upward, which changes where leaks tend to accumulate.',
	},
	{
		id: 4,
		question:
			'Where is the greatest accumulation risk in an indoor workspace?',
		options: [
			'In floor drains and pits',
			'At ceilings and in enclosed or confined spaces',
			'Inside sealed liquid containers',
			'There is no accumulation risk indoors',
		],
		correctIndex: 1,
		explanation:
			'Rising hydrogen can pool at ceilings and in enclosed spaces with poor ventilation, creating serious explosion hazards even though ground-level risk is reduced.',
	},
	{
		id: 5,
		question: 'Why is a hydrogen fire particularly hazardous to approach?',
		options: [
			'It burns with a nearly invisible flame',
			'It produces thick black smoke that blocks exits',
			'It cannot be extinguished by any means',
			'It burns at a lower temperature than other fuels',
		],
		correctIndex: 0,
		explanation:
			'A hydrogen flame is pale and nearly invisible in daylight, so workers can be dangerously close to a fire without realising it is there.',
	},
	{
		id: 6,
		question: 'Which of the following is a recognised hydrogen storage form?',
		options: [
			'Compressed gas at up to 700 bar',
			'Dissolved in water at room temperature',
			'As a fine powder suspended in air',
			'Stored in open atmospheric tanks',
		],
		correctIndex: 0,
		explanation:
			'Hydrogen is commonly stored as a compressed gas (up to 700 bar), a cryogenic liquid, or in solid-state materials — each with its own hazard profile.',
	},
	{
		id: 7,
		question: 'At what temperature is hydrogen stored as a cryogenic liquid?',
		options: ['−40°C', '−100°C', '−196°C', '−253°C'],
		correctIndex: 3,
		explanation:
			'Liquid hydrogen is stored at around −253°C, cold enough to cause severe cryogenic burns and embrittlement of some materials on contact.',
	},
	{
		id: 8,
		question: 'What by-product is produced when hydrogen is used in a fuel cell?',
		options: ['Carbon dioxide', 'Water', 'Nitrogen oxides', 'Methane'],
		correctIndex: 1,
		explanation:
			'Hydrogen fuel cells combine H₂ with oxygen to produce electricity, with water as the only by-product — a key reason hydrogen is considered a clean energy carrier.',
	},
];

export default questionhazards;
