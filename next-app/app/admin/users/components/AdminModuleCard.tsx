// app/admin/users/components/AdminModuleCard.tsx
// Card for showing user's progress on a module.

import { ModuleData, ModuleStatus } from "@/lib/moduleTypes";
import "@/app/modules/components/ModuleCard.css";
import "../admin.css";

interface AdminProgress {
    uid?: string;
    module_id?: number | string;
    status?: string | null;
    progress?: number | null;
    time_spent?: number | string | null;
    started_at?: string | null;
    last_accessed?: string | null;
    completed_at?: string | null;
}

interface AdminModuleCardProps {
    item: ModuleData;
    animationDelay?: number;
    mode?: "student" | "admin";
    adminProgress?: AdminProgress;
}

const statusMeta: Record<
    ModuleStatus,
    {
        label: string;
        barClass: string;
        badgeClass: string;
        linkText: string;
    }
> = {
    done: {
        label: "✓ Completed",
        barClass: "bar-done",
        badgeClass: "badge-done",
        linkText: "View Module →",
    },

    progress: {
        label: "In Progress",
        barClass: "bar-progress",
        badgeClass: "badge-progress",
        linkText: "Continue →",
    },

    todo: {
        label: "Not Started",
        barClass: "bar-todo",
        badgeClass: "badge-todo",
        linkText: "Start Module →",
    },
};

function formatDate(
    date: string | null | undefined
): string {
    if (!date) {
        return "-";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatTimeSpent(
    value: number | string | null | undefined
): string {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    if (typeof value === "string") {
        return value;
    }

    return `${value} mins`;
}

export default function AdminModuleCard({
    item,
    animationDelay = 0,
    adminProgress,
}: AdminModuleCardProps) {
    const progressValue =
        adminProgress?.progress !== null &&
        adminProgress?.progress !== undefined
            ? Math.max(
                  0,
                  Math.min(
                      100,
                      Number(adminProgress.progress)
                  )
              )
            : 0;

    let displayStatus: ModuleStatus = "todo";

    if (
        adminProgress?.status === "done" ||
        progressValue >= 100
    ) {
        displayStatus = "done";
    } else if (
        adminProgress?.status === "progress" ||
        progressValue > 0
    ) {
        displayStatus = "progress";
    }

    const meta = statusMeta[displayStatus];

    const completedDate =
        displayStatus === "done"
            ? formatDate(adminProgress?.completed_at)
            : "-";

    const timeSpent = formatTimeSpent(
        adminProgress?.time_spent
    );

    return (
        <div
            className="module-card"
            style={{
                animationDelay: `${animationDelay}s`,
            }}
        >
            <div
                className={`card-top-bar ${meta.barClass}`}
            />

            {item.badgeNum !== undefined && (
                <div className="module-badge">
                    {item.badgeNum}
                </div>
            )}

            <div className="card-body">
                <div className="card-head">
                    <div
                        className="card-icon"
                        style={{
                            background: item.iconBg,
                        }}
                    >
                        {item.icon}
                    </div>
                    <span
                        className={`status-badge ${meta.badgeClass}`}
                    >
                        {meta.label}
                    </span>
                </div>

                <div className="card-title">
                    {item.title}
                </div>

                <div className="admin-module-info">
                    <p>
                        <strong>Status</strong>
                        <span>
                            {meta.label.replace("✓ ", "")}
                        </span>
                    </p>
                    <p>
                        <strong>Completed</strong>
                        <span>{completedDate}</span>
                    </p>
                    <p>
                        <strong>Time Spent</strong>
                        <span>{timeSpent}</span>
                    </p>
                </div>

                <div className="card-progress-bar">
                    <div
                        className="card-progress-fill"
                        style={{
                            width: `${progressValue}%`,
                            background:
                                displayStatus === "done"
                                    ? "#00E5A0"
                                    : "var(--teal)",
                        }}
                    />
                </div>

                <div className="card-meta">
                    <span>
                        {item.sections.length} sections
                    </span>
                    <span>{progressValue}%</span>
                </div>
            </div>
        </div>
    );
}
