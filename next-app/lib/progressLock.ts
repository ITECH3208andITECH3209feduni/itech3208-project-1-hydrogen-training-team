// lib/progressLock.ts
// Server-side authority for the quiz lock. Mirrors the client-side check in
// hooks/useQuizLock.ts, but runs on the server so a direct API call can't
// bypass what the UI hides.

import { supabase, supabaseServer } from './supabase';
import { hazardModules } from './modules/hazards';

// Module ids that make up a topic, preferring admin-authored Supabase content
// over the static defaults — same source the client-side quiz lock uses.
async function resolveTopicModuleIds(topic: string): Promise<string[]> {
	const { data, error } = await supabase
		.from('modules')
		.select('id')
		.eq('topic', topic);

	if (!error && data?.length) return data.map((row) => String(row.id));

	return topic === 'hazards' ? hazardModules.map((m) => String(m.id)) : [];
}

// True unless every module in the quiz's topic is done for this user.
// Fails closed (locked) on a lookup error, matching hooks/useQuizLock.ts.
export async function isQuizLockedForUser(uid: string, topic: string): Promise<boolean> {
	const moduleIds = await resolveTopicModuleIds(topic);
	if (!moduleIds.length) return false;

	const { data, error } = await supabaseServer
		.from('user_module_progress')
		.select('module_id, status, progress')
		.eq('uid', uid)
		.eq('topic', topic);

	if (error) {
		console.error('isQuizLockedForUser lookup error (failing closed):', error);
		return true;
	}

	const doneIds = new Set(
		(data ?? [])
			.filter((row) => row.status === 'done' || Number(row.progress ?? 0) >= 100)
			.map((row) => String(row.module_id))
	);

	return moduleIds.some((id) => !doneIds.has(id));
}
