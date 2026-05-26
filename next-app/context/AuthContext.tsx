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
  signOut
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
    password: string
  ) {

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

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