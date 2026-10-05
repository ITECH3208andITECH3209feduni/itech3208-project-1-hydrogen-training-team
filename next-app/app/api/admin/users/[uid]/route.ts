// app/api/admin/users/[uid]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/firebase/adminAuth";
import { adminAuth } from "@/lib/firebase/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Verify the requester is an authenticated admin
    await requireAdmin(req);

    const { uid } = await params;

    const body = await req.json();
    const { role, user_type, organisation } = body;

    const { data, error } = await supabaseServer
      .from("profiles")
      .update({
        role,
        user_type,
        organisation,
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid)
      .select()
      .single();

    if (error) {
      console.error("SUPABASE UPDATE ERROR:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      profile: data,
    });
  } catch (error) {
    console.error("UPDATE USER FAILED:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    const status =
      message === "Access denied" ||
      message === "Missing authorization token" ||
      message === "User profile not found"
        ? 403
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // Verify the requester is an authenticated admin
    const admin = await requireAdmin(req);

    const { uid } = await params;

    // Prevent an admin from deleting their own account
    if (admin.uid === uid) {
      return NextResponse.json(
        {
          ok: false,
          error: "You cannot delete your own admin account.",
        },
        { status: 400 }
      );
    }

    // Make sure the user exists before deleting anything
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("uid, email")
      .eq("uid", uid)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          ok: false,
          error: "User profile not found.",
        },
        { status: 404 }
      );
    }

    // Delete quiz progress
    const { error: quizProgressError } = await supabaseServer
      .from("user_quiz_progress")
      .delete()
      .eq("uid", uid);

    if (quizProgressError) {
      throw new Error(
        `Failed to delete quiz progress: ${quizProgressError.message}`
      );
    }

    // Delete hazard/lab progress
    const { error: hazardProgressError } = await supabaseServer
      .from("user_lab_progress")
      .delete()
      .eq("uid", uid);

    if (hazardProgressError) {
      throw new Error(
        `Failed to delete lab progress: ${hazardProgressError.message}`
      );
    }

    // Delete the Supabase profile.
    // user_module_progress is removed automatically by ON DELETE CASCADE.
    const { error: profileDeleteError } = await supabaseServer
      .from("profiles")
      .delete()
      .eq("uid", uid);

    if (profileDeleteError) {
      throw new Error(
        `Failed to delete user profile: ${profileDeleteError.message}`
      );
    }

    // Finally remove the Firebase Authentication account
    await adminAuth.deleteUser(uid);

    return NextResponse.json({
      ok: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE USER FAILED:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    const status =
      message === "Access denied" ||
      message === "Missing authorization token" ||
      message === "User profile not found"
        ? 403
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}
