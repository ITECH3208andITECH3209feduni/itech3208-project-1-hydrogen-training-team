// app/api/save-hazards/route.ts
// Upserts updated hotspot + hazard data into Supabase
// Uses supabaseServer (secret key) since this is a write operation on the server

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
	try {
		const { hotspots, hazardData } = await req.json();
		
		const rows = (hotspots as { type: string; top: string; left: string }[]).map(
			(hs, index) => ({
				type:       hs.type,
				top:        hs.top,
				left:       hs.left,
				title:      (hazardData as Record<string, { title: string; text: string }>)[hs.type].title,
				text:       (hazardData as Record<string, { title: string; text: string }>)[hs.type].text,
				sort_order: index,
			})
		);
		
		const { error } = await supabaseServer
			.from('hazards')
			.upsert(rows, { onConflict: 'type' });
		
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error('save-hazards error:', err);
		return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
	}
}
