// app/api/admin/users/[uid]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

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