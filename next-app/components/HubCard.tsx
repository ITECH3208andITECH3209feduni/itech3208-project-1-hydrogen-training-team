// components/HubCard.tsx
// Shared card used by every "hub" listing page: scenarios, modules, quizzes, admin.

import Link from 'next/link';
import "./HubCard.css";

interface HubCardProps {
	href: string;
	icon: React.ReactNode;
	title: string;
	desc: string;
	linkText: string;
	/** Shown below the description — e.g. "Showing default questions" when a page falls back to default content. */
	notice?: string;
	/** Admin-only edit tab, shown attached to the card's bottom edge. */
	editHref?: string;
	/** Renders a non-clickable card, e.g. a quiz whose modules aren't finished yet. */
	locked?: boolean;
	lockedReason?: string;
}

export default function HubCard({
	href,
	icon,
	title,
	desc,
	linkText,
	notice,
	editHref,
	locked = false,
	lockedReason,
}: HubCardProps) {
	const content = (
		<>
			<div className="hub-card-icon">{icon}</div>

			<div className="hub-card-body">
				<div className="hub-card-title">{title}</div>
				<div className="hub-card-desc">{desc}</div>
				{notice && <p className="defaults-notice">{notice}</p>}
			</div>

			<div className="hub-card-link">{linkText}</div>
		</>
	);

	const card = locked ? (
		<div className="hub-card hub-card-locked" title={lockedReason} aria-disabled="true">
			{content}
		</div>
	) : (
		<Link href={href} className="hub-card card-hover-tint">
			{content}
		</Link>
	);

	if (!editHref) {
		return card;
	}

	return (
		<div className="hub-card-wrap">
			{card}
			<Link href={editHref} className="hub-card-edit-tab">
				✏️ Edit
			</Link>
		</div>
	);
}