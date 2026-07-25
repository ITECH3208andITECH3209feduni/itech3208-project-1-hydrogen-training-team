// mocks/handlers.ts
// Deliver mock results for API calls, to use in testing
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
];