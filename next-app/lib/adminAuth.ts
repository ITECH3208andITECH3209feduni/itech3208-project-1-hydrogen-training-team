import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";
import { supabaseServer } from "./supabase";

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token");
  }

  const idToken = authHeader.substring(7);

  // Verify the Firebase ID token
  const decodedToken = await adminAuth.verifyIdToken(idToken);

  // Look up the user's role in Supabase
  const { data: profile, error } = await supabaseServer
    .from("profiles")
    .select("uid, role")
    .eq("uid", decodedToken.uid)
    .single();

  if (error || !profile) {
    throw new Error("User profile not found");
  }

  if (profile.role !== "admin") {
    throw new Error("Access denied");
  }

  return {
    uid: decodedToken.uid,
    profile,
  };
}