import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireUser } from "@/lib/authUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- GET ---------------- */

export async function GET(request: NextRequest) {
  try {
    const uid = await requireUser(request);

    const { data, error } = await supabaseServer
      .from("user_module_progress")
      .select("*")
      .eq("uid", uid)
      .order("module_id");

    if (error) {
  console.error("PATCH ERROR:", error);

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
      progress: data,
    });
  } catch (err) {
  console.error("PATCH EXCEPTION:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 401 }
    );
  }
}

/* ---------------- POST ---------------- */

export async function POST(request: NextRequest) {
  try {
    const uid = await requireUser(request);

    const body = await request.json();

    const { module_id } = body;

    if (!module_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "module_id is required",
        },
        { status: 400 }
      );
    }

    // Check whether a record already exists
    const { data: existing } = await supabaseServer
      .from("user_module_progress")
      .select("id")
      .eq("uid", uid)
      .eq("module_id", module_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "Progress already exists",
      });
    }

    const { error } = await supabaseServer
      .from("user_module_progress")
      .insert({
        uid,
        module_id,
        status: "progress",
        progress: 0,
        started_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
      });

    if (error) {
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
      message: "Progress created",
    });

  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 401 }
    );
  }
}
/* ---------------- PATCH ---------------- */

export async function PATCH(request: NextRequest) {
  try {
    const uid = await requireUser(request);

    const body = await request.json();
    const { module_id } = body;

    if (!module_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "module_id is required",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("user_module_progress")
      .update({
        status: "done",
        progress: 100,
        completed_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid)
      .eq("module_id", module_id);

    if (error) {
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
      message: "Module completed",
    });

  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 401 }
    );
  }
}