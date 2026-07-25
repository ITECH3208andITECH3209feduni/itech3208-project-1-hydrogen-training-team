"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";

import { auth } from "../lib/firebase";

type AuthContextType = {
  user: User | null;

  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    email: string,
    password: string,
    name?: string
  ) => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          setUser(currentUser);

          setLoading(false);

        }
      );

    return () => unsubscribe();

  }, []);

  async function login(
    email: string,
    password: string
  ) {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  }

  async function register(
    email: string,
    password: string,
    name?: string
  ) {

    // Create Firebase account
    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    // Update display name (optional)
    if (name) {

      await updateProfile(
        userCredential.user,
        {
          displayName: name
        }
      );

    }

    // Create profile in Supabase
    const response = await fetch(
      "/api/profile/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {

      throw new Error(
        result.error || "Failed to create user profile."
      );

    }

  }

  async function logout() {

    await signOut(auth);

  }

  return (

    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}

export function useAuth() {

  const context =
    useContext(AuthContext);

  if (!context) {

    throw new Error(
      "useAuth must be used inside AuthProvider"
    );

  }

  return context;

}