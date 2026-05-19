"use client";

import { useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f7f9fc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px"
  },

  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "36px 32px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    border: "1px solid #eee"
  },

  logo: {
    textAlign: "center" as const,
    marginBottom: "28px"
  },

  logoIcon: {
    fontSize: "36px",
    display: "block",
    marginBottom: "8px"
  },

  logoTitle: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#1a1a2e",
    margin: 0
  },

  logoSub: {
    fontSize: "13px",
    color: "#888",
    margin: "4px 0 0"
  },

  heading: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1a1a2e",
    margin: "0 0 20px"
  },

  group: {
    marginBottom: "14px"
  },

  label: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#555",
    display: "block",
    marginBottom: "5px"
  },

  input: {
    width: "100%",
    height: "40px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    padding: "0 12px",
    fontSize: "14px",
    background: "#fafafa",
    boxSizing: "border-box" as const,
    outline: "none"
  },

  btn: {
    width: "100%",
    height: "42px",
    background: "#1a56db",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginTop: "6px"
  },

  error: {
    background: "#FCEBEB",
    border: "1px solid #F7C1C1",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#791F1F",
    marginBottom: "14px"
  },

  switch: {
    textAlign: "center" as const,
    fontSize: "13px",
    color: "#888",
    marginTop: "18px"
  },

  link: {
    color: "#1a56db",
    fontWeight: "500",
    textDecoration: "none"
  }
};

export default function RegisterPage() {

  const { register } = useAuth();

  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: ""
  });

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  function update(field: string) {

    return (
      e: React.ChangeEvent<HTMLInputElement>
    ) =>

      setForm((f) => ({
        ...f,
        [field]: e.target.value
      }));

  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {

    e.preventDefault();

    setError("");

    if (form.password !== form.confirm) {

      return setError(
        "Passwords do not match."
      );

    }

    if (form.password.length < 6) {

      return setError(
        "Password must be at least 6 characters."
      );

    }

    setLoading(true);

    try {

      await register(
        form.email,
        form.password,
        form.name
      );

      router.push("/");

    } catch (err: any) {

      setError(

        err.code ===
        "auth/email-already-in-use"

          ? "An account with this email already exists."

          : "Registration failed. Please try again."

      );

    }

    setLoading(false);

  }

  return (

    <div style={styles.page}>

      <div style={styles.card}>

        <div style={styles.logo}>

          <span style={styles.logoIcon}>
            ⚗️
          </span>

          <h1 style={styles.logoTitle}>
            Hydrogen Lab
          </h1>

          <p style={styles.logoSub}>
            Create your student account
          </p>

        </div>

        <h2 style={styles.heading}>
          Register
        </h2>

        {error && (

          <div style={styles.error}>
            {error}
          </div>

        )}

        <form onSubmit={handleSubmit}>

          <div style={styles.group}>

            <label style={styles.label}>
              Full name
            </label>

            <input
              style={styles.input}
              type="text"
              required
              value={form.name}
              onChange={update("name")}
            />

          </div>

          <div style={styles.group}>

            <label style={styles.label}>
              Email address
            </label>

            <input
              style={styles.input}
              type="email"
              required
              value={form.email}
              onChange={update("email")}
            />

          </div>

          <div style={styles.group}>

            <label style={styles.label}>
              Password
            </label>

            <input
              style={styles.input}
              type="password"
              required
              value={form.password}
              onChange={update("password")}
            />

          </div>

          <div style={styles.group}>

            <label style={styles.label}>
              Confirm password
            </label>

            <input
              style={styles.input}
              type="password"
              required
              value={form.confirm}
              onChange={update("confirm")}
            />

          </div>

          <button
            style={styles.btn}
            disabled={loading}
          >

            {loading
              ? "Creating account…"
              : "Create account"}

          </button>

        </form>

        <div style={styles.switch}>

          Already registered?{" "}

          <Link
            href="/login"
            style={styles.link}
          >
            Sign in
          </Link>

        </div>

      </div>

    </div>

  );

}