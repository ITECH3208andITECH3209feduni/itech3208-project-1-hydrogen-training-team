// app/api/modules/progress/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireUser } from "@/lib/authUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- GET ---------------- */

export async function GET(request: NextRequest) {
	try {
		const uid = await requireUser(request);

		const section = request.nextUrl.searchParams.get("section");

		let query = supabaseServer
			.from("user_module_progress")
			.select("*")
			.eq("uid", uid);

		// Scope to a section when provided — both current callers (useModules,
		// useModuleProgress) always know their own section and should pass it,
		// to avoid two sections' progress for the same module_id colliding.
		if (section) {
			query = query.eq("section", section);
		}

		const { data, error } = await query.order("module_id");

		if (error) {
			console.error("GET progress error:", error);

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
		console.error("GET progress exception:", err);

		return NextResponse.json(
			{
				ok: false,
				error:
					err instanceof Error
						? err.message
						: String(err),
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
		const { module_id, section } = body;

		if (!module_id) {
			return NextResponse.json(
				{
					ok: false,
					error: "module_id is required",
				},
				{ status: 400 }
			);
		}

		if (!section) {
			return NextResponse.json(
				{
					ok: false,
					error: "section is required",
				},
				{ status: 400 }
			);
		}

		// Check whether progress already exists
		const { data: existing, error: existingError } = await supabaseServer
			.from("user_module_progress")
			.select("id")
			.eq("uid", uid)
			.eq("section", section)
			.eq("module_id", module_id)
			.maybeSingle();

		if (existingError) {
			return NextResponse.json(
				{
					ok: false,
					error: existingError.message,
				},
				{ status: 500 }
			);
		}

		// Do not create duplicate progress records
		if (existing) {
			return NextResponse.json({
				ok: true,
				message: "Progress already exists",
			});
		}

		const now = new Date().toISOString();

		const { error } = await supabaseServer
			.from("user_module_progress")
			.insert({
				uid,
				section,
                module_id,
				status: "progress",
				progress: 0,
				attempts: 1,
				started_at: now,
				last_accessed: now,
			});

		if (error) {
			console.error("POST progress error:", error);

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
		console.error("POST progress exception:", err);

		return NextResponse.json(
			{
				ok: false,
				error:
					err instanceof Error
						? err.message
						: String(err),
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

		const {
			module_id,
			section,
			progress,
			status,
			attempts,
			time_spent,
            action,
		} = body;

		if (!module_id) {
			return NextResponse.json(
				{
					ok: false,
					error: "module_id is required",
				},
				{ status: 400 }
			);
		}

		if (!section) {
			return NextResponse.json(
				{
					ok: false,
					error: "section is required",
				},
				{ status: 400 }
			);
		}

		// -------------------------------------------------
        // Explicit module restart
        // -------------------------------------------------

        if (action === "restart") {
            const {
                data: existing,
                error: existingError,
            } = await supabaseServer
            	.from("user_module_progress")
            	.select("id, attempts, progress, status")
            	.eq("uid", uid)
				.eq("section", section)
            	.eq("module_id", module_id)
            	.maybeSingle();

            if (existingError) {
                console.error("Restart lookup error:", existingError);

                return NextResponse.json(
                    {
                        ok: false,
                        error: existingError.message,
                    },
                    { status: 500 }
                );
            }

            if (!existing) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Module progress record does not exist.",
                    },
                    { status: 404 }
                );
            }

            const currentAttempts = Number(existing.attempts ?? 0);

            const nextAttempts = Number.isFinite(currentAttempts)
				? Math.max(1, currentAttempts + 1) : 1;

            const now = new Date().toISOString();

            const {
                data,
                error,
            } = await supabaseServer
            	.from("user_module_progress")
            	.update({
					progress: 0,
					status: "progress",
					attempts: nextAttempts,
					completed_at: null,
					time_spent: 0,
					started_at: now,
					last_accessed: now,
            	})
            	.eq("uid", uid)
				.eq("section", section)
            	.eq("module_id", module_id)
            	.select()
            	.single();

            if (error) {
                console.error(
                    "Restart module error:",
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

            return NextResponse.json({
                ok: true,
                message: "Module restarted successfully",
                progress: data,
            });
        }

		// Build only the fields that were supplied
		const updateData: Record<string, unknown> = {
			last_accessed: new Date().toISOString(),
		};

		// Update learning progress
		if (progress !== undefined) {
			const numericProgress = Number(progress);

			if (
				Number.isNaN(numericProgress) ||
				numericProgress < 0 ||
				numericProgress > 100
			) {
				return NextResponse.json(
					{
						ok: false,
						error: "progress must be between 0 and 100",
					},
					{ status: 400 }
				);
			}

			updateData.progress = numericProgress;

			// Automatically determine status from progress
			if (numericProgress >= 100) {
				updateData.status = "done";
				updateData.completed_at = new Date().toISOString();
			} else if (numericProgress > 0) {
				updateData.status = "progress";
			}
		}

		// Allow an explicit status when supplied
		if (status !== undefined) {
			if (!["done", "progress", "todo"].includes(status)) {
				return NextResponse.json(
					{
						ok: false,
						error: "Invalid status",
					},
					{ status: 400 }
				);
			}

			updateData.status = status;

			if (status === "done") {
				updateData.progress = 100;
				updateData.completed_at = new Date().toISOString();
			}
		}

		// Update attempts
		if (attempts !== undefined) {
			const attemptCount = Number(attempts);

			if (Number.isNaN(attemptCount) || attemptCount < 0) {
				return NextResponse.json(
					{
						ok: false,
						error: "attempts must be a positive number",
					},
					{ status: 400 }
				);
			}

			updateData.attempts = attemptCount;
		}

		// Update time spent
		if (time_spent !== undefined) {
			const time = Number(time_spent);

			if (Number.isNaN(time) || time < 0) {
				return NextResponse.json(
					{
						ok: false,
						error: "time_spent must be a positive number",
					},
					{ status: 400 }
				);
			}

			updateData.time_spent = time;
		}

		const { data, error } = await supabaseServer
			.from("user_module_progress")
			.update(updateData)
			.eq("uid", uid)
			.eq("section", section)
			.eq("module_id", module_id)
			.select()
			.single();

		if (error) {
			console.error("PATCH progress error:", error);

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
			message: "Progress updated",
			progress: data,
		});
	} catch (err) {
		console.error("PATCH progress exception:", err);

		return NextResponse.json(
			{
				ok: false,
				error: err instanceof Error
					? err.message : String(err),
			},
			{ status: 401 }
		);
	}
}


