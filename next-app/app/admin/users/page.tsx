// app/admin/users

"use client";
// TypeScript may not have declarations for importing plain CSS here. Suppress the error.
// @ts-ignore: Implicit any for CSS import
import "./admin.css";
import React, { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EditUserModal from "@/app/admin/users/components/EditUserModal";
import Link from "next/link";
type UserProfile = {
  uid: string;
  display_name: string | null;
  email: string;
  role: string;
  user_type: string;
  organisation: string | null;
};

export default function AdminUsersPage() {
  const { loading, profile, isAdmin } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

const [completedTraining, setCompletedTraining] =
  useState(0);

const [averageProgress, setAverageProgress] =
  useState(0);

  const [selectedUser, setSelectedUser] =
    useState<UserProfile | null>(null);

  const [showModal, setShowModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!profile || !isAdmin) {
        router.replace("/dashboard");
        return;
      }

      loadUsers();
    }
  }, [loading, profile, isAdmin, router]);

  async function loadUsers() {
    try {
      setLoadingUsers(true);

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Not authenticated");
      }

      const idToken = await user.getIdToken();

      const res = await fetch("/api/admin/users", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();

      if (data.ok) {
        const loadedUsers: UserProfile[] = data.users;

    setUsers(loadedUsers);

    const learners = loadedUsers.filter(
      (user) =>
        user.role !== "admin" &&
        user.user_type === "public"
    );

    const progressResults = await Promise.all(
      learners.map(async (learner) => {
        try {
          const progressResponse = await fetch(
            `/api/admin/users/${learner.uid}/progress`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            }
          );

          if (!progressResponse.ok) {
            return null;
          }

          const progressData =
            await progressResponse.json();

          if (
            !progressData.ok ||
            !progressData.summary
          ) {
            return null;
          }

          return progressData.summary;
        } catch (error) {
          console.error(
            `Failed to load progress for ${learner.uid}:`,
            error
          );

          return null;
        }
      })
    );

    const validProgressResults =
      progressResults.filter(
        (result) => result !== null
      );

    const completedCount =
      validProgressResults.filter(
        (result) =>
          result.completedModules >= 5
      ).length;

    const average =
      validProgressResults.length > 0
        ? Math.round(
            validProgressResults.reduce(
              (total, result) =>
                total +
                Number(result.overallProgress),
              0
            ) /
              validProgressResults.length
          )
        : 0;

    setCompletedTraining(completedCount);
    setAverageProgress(average);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Unable to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  function openModal(user: UserProfile) {
    setSelectedUser(user);
    setShowModal(true);
  }

  function handleUserUpdated(updatedUser: UserProfile) {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.uid === updatedUser.uid
          ? updatedUser
          : user
      )
    );

    setSelectedUser(updatedUser);
  }

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return users.filter((user) => {
      return (
        user.email.toLowerCase().includes(term) ||
        (user.display_name ?? "")
          .toLowerCase()
          .includes(term) ||
        (user.organisation ?? "")
          .toLowerCase()
          .includes(term) ||
        user.role.toLowerCase().includes(term) ||
        user.user_type.toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm]);

  const totalUsers = users.length;

const adminCount = users.filter(
  (u) => u.role === "admin"
).length;

// Temporary values until module progress is implemented


  if (loading) return <p>Loading...</p>;

  if (!profile || !isAdmin) return null;

  return (
    <main className="main">

      <div className="greeting">

        <div>

          <h1>
            Access{" "}
            <span className="greeting-accent">
              Management
            </span>
          </h1>

          <p>
            Welcome back,{" "}
            <strong>{profile.email}</strong>
          </p>

        </div>

        <button
          className="refresh-btn"
          onClick={loadUsers}
        >
          Refresh
        </button>
        </div>

<div className="admin-stat-cards">

  <div className="stat-card users-card">
  <div className="stat-info">
    <div className="label">
      <span className="label-icon">Users</span>
    </div>

    <div className="count">
      {totalUsers}
    </div>

    <div className="sub">
      Registered Accounts
    </div>
  </div>
</div>
        <div className="stat-card admin-card">
  <div className="stat-info">

    <div className="label">
      <span className="label-icon">Administrators</span>
    </div>

    <div className="count">
      {adminCount}
    </div>

    <div className="sub">
      System Administrators
    </div>

  </div>
</div>
        <div className="stat-card completed-card">
  <div className="stat-info">

    <div className="label">
      <span className="label-icon">Training Completed</span>
    </div>

    <div className="count">
      {completedTraining}
    </div>

    <div className="sub">
      Learners Completed
    </div>

  </div>
</div>

        <div className="stat-card progress-card">
          <div className="stat-info">

            <div className="label">
              <span className="label-icon">Average Progress</span>
            </div>

            <div className="count">
              {averageProgress}%
            </div>

            <div className="sub">
              Across All Learners
            </div>

          </div>
        </div>

      </div>

      <div className="admin-toolbar">

        <input
          className="admin-search"
          type="text"
          placeholder="Search by email, name, organisation, role..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />

        <div className="user-count">
          {filteredUsers.length} of {totalUsers} users
        </div>

      </div>

      {loadingUsers ? (
        <p>Loading users...</p>
      ) : (
        <div className="admin-panel">

          <table className="admin-table">

            <thead>

              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Role</th>
                <th>User Type</th>
                <th>Organisation</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredUsers.length === 0 ? (

                <tr>
                  <td colSpan={6} className="no-results">
                    No users match your search.
                  </td>
                </tr>

              ) : (

                filteredUsers.map((user) => (

                  <tr key={user.uid}>

                    <td>{user.email}</td>

                    <td>
                      {user.display_name ?? "-"}
                    </td>

                    <td>
                      <span
                        className={`role-badge role-${user.role}`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td>

                      <span
                        className={`user-type-badge user-type-${user.user_type}`}
                      >
                        {user.user_type}
                      </span>

                    </td>

                    <td>
                      {user.organisation ?? "-"}
                    </td>

                    <td className="action-buttons">

  <button
    className="edit-btn"
    onClick={() => openModal(user)}
  >
    Edit
  </button>

  <Link
    href={`/admin/users/${user.uid}/progress`}
    className="progress-btn"
  >
    Progress
  </Link>

</td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      )}
            <EditUserModal
        open={showModal}
        user={selectedUser}
        onClose={() => setShowModal(false)}
        onSaved={handleUserUpdated}
      />

    </main>
    
  );
}

