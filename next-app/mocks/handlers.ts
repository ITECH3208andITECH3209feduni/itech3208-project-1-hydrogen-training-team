// mocks/handlers.ts
// Deliver mock responses for API calls, to use in testing
import { http, HttpResponse } from 'msw';

// Put a successful response in each route (for fail cases, override in test file)
export const handlers = [
    // Scenario page routes
    http.get('/api/scenarios/load-hotspots', () => {
        return HttpResponse.json({
            ok: true,
            data: [
                {
                    type: 'gas',
                    top: '20.0%',
                    left: '30.0%',
                    title: 'Loaded Title',
                    text: 'Loaded description text.',
                    module_topic: 'hazards',
                    module_id: '1',
                    video_url: null,
                    video_type: null,
                },
            ],
        });
    }),
    http.get('/api/scenarios/load-image', () => {
        return HttpResponse.json({ ok: true, url: '/uploads/lab-photo.jpg' });
    }),
    http.post('/api/scenarios/save-hotspots', () => {
        return HttpResponse.json({ ok: true });
    }),
    http.post('/api/scenarios/upload-image', () => {
        return HttpResponse.json({ ok: true, url: '/uploads/mock-image.jpg' });
    }),
    http.get('/api/scenarios/load-module-options', () => {
        return HttpResponse.json({
            ok: true,
            data: [
                { topic: 'hazards', id: '1', badge_num: 1, title: 'Gas Leak Detection' },
                { topic: 'hazards', id: '2', badge_num: 2, title: 'Ventilation System' },
                { topic: 'guides', id: '1', badge_num: null, title: 'Sample Guide One' },
                { topic: 'guides', id: '2', badge_num: null, title: 'Sample Guide Two' },
            ],
        });
    }),
    http.put('/api/scenarios/video', async ({ request }) => {
        const formData = await request.formData();
        const videoType = formData.get('videoType');

        return HttpResponse.json({
            ok: true,
            hazard: {
                type: formData.get('hazardType'),
                title: 'Mock Title',
                video_url:
                    videoType === 'youtube'
                        ? formData.get('videoUrl')
                        : '/uploads/mock-video.mp4',
                video_type: videoType,
            },
        });
    }),
    http.delete('/api/scenarios/video', () => {
        return HttpResponse.json({
            ok: true,
            hazard: { type: 'gas', title: 'Mock Title', video_url: null, video_type: null },
        });
    }),
    http.get('/api/scenarios/progress', () => {
        return HttpResponse.json({
            ok: true,
            progress: [{ hotspot_id: 'gas', first_clicked_at: '2026-01-01T00:00:00.000Z' }],
            completedHotspots: 1,
            totalHotspots: 4,
        });
    }),
    http.post('/api/scenarios/progress', () => {
        return HttpResponse.json({ ok: true, message: 'Hotspot progress recorded' });
    }),
    
    // Module page routes
    http.get('/api/modules/load-modules', () => {
        return HttpResponse.json({
            ok: true,  
            data: [
                {
                    id: '1',
                    slug: 'gas-leak-detection',
                    badge_num: 1,
                    icon: '💨',
                    icon_bg: 'rgba(0,180,216,0.15)',
                    title: 'Gas Leak Detection',
                    description: 'description',
                    key_takeaway: 'key takeaway',
                    prev_id: null,
                    next_id: '2',
                    video_url: null,
                    video_type: null,
                    module_sections: [
                        {
                            num: '01',
                            heading: 'Section 1',
                            body: 'This is the 1st section of the module.',
                            list_type: null,
                            items: null,
                            callout: null,
                        },
                        {
                            num: '02',
                            heading: 'Section 2',
                            body: 'This is the second section of the module.',
                            list_type: 'ul',
                            items: ["Item 1", "Item 2", "Item 3"],
                            callout: '💡 callout',
                        },
                        {
                            num: '03',
                            heading: 'Section 3',
                            body: 'This is the third section of the module.',
                            list_type: 'ol',
                            items: ["First", "Second", "Third"],
                            callout: null,
                        },
                    ],
                },
            ],
        });
    }),
    http.post('/api/modules/save-module', () => {
        return HttpResponse.json({ ok: true });
    }),
    http.get('/api/modules/progress', () => {
        return HttpResponse.json({
            ok: true,
            progress: [{ module_id: '1', progress: 100, status: 'done' }],
        });
    }),
    http.post('/api/modules/progress', () => {
        return HttpResponse.json({ ok: true, message: 'Progress created' });
    }),
    http.patch('/api/modules/progress', () => {
        return HttpResponse.json({ ok: true, message: 'Progress updated', progress: {} });
    }),

    // Quiz page routes
    http.get('/api/quizzes/load-quiz', () => {
        return HttpResponse.json({
            ok: true,
            data: {
                quiz_id: 'hazards',
                title: 'Loaded Quiz Title',
                description: 'Loaded quiz description.',
                pass_threshold: 70,
                pool_size: null,
                quiz_questions: [
                    {
                        id: 1,
                        question: 'Loaded question one?',
                        options: ['Opt A', 'Opt B', 'Opt C'],
                        correct_index: 1,
                        explanation: 'Loaded explanation one.',
                        is_core: false,
                    },
                    {
                        id: 2,
                        question: 'Loaded question two?',
                        options: ['Opt X', 'Opt Y'],
                        correct_index: 0,
                        explanation: 'Loaded explanation two.',
                        is_core: false,
                    },
                ],
            }
        });
    }),
    http.post('/api/quizzes/save-quiz', () => {
        return HttpResponse.json({ ok: true });
    }),
    http.get('/api/quizzes/progress', () => {
        return HttpResponse.json({
            ok: true,
            progress: {
                quiz_id: 'hydrogen-hazards',
                score: 80,
                attempts: 1,
                passed: true,
                leaderboard_visible: false,
            },
        });
    }),
    http.post('/api/quizzes/progress', async ({ request }) => {
        const body = await request.json() as { score: number; passed: boolean };
        return HttpResponse.json({
            ok: true,
            message: 'Quiz result saved',
            progress: {
                quiz_id: 'hydrogen-hazards',
                score: body.score,
                attempts: 1,
                passed: body.passed,
                leaderboard_visible: false,
            },
        });
    }),
    http.patch('/api/quizzes/progress', async ({ request }) => {
        const body = await request.json() as { leaderboard_visible: boolean };
        return HttpResponse.json({
            ok: true,
            message: 'Leaderboard preference updated',
            progress: { quiz_id: 'hydrogen-hazards', leaderboard_visible: body.leaderboard_visible },
        });
    }),
];