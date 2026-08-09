import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { modules } from "@/lib/modules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify the requester is an authenticated admin
    await requireAdmin(request);

    // ---------------------------------------------------------
    // Get all user profiles
    // ---------------------------------------------------------

    const { data: users, error: usersError } =
      await supabaseServer
        .from("profiles")
        .select("*")
        .order("email");

    if (usersError) {
      console.error(
        "SUPABASE USERS ERROR:",
        usersError
      );

      return NextResponse.json(
        {
          ok: false,
          error: usersError.message,
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // Get all module progress records
    // ---------------------------------------------------------

    const {
      data: moduleProgress,
      error: progressError,
    } = await supabaseServer
      .from("user_module_progress")
      .select(
        "uid, module_id, progress, status"
      );

    if (progressError) {
      console.error(
        "SUPABASE MODULE PROGRESS ERROR:",
        progressError
      );

      return NextResponse.json(
        {
          ok: false,
          error: progressError.message,
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // Get learners only
    // ---------------------------------------------------------

    const learners = (users ?? []).filter(
      (user) =>
        user.user_type === "public"
    );

    const totalModules = modules.length;

    // ---------------------------------------------------------
    // Calculate progress for each learner
    // ---------------------------------------------------------

    const learnerProgress =
      learners.map((learner) => {
        const learnerRecords =
          (moduleProgress ?? []).filter(
            (record) =>
              record.uid === learner.uid
          );

        const modulePercentages =
          modules.map((module) => {
            const record =
              learnerRecords.find(
                (item) =>
                  String(
                    item.module_id
                  ) ===
                  String(module.id)
              );

            if (!record) {
              return 0;
            }

            return Math.max(
              0,
              Math.min(
                100,
                Number(
                  record.progress ?? 0
                )
              )
            );
          });

        const totalProgress =
          modulePercentages.reduce(
            (sum, value) =>
              sum + value,
            0
          );

        const overallProgress =
          totalModules > 0
            ? Math.round(
                totalProgress /
                  totalModules
              )
            : 0;

        const completedModules =
          modulePercentages.filter(
            (value) =>
              value >= 100
          ).length;

        const trainingCompleted =
          completedModules >=
          totalModules;

        return {
          uid: learner.uid,
          overallProgress,
          completedModules,
          trainingCompleted,
        };
      });

    // ---------------------------------------------------------
    // Dashboard statistics
    // ---------------------------------------------------------

    const trainingCompleted =
      learnerProgress.filter(
        (learner) =>
          learner.trainingCompleted
      ).length;

    const averageProgress =
      learnerProgress.length > 0
        ? Math.round(
            learnerProgress.reduce(
              (sum, learner) =>
                sum +
                learner.overallProgress,
              0
            ) /
              learnerProgress.length
          )
        : 0;

    // ---------------------------------------------------------
    // Return users + statistics
    // ---------------------------------------------------------

    return NextResponse.json({
      ok: true,

      users: users ?? [],

      statistics: {
        totalUsers:
          users?.length ?? 0,

        administrators:
          (users ?? []).filter(
            (user) =>
              user.role === "admin"
          ).length,

        learners:
          learners.length,

        trainingCompleted,

        averageProgress,

        totalModules,
      },
    });
  } catch (err) {
    console.error(
      "ADMIN USERS API FAILED:",
      err
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : String(err),
      },
      { status: 500 }
    );
  }
}