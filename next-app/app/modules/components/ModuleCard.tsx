// app/modules/components/ModuleCard.tsx
// Card displayed in the modules listing grid for each module

import Link from 'next/link';
import { ModuleData, ModuleStatus } from '@/lib/modules';
// @ts-ignore: CSS import declaration missing
import "./ModuleCard.css";

const statusMeta: Record<ModuleStatus, { label: string; barClass: string; badgeClass: string; linkText: string }> = {
	done:     { label: '✓ Completed', barClass: 'bar-done',     badgeClass: 'badge-done',     linkText: 'View Module →'  },
	progress: { label: 'In Progress', barClass: 'bar-progress', badgeClass: 'badge-progress', linkText: 'Continue →'     },
	todo:     { label: 'Not Started', barClass: 'bar-todo',     badgeClass: 'badge-todo',     linkText: 'Start Module →' },
};

interface ModuleCardProps {
	mod: ModuleData;
	animationDelay?: number;
	mode?: "student" | "admin";
}

export default function ModuleCard({
	mod,
	animationDelay = 0,
	mode = "student",
}: ModuleCardProps) {
	const meta = statusMeta[mod.status];
	const adminData = {
  completedDate: "12 Jul 2026",
  quizScore: 88,
  attempts: 1,
  timeSpent: "42 mins",
  lastAccessed: "Yesterday",
};

	const cardContent = (
	<>
		<div className={`card-top-bar ${meta.barClass}`} />

		<div className="hazard-badge">
			{mod.hazardNum}
		</div>

		<div className="card-body">

			<div className="card-head">

				<div
					className="card-icon"
					style={{ background: mod.iconBg }}
				>
					{mod.icon}
				</div>

				<span
					className={`status-badge ${meta.badgeClass}`}
				>
					{meta.label}
				</span>

			</div>

			<div className="card-title">
				{mod.title}
			</div>

			{mode === "student" ? (

  <div className="card-desc">
    {mod.description}
  </div>

) : (

  <div className="admin-module-info">

    <p>
      <strong>Status</strong>
      <span>{meta.label.replace("✓ ", "")}</span>
    </p>

    <p>
      <strong>Completed</strong>
      <span>
        {mod.status === "done"
          ? adminData.completedDate
          : "-"}
      </span>
    </p>

    <p>
      <strong>Quiz Score:</strong>
      <span>
        {mod.status === "done"
          ? `${adminData.quizScore}%`
          : "-"}
      </span>
    </p>

    <p>
      <strong>Attempts:</strong>{" "}
      <span>
        {mod.status !== "todo"
          ? adminData.attempts
          : "-"}
      </span>
    </p>

    <p>
      <strong>Time Spent:</strong>{" "}
      <span>
        {mod.status !== "todo"
          ? adminData.timeSpent
          : "-"}
      </span>
    </p>

  </div>

)}

			<div className="card-progress-bar">

				<div
					className="card-progress-fill"
					style={{
						width: `${mod.progress}%`,
						background:
							mod.status === "done"
								? "#00E5A0"
								: "var(--teal)",
					}}
				/>

			</div>

			<div className="card-meta">
				<span>{mod.sections.length} sections</span>
				<span>{mod.progress}%</span>
			</div>

		</div>

		{mode === "student" && (
			<div className="card-link">
				{meta.linkText}
			</div>
		)}
	</>
);

return mode === "admin" ? (
	<div
		className="module-card"
		style={{ animationDelay: `${animationDelay}s` }}
	>
		{cardContent}
	</div>
) : (
	<Link
		href={`/modules/${mod.id}`}
		className="module-card"
		style={{ animationDelay: `${animationDelay}s` }}
	>
		{cardContent}
	</Link>
);
}
