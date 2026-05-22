// app/api/load-image/route.ts
// Returns the public URL of the lab image stored in Supabase Storage.
// If no image has been uploaded yet, returns ok: true with no url, and the app falls back to the local /lab.jpg.

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
	try {
		// Check if lab.jpg exists in the bucket
		const { data, error } = await supabase.storage
			.from('lab-images')
			.list('', { search: 'lab.jpg' });
		
		if (error) throw error;
		
		if (!data || data.length === 0) {
			// No image uploaded yet — use local fallback
			return NextResponse.json({ ok: true, url: null });
		}
		
		// Return the public URL
		const { data: urlData } = supabase.storage
			.from('lab-images')
			.getPublicUrl('lab.jpg');
		
		return NextResponse.json({ ok: true, url: urlData.publicUrl });
	} catch (err) {
		console.error('load-image error:', err);
		return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
	}
}
