// app/modules/components/SectionBlock.tsx
// Renders a single numbered section inside a module page.

import { ModuleSection } from '@/lib/moduleTypes';

interface SectionBlockProps {
	section: ModuleSection;
}

export default function SectionBlock({ section }: SectionBlockProps) {
	return (
		<div className="section-block">
			<div className="section-num">{section.num}</div>
			<h2>{section.heading}</h2>

			{/* Body — split on double newline to produce separate <p> tags */}
			{section.body.replace(/\r\n/g, '\n').split('\n\n').map((para, i) => (
				<p key={i} dangerouslySetInnerHTML={{ __html: para }} />
			))}

			{/* Optional unordered list */}
			{section.items && section.listType === 'ul' && (
				<ul className="info-list">
					{section.items.map((item, i) => (
						<li key={i}>{item}</li>
					))}
				</ul>
			)}

			{/* Optional ordered list */}
			{section.items && section.listType === 'ol' && (
				<ol className="step-list">
					{section.items.map((item, i) => (
						<li key={i}>{item}</li>
					))}
				</ol>
			)}

			{/* Optional callout */}
			{section.callout && (
				<div className="callout">💡 {section.callout}</div>
			)}
		</div>
	);
}
