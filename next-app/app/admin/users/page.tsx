"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EditUserModal from "@/components/admin/EditUserModal";

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

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!profile || !isAdmin) {
        router.replace("/");
        return;
      }

      loadUsers();
    }
  }, [loading, profile, isAdmin, router]);

  async function loadUsers() {
  try {
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
      setUsers(data.users);
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error(err);
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
        user.uid === updatedUser.uid ? updatedUser : user
      )
    );

    setSelectedUser(updatedUser);
  }

  if (loading) return <p>Loading...</p>;

  if (!profile || !isAdmin) return null;

  return (
    <main className="main">
      <div className="greeting">
        <h1>
          Access <span className="greeting-accent">Management</span>
        </h1>

        <p>
          Welcome, <strong>{profile.email}</strong>
        </p>
      </div>

      {loadingUsers ? (
        <p>Loading users...</p>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>User Type</th>
                <th>Organisation</th>
                <th>Display Name</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.uid}>
                  <td>{user.email}</td>

                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>

                  <td>{user.user_type}</td>

                  <td>{user.organisation ?? "-"}</td>

                  <td>{user.display_name ?? "-"}</td>

                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => openModal(user)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
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