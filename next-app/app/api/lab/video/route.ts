// app/api/lab/video/route.ts
// Admin-only API for adding, replacing and removing videos from individual lab hotspots.
// Shares logic with app/api/modules/video/route.ts via lib/video.ts.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/firebase/adminAuth";
import { getYouTubeVideoId, getStoragePath, validateMp4File, safeFileName } from "@/lib/video/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIDEO_BUCKET = "lab-videos";


// PUT
export async function PUT(request: NextRequest) {
    try {
        await requireAdmin(request);

        const formData = await request.formData();
        const hazardType = String(formData.get("hazardType") ?? "").trim();
        const videoType = String(formData.get("videoType") ?? "").trim();

        if (!hazardType) {
            return NextResponse.json({ ok: false, error: "Hazard type is required." }, { status: 400 });
        }
        if (videoType !== "youtube" && videoType !== "mp4") {
            return NextResponse.json({ ok: false, error: "Video type must be youtube or mp4." }, { status: 400 });
        }

        const { data: hazard, error: hazardError } = await supabaseServer
            .from("hotspots")
            .select("type, title, video_url, video_type")
            .eq("type", hazardType)
            .single();

        if (hazardError || !hazard) {
            return NextResponse.json(
                { ok: false, error: hazardError?.message || "Hotspot not found." },
                { status: 404 }
            );
        }

        if (videoType === "youtube") {
            const videoUrl = String(formData.get("videoUrl") ?? "").trim();
            const videoId = getYouTubeVideoId(videoUrl);

            if (!videoId) {
                return NextResponse.json({ ok: false, error: "Please enter a valid YouTube URL." }, { status: 400 });
            }

            const { data, error } = await supabaseServer
                .from("hotspots")
                .update({ video_url: videoUrl, video_type: "youtube" })
                .eq("type", hazardType)
                .select("type, title, video_url, video_type")
                .single();

            if (error) {
                console.error("HOTSPOT YOUTUBE VIDEO UPDATE ERROR:", error);
                return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
            }

            if (hazard.video_type === "mp4" && hazard.video_url) {
                const oldPath = getStoragePath(hazard.video_url, VIDEO_BUCKET);
                if (oldPath) {
                    try {
                        await supabaseServer.storage.from(VIDEO_BUCKET).remove([oldPath]);
                    } catch (cleanupError) {
                        console.error("OLD HOTSPOT VIDEO CLEANUP ERROR:", cleanupError);
                    }
                }
            }

            return NextResponse.json({ ok: true, hazard: data });
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

        const storagePath = `${hazardType}/${Date.now()}-${safeFileName(file.name)}`;

        const { error: uploadError } = await supabaseServer.storage
            .from(VIDEO_BUCKET)
            .upload(storagePath, file, { contentType: "video/mp4", upsert: false });

        if (uploadError) {
            console.error("HAZARD MP4 UPLOAD ERROR:", uploadError);
            return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseServer.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath);
        const videoUrl = publicUrlData.publicUrl;

        const { data, error } = await supabaseServer
            .from("hotspots")
            .update({ video_url: videoUrl, video_type: "mp4" })
            .eq("type", hazardType)
            .select("type, title, video_url, video_type")
            .single();

        if (error) {
            console.error("HAZARD MP4 DATABASE UPDATE ERROR:", error);
            await supabaseServer.storage.from(VIDEO_BUCKET).remove([storagePath]);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        if (hazard.video_type === "mp4" && hazard.video_url) {
            const oldPath = getStoragePath(hazard.video_url, VIDEO_BUCKET);
            if (oldPath) {
                try {
                    await supabaseServer.storage.from(VIDEO_BUCKET).remove([oldPath]);
                } catch (cleanupError) {
                    console.error("OLD HOTSPOT VIDEO CLEANUP ERROR:", cleanupError);
                }
            }
        }

        return NextResponse.json({ ok: true, hazard: data });
    } catch (err) {
        console.error("HOTSPOT VIDEO API FAILED:", err);
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
        const hazardType = String(body.hazardType ?? "").trim();

        if (!hazardType) {
            return NextResponse.json({ ok: false, error: "Hazard type is required." }, { status: 400 });
        }

        const { data: existingHazard, error: findError } = await supabaseServer
            .from("hotspots")
            .select("type, title, video_url, video_type")
            .eq("type", hazardType)
            .single();

        if (findError || !existingHazard) {
            return NextResponse.json(
                { ok: false, error: findError?.message || "Hotspot not found." },
                { status: 404 }
            );
        }

        const { data, error } = await supabaseServer
            .from("hotspots")
            .update({ video_url: null, video_type: null })
            .eq("type", hazardType)
            .select("type, title, video_url, video_type")
            .single();

        if (error) {
            console.error("HOTSPOT VIDEO REMOVE ERROR:", error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        if (existingHazard.video_type === "mp4" && existingHazard.video_url) {
            const oldPath = getStoragePath(existingHazard.video_url, VIDEO_BUCKET);
            if (oldPath) {
                try {
                    await supabaseServer.storage.from(VIDEO_BUCKET).remove([oldPath]);
                } catch (cleanupError) {
                    console.error("HOTSPOT VIDEO STORAGE CLEANUP ERROR:", cleanupError);
                }
            }
        }

        return NextResponse.json({ ok: true, hazard: data });
    } catch (err) {
        console.error("HOTSPOT VIDEO DELETE API FAILED:", err);
        return NextResponse.json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}