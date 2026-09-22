// mocks/handlers.ts
// Deliver mock responses for API calls, to use in testing
import { http, HttpResponse } from 'msw';

// Put a successful response in each route (for fail cases, override in test file)
export const handlers = [
    // Lab page routes
    http.get('/api/lab/load-hazards', () => {
        return HttpResponse.json({
            ok: true,
            data: [
                {
                    type: 'gas',
                    top: '20.0%',
                    left: '30.0%',
                    title: 'Loaded Title',
                    text: 'Loaded description text.',
                    module_topic: 'hazard-modules',
                    module_id: '1',
                    video_url: null,
                    video_type: null,
                },
            ],
        });
    }),
    http.get('/api/lab/load-image', () => {
        return HttpResponse.json({ ok: true, url: '/uploads/lab-photo.jpg' });
    }),
    http.post('/api/lab/save-hazards', () => {
        return HttpResponse.json({ ok: true });
    }),
    http.post('/api/lab/upload-image', () => {
        return HttpResponse.json({ ok: true, url: '/uploads/mock-image.jpg' });
    }),
    http.get('/api/lab/load-module-options', () => {
        return HttpResponse.json({
            ok: true,
            data: [
                { topic: 'hazard-modules', id: '1', badge_num: 1, title: 'Gas Leak Detection' },
                { topic: 'hazard-modules', id: '2', badge_num: 2, title: 'Ventilation System' },
                { topic: 'guides', id: '1', badge_num: null, title: 'Sample Guide One' },
                { topic: 'guides', id: '2', badge_num: null, title: 'Sample Guide Two' },
            ],
        });
    }),
    http.put('/api/lab/video', async ({ request }) => {
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
    http.delete('/api/lab/video', () => {
        return HttpResponse.json({
            ok: true,
            hazard: { type: 'gas', title: 'Mock Title', video_url: null, video_type: null },
        });
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
];