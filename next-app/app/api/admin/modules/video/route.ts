// app/api/admin/modules/video/route.ts
// Admin-only API for adding, replacing and removing
// videos from the Hydrogen Safety Modules.
//
// IMPORTANT:
// Modules are identified by BOTH section and id.
// This prevents guides/1 and hazard-modules/1 from
// being confused with each other.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SECTION = "hazard-modules";
const VIDEO_BUCKET = "module-videos";

function getYouTubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        if (
            hostname === "youtube.com" ||
            hostname === "www.youtube.com"
        ) {
            if (parsed.pathname === "/watch") {
                return parsed.searchParams.get("v");
            }

            if (parsed.pathname.startsWith("/embed/")) {
                return parsed.pathname.split("/embed/")[1] || null;
            }
        }

        if (
            hostname === "youtu.be" ||
            hostname === "www.youtu.be"
        ) {
            return parsed.pathname.substring(1) || null;
        }

        return null;
    } catch {
        return null;
    }
}

function getStoragePath(videoUrl: string): string | null {
    try {
        const url = new URL(videoUrl);

        const marker =
            `/storage/v1/object/public/${VIDEO_BUCKET}/`;

        const index =
            url.pathname.indexOf(marker);

        if (index === -1) {
            return null;
        }

        return url.pathname.substring(
            index + marker.length
        );
    } catch {
        return null;
    }
}

export async function PUT(request: NextRequest) {
    try {
        await requireAdmin(request);

        const formData = await request.formData();

        const moduleId = String(
            formData.get("moduleId") ?? ""
        ).trim();

        const section = String(
            formData.get("section") ?? ""
        ).trim();

        const videoType = String(
            formData.get("videoType") ?? ""
        ).trim();

        if (!moduleId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Module ID is required.",
                },
                { status: 400 }
            );
        }

        if (section !== ALLOWED_SECTION) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Invalid module section.",
                },
                { status: 400 }
            );
        }

        if (
            videoType !== "youtube" &&
            videoType !== "mp4"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Video type must be youtube or mp4.",
                },
                { status: 400 }
            );
        }

        // --------------------------------------------------
        // Make sure the requested module exists in the
        // correct section before modifying anything.
        // --------------------------------------------------

        const {
            data: module,
            error: moduleError,
        } = await supabaseServer
            .from("modules")
            .select(
                "id, section, title, video_url, video_type"
            )
            .eq("section", section)
            .eq("id", moduleId)
            .single();

        if (moduleError || !module) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        moduleError?.message ||
                        "Module not found.",
                },
                { status: 404 }
            );
        }

        // --------------------------------------------------
        // YouTube video
        // --------------------------------------------------

        if (videoType === "youtube") {
            const videoUrl = String(
                formData.get("videoUrl") ?? ""
            ).trim();

            const videoId =
                getYouTubeVideoId(videoUrl);

            if (!videoId) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Please enter a valid YouTube URL.",
                    },
                    { status: 400 }
                );
            }

            const {
                data,
                error,
            } = await supabaseServer
                .from("modules")
                .update({
                    video_url: videoUrl,
                    video_type: "youtube",
                })
                .eq("section", section)
                .eq("id", moduleId)
                .select(
                    "id, section, title, video_url, video_type"
                )
                .single();

            if (error) {
                console.error(
                    "YOUTUBE VIDEO UPDATE ERROR:",
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

            // If replacing an old MP4 with YouTube,
            // remove the old MP4 from Storage.
            if (
                module.video_type === "mp4" &&
                module.video_url
            ) {
                const oldPath =
                    getStoragePath(
                        module.video_url
                    );

                if (oldPath) {
                    try {
                        await supabaseServer.storage
                            .from(VIDEO_BUCKET)
                            .remove([oldPath]);
                    } catch (cleanupError) {
                        console.error(
                            "OLD VIDEO CLEANUP ERROR:",
                            cleanupError
                        );
                    }
                }
            }

            return NextResponse.json({
                ok: true,
                module: data,
            });
        }

        // --------------------------------------------------
        // MP4 video
        // --------------------------------------------------

        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Please select an MP4 video file.",
                },
                { status: 400 }
            );
        }

        if (file.size === 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "The selected video is empty.",
                },
                { status: 400 }
            );
        }

        const isMp4 =
            file.type === "video/mp4" ||
            file.name
                .toLowerCase()
                .endsWith(".mp4");

        if (!isMp4) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Only MP4 video files are supported.",
                },
                { status: 400 }
            );
        }

        const safeFileName =
            file.name
                .toLowerCase()
                .replace(
                    /[^a-z0-9.-]/g,
                    "-"
                );

        const storagePath =
            `${section}/${moduleId}/${Date.now()}-${safeFileName}`;

        const {
            error: uploadError,
        } = await supabaseServer.storage
            .from(VIDEO_BUCKET)
            .upload(
                storagePath,
                file,
                {
                    contentType: "video/mp4",
                    upsert: false,
                }
            );

        if (uploadError) {
            console.error(
                "MP4 UPLOAD ERROR:",
                uploadError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: uploadError.message,
                },
                { status: 500 }
            );
        }

        const {
            data: publicUrlData,
        } =
            supabaseServer.storage
                .from(VIDEO_BUCKET)
                .getPublicUrl(
                    storagePath
                );

        const videoUrl =
            publicUrlData.publicUrl;

        const {
            data,
            error,
        } = await supabaseServer
            .from("modules")
            .update({
                video_url: videoUrl,
                video_type: "mp4",
            })
            .eq("section", section)
            .eq("id", moduleId)
            .select(
                "id, section, title, video_url, video_type"
            )
            .single();

        if (error) {
            console.error(
                "MP4 DATABASE UPDATE ERROR:",
                error
            );

            // Remove the newly uploaded file if
            // the database update fails.
            await supabaseServer.storage
                .from(VIDEO_BUCKET)
                .remove([storagePath]);

            return NextResponse.json(
                {
                    ok: false,
                    error: error.message,
                },
                { status: 500 }
            );
        }

        // Remove previous MP4 after the new one
        // has successfully been saved.
        if (
            module.video_type === "mp4" &&
            module.video_url
        ) {
            const oldPath =
                getStoragePath(
                    module.video_url
                );

            if (oldPath) {
                try {
                    await supabaseServer.storage
                        .from(VIDEO_BUCKET)
                        .remove([oldPath]);
                } catch (cleanupError) {
                    console.error(
                        "OLD VIDEO CLEANUP ERROR:",
                        cleanupError
                    );
                }
            }
        }

        return NextResponse.json({
            ok: true,
            module: data,
        });
    } catch (err) {
        console.error(
            "ADMIN VIDEO API FAILED:",
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

export async function DELETE(
    request: NextRequest
) {
    try {
        await requireAdmin(request);

        const body =
            await request.json();

        const moduleId = String(
            body.moduleId ?? ""
        ).trim();

        const section = String(
            body.section ?? ""
        ).trim();

        if (!moduleId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Module ID is required.",
                },
                { status: 400 }
            );
        }

        if (section !== ALLOWED_SECTION) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Invalid module section.",
                },
                { status: 400 }
            );
        }

        // Find the exact module using BOTH
        // section and module ID.
        const {
            data: existingModule,
            error: findError,
        } = await supabaseServer
            .from("modules")
            .select(
                "id, section, title, video_url, video_type"
            )
            .eq("section", section)
            .eq("id", moduleId)
            .single();

        if (findError || !existingModule) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        findError?.message ||
                        "Module not found.",
                },
                { status: 404 }
            );
        }

        // Clear the database fields first.
        const {
            data,
            error,
        } = await supabaseServer
            .from("modules")
            .update({
                video_url: null,
                video_type: null,
            })
            .eq("section", section)
            .eq("id", moduleId)
            .select(
                "id, section, title, video_url, video_type"
            )
            .single();

        if (error) {
            console.error(
                "VIDEO REMOVE ERROR:",
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

        // Remove MP4 from Storage if applicable.
        if (
            existingModule.video_type === "mp4" &&
            existingModule.video_url
        ) {
            const oldPath =
                getStoragePath(
                    existingModule.video_url
                );

            if (oldPath) {
                try {
                    await supabaseServer.storage
                        .from(VIDEO_BUCKET)
                        .remove([oldPath]);
                } catch (cleanupError) {
                    console.error(
                        "VIDEO STORAGE CLEANUP ERROR:",
                        cleanupError
                    );
                }
            }
        }

        return NextResponse.json({
            ok: true,
            module: data,
        });
    } catch (err) {
        console.error(
            "ADMIN VIDEO DELETE API FAILED:",
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