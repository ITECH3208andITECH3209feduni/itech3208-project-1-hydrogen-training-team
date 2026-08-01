"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { modules } from "@/lib/modules";
import ModuleCard from "@/app/modules/components/ModuleCard";

export default function UserProgressPage() {
  const { uid } = useParams();

  return (
    <main className="main">
      {/* Header */}
      <div className="greeting">
        <h1>
          Training <span className="greeting-accent">Progress</span>
        </h1>

        <p>
          Viewing training record for user:
          <strong> {uid}</strong>
        </p>
      </div>

      {/* User Information */}
      <div className="panel">
        <div className="panel-header">
          User Information
        </div>

        <div className="panel-body">

          <p>
            <strong>Name:</strong> John Smith
          </p>

          <p>
            <strong>Email:</strong> john.smith@email.com
          </p>

          <p>
            <strong>Role:</strong> User
          </p>

          <p>
            <strong>Organisation:</strong> Federation University
          </p>

        </div>
      </div>

      <br />

      {/* Overall Progress */}
      <div className="panel">

        <div className="panel-header">
          Overall Progress
        </div>

        <div className="panel-body">

          <div className="progress-row">

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: "80%" }}
              />
            </div>

            <div className="progress-pct">
              80%
            </div>

          </div>

          <br />

          <strong>4 of 5 Modules Completed</strong>

        </div>

      </div>

      <br />

      {/* Training Modules */}
      <div className="page-header">
        <h2>Hydrogen Safety Modules</h2>
        <p>Administrator View (Read Only)</p>
      </div>

      <div className="modules-grid">
        {modules.map((module, index) => (
          <ModuleCard
            key={module.id}
            mod={module}
            animationDelay={index * 0.07}
            mode="admin"
          />
        ))}
      </div>

      <br />

      {/* Assessment Summary */}
      <div className="panel">

        <div className="panel-header">
          Assessment Summary
        </div>

        <div className="panel-body">

          <p>
            <strong>Quiz Average:</strong> 88%
          </p>

          <p>
            <strong>Certificate:</strong> Pending
          </p>

        </div>

      </div>

      <br />

      <Link
        href="/admin/users"
        className="edit-btn"
      >
        ← Back to Users
      </Link>

    </main>
  );
}