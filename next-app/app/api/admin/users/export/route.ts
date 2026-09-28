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
        // Only administrators can export quiz results.
        await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const organisation = searchParams.get("organisation");

        if (organisation !== "Fed Uni" && organisation !== "Other") {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Organisation must be Fed Uni or Other.",
                },
                { status: 400 }
            );
        }

        /*
         * Load profiles and their related quiz progress in one query.
         * The relationship is provided by:
         *
         * user_quiz_progress.uid
         *     -> profiles.uid
         */
        const { data: allProfiles, error: profilesError } =
            await supabaseServer
                .from("profiles")
                .select(`
                    uid,
                    student_id,
                    organisation,
                    user_type,
                    user_quiz_progress (
                        quiz_id,
                        score,
                        attempts,
                        passed,
                        last_attempted_at
                    )
                `);

        if (profilesError) {
            console.error(
                "EXPORT PROFILE/QUIZ QUERY ERROR:",
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

        // Keep all users belonging to the selected organisation.
        const profiles = (allProfiles ?? []).filter(
            (profile) =>
                profile.organisation?.trim() === organisation
        );

        // Create Excel workbook.
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

        for (const profile of profiles) {
            /*
             * A profile may have progress for different quizzes.
             * Select only the hydrogen hazards quiz.
             *
             * If the user has never attempted the quiz,
             * progress will be undefined and the profile will
             * still appear in the spreadsheet.
             */
            const progress = profile.user_quiz_progress?.find(
                (item) => item.quiz_id === QUIZ_ID
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

        // Make spreadsheet headings easier to read.
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
