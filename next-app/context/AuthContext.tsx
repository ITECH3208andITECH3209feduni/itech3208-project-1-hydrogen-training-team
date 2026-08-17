"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "../lib/firebase";

/* ============================================
   User Profile Type
============================================ */

type UserProfile = {
  uid: string;
  email: string;
  display_name: string | null;
  role: "user" | "staff" | "admin";
  user_type:
    | "student"
    | "lecturer"
    | "researcher"
    | "industry_professional"
    | "public";
  organisation?: string | null;
};

/* ============================================
   Permissions Type
============================================ */

type Permissions = {
  canAccessModules: boolean;
  canUseSimulation: boolean;
  canViewReports: boolean;

  canEditContent: boolean;
  canManageScenarios: boolean;

  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canViewAuditLogs: boolean;
};

/* ============================================
   Registration Data
============================================ */

type RegisterData = {
  email: string;
  password: string;
  name: string;
  organisation?: string;
  role: "user";
  user_type: "public";
};

/* ============================================
   Context Type
============================================ */

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;

  isAdmin: boolean;
  isStaff: boolean;

  permissions: Permissions;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    data: RegisterData
  ) => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

/* ============================================
   Provider
============================================ */

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  /* ============================================
     Role Hierarchy
  ============================================ */

  const role = profile?.role;

  const isLoggedIn = !!user;

  const isAdmin =
    role === "admin";

  const isStaff =
    role === "staff" ||
    role === "admin";

  /* ============================================
     Permissions
  ============================================ */

  const permissions: Permissions = {
    canAccessModules: isLoggedIn,
    canUseSimulation: isLoggedIn,
    canViewReports: isLoggedIn,

    canEditContent: isStaff,
    canManageScenarios: isStaff,

    canManageUsers: isAdmin,
    canViewAnalytics: isAdmin,
    canViewAuditLogs: isAdmin,
  };

  /* ============================================
     Authentication Listener
  ============================================ */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          try {
            let response = await fetch(
              `/api/profile/get?uid=${currentUser.uid}`
            );

            let result = await response.json();

            if (!result.ok) {
              console.log(
                "Profile not found. Creating..."
              );

              const createResponse =
                await fetch(
                  "/api/profile/create",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body: JSON.stringify({
                      uid: currentUser.uid,
                      email:
                        currentUser.email,
                      display_name:
                        currentUser.displayName,
                      organisation: null,
                      role: "user",
                      user_type: "public",
                    }),
                  }
                );

              const createResult =
                await createResponse.json();

              if (!createResult.ok) {
                throw new Error(
                  createResult.error
                );
              }

              response = await fetch(
                `/api/profile/get?uid=${currentUser.uid}`
              );

              result =
                await response.json();
            }

            if (result.ok) {
              setProfile(result.profile);
            } else {
              setProfile(null);
            }
          } catch (error) {
            console.error(
              "Profile loading failed:",
              error
            );

            setProfile(null);
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* ============================================
     Login
  ============================================ */

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

  /* ============================================
     Register
  ============================================ */

  async function register({
    email,
    password,
    name,
    organisation,
    role,
    user_type,
  }: RegisterData) {
    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    // Save Firebase display name
    await updateProfile(
      userCredential.user,
      {
        displayName: name,
      }
    );

    // Create profile in database
    const response = await fetch(
      "/api/profile/create",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email:
            userCredential.user.email,
          display_name: name,
          organisation,
          role,
          user_type,
        }),
      }
    );

    const result =
      await response.json();

    if (!result.ok) {
      throw new Error(
        result.error ??
          "Failed to create user profile."
      );
    }

    setProfile(result.profile);
  }

  /* ============================================
     Logout
  ============================================ */

  async function logout() {
    await signOut(auth);

    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,

        isAdmin,
        isStaff,

        permissions,

        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ============================================
   Hook
============================================ */

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