import { describe, it, expect, vi } from 'vitest';
import { createGeminiService, AiError } from '../../services/gemini.js';

const memoryQuota = () => {
    const counts = new Map();
    return {
        used: async (id) => counts.get(id) || 0,
        add: async (id) => counts.set(id, (counts.get(id) || 0) + 1),
    };
};

const reply = (body) => ({ text: JSON.stringify(body) });
const apiError = (status) => Object.assign(new Error(`status ${status}`), { status });

const setup = (generateContent, options = {}) => {
    const client = { models: { generateContent: vi.fn(generateContent) } };
    const service = createGeminiService({ client, model: 'test-model', quota: memoryQuota(), sleep: async () => {}, ...options });
    return { client, service };
};

const ITEMS = { isFood: true, items: [{ dish: 'roti', english: 'roti', candidates: ['Phulka (Roti)'], quantity: 2, unit: 'piece', confidence: 0.9 }] };

describe('gemini service', () => {
    it('asks for structured output with the catalogue and no nutrition', async () => {
        const { client, service } = setup(async () => reply(ITEMS));
        const result = await service.parseMeal(1, { text: '2 roti' }, ['Phulka (Roti)', 'Dal Tadka']);
        expect(result.items[0]).toMatchObject({ dish: 'roti', quantity: 2, unit: 'piece' });
        const request = client.models.generateContent.mock.calls[0][0];
        expect(request.model).toBe('test-model');
        expect(request.config.responseMimeType).toBe('application/json');
        expect(request.config.responseSchema.properties.items.items.properties).not.toHaveProperty('kcal');
        expect(request.config.systemInstruction).toContain('Dal Tadka');
        expect(request.config.systemInstruction).toMatch(/Never give calories/);
    });

    it('sends photos as inline data', async () => {
        const { client, service } = setup(async () => reply(ITEMS));
        await service.parseMeal(1, { image: 'aGVsbG8=', mimeType: 'image/jpeg' }, []);
        const part = client.models.generateContent.mock.calls[0][0].contents[0].parts[0];
        expect(part.inlineData).toEqual({ mimeType: 'image/jpeg', data: 'aGVsbG8=' });
    });

    it('cleans malformed items', async () => {
        const { service } = setup(async () => reply({ isFood: true, items: [{ dish: ' dal ', quantity: -3, unit: 'bucket', confidence: 7 }, { dish: '' }] }));
        const { items } = await service.parseMeal(1, { text: 'dal' }, []);
        expect(items).toEqual([{ dish: 'dal', english: 'dal', candidates: [], quantity: 1, unit: 'serving', confidence: 1 }]);
    });

    it('retries rate limits with backoff', async () => {
        let calls = 0;
        const sleep = vi.fn(async () => {});
        const { service } = setup(async () => {
            calls++;
            if (calls < 3) throw apiError(429);
            return reply(ITEMS);
        }, { sleep });
        await service.parseMeal(1, { text: 'roti' }, []);
        expect(calls).toBe(3);
        expect(sleep.mock.calls.map(c => c[0])).toEqual([1000, 2000]);
    });

    it('gives up with a 429 after repeated rate limits', async () => {
        const { service } = setup(async () => { throw apiError(429); });
        await expect(service.parseMeal(1, { text: 'roti' }, [])).rejects.toMatchObject({ status: 429 });
    });

    it('does not retry other errors', async () => {
        const { client, service } = setup(async () => { throw apiError(400); });
        await expect(service.parseMeal(1, { text: 'roti' }, [])).rejects.toBeInstanceOf(AiError);
        expect(client.models.generateContent).toHaveBeenCalledTimes(1);
    });

    it('enforces the daily quota per user', async () => {
        const { service } = setup(async () => reply(ITEMS), { limit: 2 });
        await service.parseMeal(1, { text: 'a' }, []);
        await service.parseMeal(1, { text: 'b' }, []);
        await expect(service.parseMeal(1, { text: 'c' }, [])).rejects.toMatchObject({ status: 429 });
        await expect(service.parseMeal(2, { text: 'c' }, [])).resolves.toBeTruthy();
    });

    it('caches identical text', async () => {
        const { client, service } = setup(async () => reply(ITEMS));
        await service.parseMeal(1, { text: '2 Roti' }, []);
        await service.parseMeal(1, { text: '  2 roti ' }, []);
        expect(client.models.generateContent).toHaveBeenCalledTimes(1);
    });
});
