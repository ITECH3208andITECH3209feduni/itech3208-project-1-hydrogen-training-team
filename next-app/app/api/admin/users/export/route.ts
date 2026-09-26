// app/api/admin/users/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/firebase/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUIZ_ID = "hydrogen-hazards";

export async function GET(request: NextRequest) {
    try {
        // Only administrators can export quiz results
        await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const organisation = searchParams.get("organisation");

        // The user story limits organisation to these two values
        if (organisation !== "Fed Uni" && organisation !== "Other") {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Organisation must be Fed Uni or Other.",
                },
                { status: 400 }
            );
        }

        // Load profiles and select users for the chosen organisation.
        const { data: allProfiles, error: profilesError } =
            await supabaseServer
                .from("profiles")
                .select("uid, student_id, organisation, user_type");

        if (profilesError) {
            console.error(
                "EXPORT PROFILES ERROR:",
                profilesError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: profilesError.message,
                },
                { status: 500 }
            );
        }

        const profiles = (allProfiles ?? []).filter(
            (profile) =>
                profile.organisation?.trim() === organisation &&
                profile.user_type === "public"
        );

        const userIds = profiles.map(
            (profile) => profile.uid
        );

        let quizProgress: {
            uid: string;
            score: number | null;
            attempts: number | null;
            passed: boolean | null;
            last_attempted_at: string | null;
        }[] = [];

        if (userIds.length > 0) {
            const { data, error } = await supabaseServer
                .from("user_quiz_progress")
                .select(
                    "uid, quiz_id, score, attempts, passed, last_attempted_at"
                )
                .in("uid", userIds);

            if (error) {
                console.error(
                    "EXPORT QUIZ PROGRESS ERROR:",
                    error
                );

                return NextResponse.json(
                    {
                        ok: false,
                        error: error.message,
                    },
                    { status: 500 }
                );
            }

            quizProgress = (data ?? [])
                .filter((item) => item.quiz_id === QUIZ_ID)
                .map((item) => ({
                    uid: item.uid,
                    score: item.score,
                    attempts: item.attempts,
                    passed: item.passed,
                    last_attempted_at: item.last_attempted_at,
                }));
        }
        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Quiz Results");

        worksheet.columns = [
            {
                header: "Student ID",
                key: "studentId",
                width: 20,
            },
            {
                header: "Score",
                key: "score",
                width: 12,
            },
            {
                header: "Attempts",
                key: "attempts",
                width: 12,
            },
            {
                header: "Passed",
                key: "passed",
                width: 12,
            },
            {
                header: "Last Attempted At",
                key: "lastAttemptedAt",
                width: 24,
            },
        ];

        for (const profile of profiles ?? []) {
            const progress = quizProgress.find(
                (item) => item.uid === profile.uid
            );

            worksheet.addRow({
                studentId: profile.student_id ?? "",
                score: progress?.score ?? "",
                attempts: progress?.attempts ?? 0,
                passed:
                    progress?.passed === true
                        ? "Yes"
                        : progress?.passed === false
                            ? "No"
                            : "",
                lastAttemptedAt:
                    progress?.last_attempted_at
                        ? new Date(
                            progress.last_attempted_at
                        ).toLocaleString("en-AU")
                        : "",
            });
        }

        // Make spreadsheet headings easier to read
        worksheet.getRow(1).font = {
            bold: true,
        };

        worksheet.views = [
            {
                state: "frozen",
                ySplit: 1,
            },
        ];

        const buffer = await workbook.xlsx.writeBuffer();

        const safeOrganisation =
            organisation === "Fed Uni"
                ? "Fed-Uni"
                : "Other";

        const fileName =
            `hydrogen-quiz-results-${safeOrganisation}.xlsx`;

        return new NextResponse(buffer as BodyInit, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition":
                    `attachment; filename="${fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error(
            "ADMIN QUIZ EXPORT FAILED:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "Internal server error.";

        const status =
            message === "Access denied"
            || message === "Missing authorization token"
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


