// mocks/handlers.ts
// Deliver mock responses for API calls, to use in testing
import { http, HttpResponse } from 'msw';

// Put a successful response in each route (for fail cases, override in test file)
export const handlers = [
    http.get('/api/load-hazards', () => {
        return HttpResponse.json({
            ok: true,
            data: [
                {
                    type: 'gas',
                    top: '20.0%',
                    left: '30.0%',
                    title: 'Loaded Title',
                    text: 'Loaded description text.',
                    module_section: 'hazard-modules',
                    module_id: '1',
                },
            ],
        });
    }),
    http.get('/api/load-image', () => {
        return HttpResponse.json({ ok: true, url: '/uploads/lab-photo.jpg' });
    }),
    http.post('/api/save-hazards', () => {
        return HttpResponse.json({ ok: true });
    }),
    http.post('/api/upload-image', () => {
        return HttpResponse.json({ ok: true, url: '/uploads/mock-image.jpg' });
    }),
    http.get('/api/load-modules', () => {
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
    http.get('/api/load-module-options', () => {
        return HttpResponse.json({
            ok: true,
            data: [
                { section: 'hazard-modules', id: '1', badge_num: 1, title: 'Gas Leak Detection' },
                { section: 'hazard-modules', id: '2', badge_num: 2, title: 'Ventilation System' },
                { section: 'guides', id: '1', badge_num: null, title: 'Sample Guide One' },
                { section: 'guides', id: '2', badge_num: null, title: 'Sample Guide Two' },
            ],
        });
    }),
    http.get('/api/modules/progress', () => {
        return HttpResponse.json({
            ok: true,
            progress: [{ module_id: '1', progress: 100, status: 'done' }],
        });
    }),
];