import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function requireUser(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token");
  }

  const token = authHeader.replace("Bearer ", "");

  const decoded = await adminAuth.verifyIdToken(token);

  return decoded.uid;
}