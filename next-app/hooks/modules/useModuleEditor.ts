// hooks/useModuleEditor.ts
// Manages the editor for a single module's content, including the draft, section order and save/reset.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ModuleData, ModuleSection } from '@/lib/moduleTypes';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Helpers ────────────────────────────────────────────────────────────────
// Renumbers the list of sections after adding/deleting/moving
export function renumberSections(sections: ModuleSection[]): ModuleSection[] {
	return sections.map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0') }));
}

// Builds new blank section
export function buildBlankSection(existingCount: number): ModuleSection {
	return {
		num: String(existingCount + 1).padStart(2, '0'),
		heading: 'New Section',
		body: 'Describe this section here.',
	};
}

// ─── Hook ───────────────────────────────────────────────────────────────────
// section: which app/modules/ section this module belongs to (e.g. 'hazard-modules')
// item: the live (Supabase-merged) module, from useModuleById — seeds the draft
// fallback: the bundled lib/ entry for this same id — what "Reset to Defaults" reverts to
export function useModuleEditor(section: string, item: ModuleData | undefined, fallback: ModuleData | undefined) {
	const { user } = useAuth();

	const [editMode, setEditMode] = useState(false);
	const [draft, setDraft] = useState<ModuleData | undefined>(item);
	const [selectedSection, setSelectedSection] = useState<number | null>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

	// Value tracking current edit state
	const editModeRef = useRef(editMode);
	editModeRef.current = editMode;

	// Exit edit mode and discard changes when moving to a different module
	useEffect(() => {
		setEditMode(false);
		setSelectedSection(null);
		setDraft(item);
	}, [item?.id]);

	// Return current edits when re-entering edit mode
	useEffect(() => {
		if (!editModeRef.current) setDraft(item);
	}, [item]);

	// Turning edit mode off doesn't discard unsaved changes
	const toggleEditMode = useCallback(() => {
		setEditMode((v) => {
			if (v) setSelectedSection(null);
			return !v;
		});
	}, []);

	// ── Top-level field editing ──────────────────────────────────────────────
	const updateField = useCallback(<K extends keyof ModuleData>(field: K, value: ModuleData[K]) => {
		setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
	}, []);

	// ── Section editing ──────────────────────────────────────────────────────
	const updateSection = useCallback(
		<K extends keyof ModuleSection>(index: number, field: K, value: ModuleSection[K]) => {
			setDraft((prev) => {
				if (!prev) return prev;
				const sections = prev.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s));
				return { ...prev, sections };
			});
		},
		[]
	);

	const addSection = useCallback(() => {
		setDraft((prev) => {
			if (!prev) return prev;
			const sections = renumberSections([...prev.sections, buildBlankSection(prev.sections.length)]);
			setTimeout(() => setSelectedSection(sections.length - 1), 0);
			return { ...prev, sections };
		});
	}, []);

	const deleteSection = useCallback((index: number) => {
		setDraft((prev) => {
			if (!prev) return prev;
			return { ...prev, sections: renumberSections(prev.sections.filter((_, i) => i !== index)) };
		});
		setSelectedSection(null);
	}, []);

	const moveSection = useCallback((index: number, direction: 'up' | 'down') => {
		setDraft((prev) => {
			if (!prev) return prev;
			const target = direction === 'up' ? index - 1 : index + 1;
			if (target < 0 || target >= prev.sections.length) return prev;
			const sections = [...prev.sections];
			[sections[index], sections[target]] = [sections[target], sections[index]];
			return { ...prev, sections: renumberSections(sections) };
		});
		setSelectedSection((sel) => {
			if (sel === null) return sel;
			const target = direction === 'up' ? index - 1 : index + 1;
			if (sel === index) return target;
			if (sel === target) return index;
			return sel;
		});
	}, []);

	// ── List items within a section (only relevant while listType is ul/ol) ──
	const updateSectionItem = useCallback((sectionIndex: number, itemIndex: number, value: string) => {
		setDraft((prev) => {
			if (!prev) return prev;
			const sections = prev.sections.map((s, i) => {
				if (i !== sectionIndex) return s;
				return { ...s, items: (s.items ?? []).map((it, j) => (j === itemIndex ? value : it)) };
			});
			return { ...prev, sections };
		});
	}, []);

	const addSectionItem = useCallback((sectionIndex: number) => {
		setDraft((prev) => {
			if (!prev) return prev;
			const sections = prev.sections.map((s, i) =>
				i === sectionIndex ? { ...s, items: [...(s.items ?? []), 'New item'] } : s
			);
			return { ...prev, sections };
		});
	}, []);

	const deleteSectionItem = useCallback((sectionIndex: number, itemIndex: number) => {
		setDraft((prev) => {
			if (!prev) return prev;
			const sections = prev.sections.map((s, i) =>
				i === sectionIndex ? { ...s, items: (s.items ?? []).filter((_, j) => j !== itemIndex) } : s
			);
			return { ...prev, sections };
		});
	}, []);

	// ── Reset ─────────────────────────────────────────────────────────────────
	// Revert to the fallback file
	const resetToDefaults = useCallback(() => {
		if (!fallback) return;
		setDraft(fallback);
		setSelectedSection(null);
	}, [fallback]);

	// ── Save ──────────────────────────────────────────────────────────────────
	const saveToSupabase = useCallback(async () => {
		if (!draft || !user) return;
		setSaveStatus('saving');
		try {
			const token = await user.getIdToken();
			const res = await fetch('/api/modules/save-module', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					section,
					module: {
						id: draft.id,
						slug: draft.slug ?? null,
						badgeNum: draft.badgeNum ?? null,
						icon: draft.icon,
						iconBg: draft.iconBg,
						title: draft.title,
						description: draft.description,
						keyTakeaway: draft.keyTakeaway,
						prevId: draft.prevId ?? null,
						nextId: draft.nextId ?? null,
					},
					sections: draft.sections,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json.ok) throw new Error(json.error ?? 'API error');
			setSaveStatus('saved');
			setTimeout(() => setSaveStatus('idle'), 2500);
		} catch (err) {
			console.error('save-module error:', err);
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
		}
	}, [draft, section, user]);

	return {
		editMode,
		toggleEditMode,
		draft,
		selectedSection,
		setSelectedSection,
		saveStatus,
		updateField,
		updateSection,
		addSection,
		deleteSection,
		moveSection,
		updateSectionItem,
		addSectionItem,
		deleteSectionItem,
		saveToSupabase,
		resetToDefaults,
		canReset: !!fallback,
	};
}
