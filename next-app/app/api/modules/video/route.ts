// app/api/modules/video/route.ts
// Admin-only API for adding, replacing and removing videos from the Hydrogen Safety Modules.
// IMPORTANT: Modules are identified by BOTH section and id. This prevents two modules with different sections but the same id from being confused with each other.
// Shares logic with app/api/modules/video/route.ts via lib/video.ts.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/firebase/adminAuth";
import { getYouTubeVideoId, getStoragePath, validateMp4File, safeFileName } from "@/lib/video/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SECTION = "hazard-modules";
const VIDEO_BUCKET = "module-videos";

// PUT
export async function PUT(request: NextRequest) {
    try {
        await requireAdmin(request);

        const formData = await request.formData();
        const moduleId = String(formData.get("moduleId") ?? "").trim();
        const section = String(formData.get("section") ?? "").trim();
        const videoType = String(formData.get("videoType") ?? "").trim();

        if (!moduleId) {
            return NextResponse.json({ ok: false, error: "Module ID is required." }, { status: 400 });
        }
        if (section !== ALLOWED_SECTION) {
            return NextResponse.json({ ok: false, error: "Invalid module section." }, { status: 400 });
        }
        if (videoType !== "youtube" && videoType !== "mp4") {
            return NextResponse.json({ ok: false, error: "Video type must be youtube or mp4." }, { status: 400 });
        }

        const { data: module, error: moduleError } = await supabaseServer
            .from("modules")
            .select("id, section, title, video_url, video_type")
            .eq("section", section)
            .eq("id", moduleId)
            .single();

        if (moduleError || !module) {
            return NextResponse.json(
                { ok: false, error: moduleError?.message || "Module not found." },
                { status: 404 }
            );
        }

        // Yotube Link
        if (videoType === "youtube") {
            const videoUrl = String(formData.get("videoUrl") ?? "").trim();
            const videoId = getYouTubeVideoId(videoUrl);

            if (!videoId) {
                return NextResponse.json({ ok: false, error: "Please enter a valid YouTube URL." }, { status: 400 });
            }

            const { data, error } = await supabaseServer
                .from("modules")
                .update({ video_url: videoUrl, video_type: "youtube" })
                .eq("section", section)
                .eq("id", moduleId)
                .select("id, section, title, video_url, video_type")
                .single();

            if (error) {
                console.error("YOUTUBE VIDEO UPDATE ERROR:", error);
                return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
            }

            if (module.video_type === "mp4" && module.video_url) {
                const oldPath = getStoragePath(module.video_url, VIDEO_BUCKET);
                if (oldPath) {
                    try {
                        await supabaseServer.storage.from(VIDEO_BUCKET).remove([oldPath]);
                    } catch (cleanupError) {
                        console.error("OLD VIDEO CLEANUP ERROR:", cleanupError);
                    }
                }
            }

            return NextResponse.json({ ok: true, module: data });
        }

        // MP4 video
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ ok: false, error: "Please select an MP4 video file." }, { status: 400 });
        }

        const validationError = validateMp4File(file);
        if (validationError) {
            return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
        }

        const storagePath = `${section}/${moduleId}/${Date.now()}-${safeFileName(file.name)}`;

        const { error: uploadError } = await supabaseServer.storage
            .from(VIDEO_BUCKET)
            .upload(storagePath, file, { contentType: "video/mp4", upsert: false });

        if (uploadError) {
            console.error("MP4 UPLOAD ERROR:", uploadError);
            return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseServer.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath);
        const videoUrl = publicUrlData.publicUrl;

        const { data, error } = await supabaseServer
            .from("modules")
            .update({ video_url: videoUrl, video_type: "mp4" })
            .eq("section", section)
            .eq("id", moduleId)
            .select("id, section, title, video_url, video_type")
            .single();

        if (error) {
            console.error("MP4 DATABASE UPDATE ERROR:", error);
            await supabaseServer.storage.from(VIDEO_BUCKET).remove([storagePath]);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        if (module.video_type === "mp4" && module.video_url) {
            const oldPath = getStoragePath(module.video_url, VIDEO_BUCKET);
            if (oldPath) {
                try {
                    await supabaseServer.storage.from(VIDEO_BUCKET).remove([oldPath]);
                } catch (cleanupError) {
                    console.error("OLD VIDEO CLEANUP ERROR:", cleanupError);
                }
            }
        }

        return NextResponse.json({ ok: true, module: data });
    } catch (err) {
        console.error("MODULE VIDEO API FAILED:", err);
        return NextResponse.json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}

// DELETE
export async function DELETE(request: NextRequest) {
    try {
        await requireAdmin(request);
        const body = await request.json();
        const moduleId = String(body.moduleId ?? "").trim();
        const section = String(body.section ?? "").trim();

        if (!moduleId) {
            return NextResponse.json({ ok: false, error: "Module ID is required." }, { status: 400 });
        }
        if (section !== ALLOWED_SECTION) {
            return NextResponse.json({ ok: false, error: "Invalid module section." }, { status: 400 });
        }

        const { data: existingModule, error: findError } = await supabaseServer
            .from("modules")
            .select("id, section, title, video_url, video_type")
            .eq("section", section)
            .eq("id", moduleId)
            .single();

        if (findError || !existingModule) {
            return NextResponse.json(
                { ok: false, error: findError?.message || "Module not found." },
                { status: 404 }
            );
        }

        const { data, error } = await supabaseServer
            .from("modules")
            .update({ video_url: null, video_type: null })
            .eq("section", section)
            .eq("id", moduleId)
            .select("id, section, title, video_url, video_type")
            .single();

        if (error) {
            console.error("VIDEO REMOVE ERROR:", error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        if (existingModule.video_type === "mp4" && existingModule.video_url) {
            const oldPath = getStoragePath(existingModule.video_url, VIDEO_BUCKET);
            if (oldPath) {
                try {
                    await supabaseServer.storage.from(VIDEO_BUCKET).remove([oldPath]);
                } catch (cleanupError) {
                    console.error("VIDEO STORAGE CLEANUP ERROR:", cleanupError);
                }
            }
        }

        return NextResponse.json({ ok: true, module: data });
    } catch (err) {
        console.error("MODULE VIDEO DELETE API FAILED:", err);
        return NextResponse.json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}