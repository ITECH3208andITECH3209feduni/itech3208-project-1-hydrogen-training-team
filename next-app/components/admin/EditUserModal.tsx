"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

type UserProfile = {
  uid: string;
  display_name: string | null;
  email: string;
  role: string;
  user_type: string;
  organisation: string | null;
};

type Props = {
  open: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onSaved: (updatedUser: UserProfile) => void;
};

export default function EditUserModal({
  open,
  user,
  onClose,
  onSaved,
}: Props) {
  const [role, setRole] = useState("");
  const [userType, setUserType] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setUserType(user.user_type);
      setOrganisation(user.organisation ?? "");
    }
  }, [user]);

  if (!open || !user) return null;

  async function saveChanges() {
  if (!user) return;

  setSaving(true);

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const idToken = await currentUser.getIdToken();

    const res = await fetch(`/api/admin/users/${user.uid}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        role,
        user_type: userType,
        organisation,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.error);
      return;
    }

    alert("User updated successfully.");

    onSaved(data.profile);

    onClose();
  } catch (err) {
    console.error(err);
    alert("Something went wrong.");
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Edit User</h2>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Email</label>
            <input value={user.email} disabled />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>User Type</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
            >
              <option value="public">Public</option>
              <option value="student">Student</option>
              <option value="lecturer">Lecturer</option>
              <option value="researcher">Researcher</option>
              <option value="industry_professional">
                Industry Professional
              </option>
            </select>
          </div>

          <div className="form-group">
            <label>Organisation</label>
            <input
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className="save-btn"
            onClick={saveChanges}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}