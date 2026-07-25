import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { uid, email } = await req.json();

        if (!uid || !email) {
            return NextResponse.json(
                { ok: false, error: 'Missing uid or email.' },
                { status: 400 }
            );
        }

        // Check if profile already exists
        const { data: existingProfile, error: fetchError } = await supabaseServer
            .from('profiles')
            .select('*')
            .eq('uid', uid)
            .single();

        // If we found an existing profile, return it
        if (existingProfile) {
            return NextResponse.json({
                ok: true,
                profile: existingProfile,
            });
        }

        // Ignore "no rows" error, but stop on anything else
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error(fetchError);

            return NextResponse.json(
                { ok: false, error: fetchError.message },
                { status: 500 }
            );
        }

        // Create a new profile
        const { data: profile, error: insertError } = await supabaseServer
            .from('profiles')
            .insert({
                uid,
                email,
                role: 'user',
                user_type: 'public',
            })
            .select()
            .single();

        if (insertError) {
            console.error(insertError);

            return NextResponse.json(
                { ok: false, error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            profile,
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { ok: false, error: 'Internal server error.' },
            { status: 500 }
        );
    }
}