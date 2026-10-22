// Gemini calls for food logging. The model only names dishes and portions; it is never
// asked for nutrition. Structured output (JSON schema), retries on rate limits, a
// per-user daily quota and a small cache for identical text.
import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '../lib/prisma.js';

export const PORTION_UNITS = ['piece', 'slice', 'katori', 'bowl', 'plate', 'glass', 'cup', 'tbsp', 'tsp', 'handful', 'g', 'ml', 'serving'];

const DAILY_LIMIT = Number(process.env.GEMINI_DAILY_LIMIT) || 60;
const MAX_ATTEMPTS = 3;
const CACHE_SIZE = 200;
const RETRYABLE = new Set([429, 500, 503]);

export class AiError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

const PARSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        isFood: { type: Type.BOOLEAN, description: 'false when the photo or text shows no food or drink' },
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    dish: { type: Type.STRING, description: 'the dish as the user said it or as it appears' },
                    english: { type: Type.STRING, description: 'common English or Indian-English name' },
                    candidates: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'up to 3 names copied exactly from the catalogue, best first',
                    },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING, enum: PORTION_UNITS },
                    confidence: { type: Type.NUMBER, description: '0 to 1' },
                },
                required: ['dish', 'english', 'candidates', 'quantity', 'unit', 'confidence'],
                propertyOrdering: ['dish', 'english', 'candidates', 'quantity', 'unit', 'confidence'],
            },
        },
    },
    required: ['isFood', 'items'],
};

const instructions = (catalogueNames) => `You help an Indian food-logging app. Identify every separate dish, food or drink the user ate, from a photo or from a description in English, Hindi or Hinglish (for example "2 roti, 1 katori dal, thoda chawal").

Rules:
- One item per dish. A thali photo usually has several items (rice, dal, sabzi, roti, curd, salad...).
- Split combinations into their parts: "rajma chawal" is rajma + rice, "dal roti" is dal + roti.
- quantity + unit describe the portion eaten. Units: piece (roti, idli, dosa, samosa, egg, fruit), slice, katori (small bowl, ~150 ml), bowl, plate, glass, cup, tbsp, tsp, handful, g, ml, serving.
- Vague amounts: "thoda" or "a little" = 0.5, "ek" = 1, "do" = 2, "teen" = 3, "aadha" = 0.5. With no amount, assume 1 typical portion.
- From a photo, estimate portions from the plate and bowl sizes.
- candidates: copy up to 3 names exactly from the catalogue below that are the same food. Leave it empty if nothing in the catalogue is the same food.
- Never give calories or nutrients.
- If there is no food, set isFood to false and return no items.

Catalogue:
${catalogueNames.join('; ')}`;

const cleanItems = (parsed) => {
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return items
        .filter(i => i && typeof i.dish === 'string' && i.dish.trim())
        .slice(0, 12)
        .map(i => ({
            dish: i.dish.trim(),
            english: String(i.english || i.dish).trim(),
            candidates: (Array.isArray(i.candidates) ? i.candidates : []).filter(c => typeof c === 'string').slice(0, 3),
            quantity: Number(i.quantity) > 0 ? Math.min(Number(i.quantity), 2000) : 1,
            unit: PORTION_UNITS.includes(i.unit) ? i.unit : 'serving',
            confidence: Math.max(0, Math.min(1, Number(i.confidence) || 0.5)),
        }));
};

const errorStatus = (error) => Number(error?.status ?? error?.code ?? error?.response?.status) || 0;

const today = () => new Date().toISOString().slice(0, 10);

/** Prisma-backed quota store: one row per user per UTC day. */
export const prismaQuota = {
    async used(userId) {
        const row = await prisma.aiUsage.findUnique({ where: { userId_date: { userId, date: today() } } });
        return row?.count || 0;
    },
    async add(userId) {
        await prisma.aiUsage.upsert({
            where: { userId_date: { userId, date: today() } },
            update: { count: { increment: 1 } },
            create: { userId, date: today(), count: 1 },
        });
    },
};

/**
 * @param client  object with models.generateContent (a GoogleGenAI instance, or a mock)
 * @param quota   { used(userId), add(userId) }
 */
export const createGeminiService = ({ client, model, quota = prismaQuota, sleep = ms => new Promise(r => setTimeout(r, ms)), limit = DAILY_LIMIT }) => {
    const cache = new Map();

    const generate = async (contents, systemInstruction) => {
        for (let attempt = 1; ; attempt++) {
            try {
                const response = await client.models.generateContent({
                    model,
                    contents,
                    config: { systemInstruction, responseMimeType: 'application/json', responseSchema: PARSE_SCHEMA, temperature: 0.1 },
                });
                return JSON.parse(response.text);
            } catch (error) {
                const status = errorStatus(error);
                if (RETRYABLE.has(status) && attempt < MAX_ATTEMPTS) {
                    await sleep(1000 * 2 ** (attempt - 1));
                    continue;
                }
                if (status === 429) throw new AiError('The AI service is busy right now. Try again in a minute.', 429);
                if (error instanceof SyntaxError) throw new AiError('The AI returned an unreadable answer. Try again.');
                throw new AiError('Could not reach the AI service. Try again, or add items by search.');
            }
        }
    };

    const checkQuota = async (userId) => {
        if ((await quota.used(userId)) >= limit) {
            throw new AiError(`You have used today's ${limit} AI logs. Add items by search instead.`, 429);
        }
    };

    return {
        /**
         * @param input  { text } or { image: base64 (no data: prefix), mimeType }
         * @param catalogueNames  names the model may copy into `candidates`
         */
        async parseMeal(userId, input, catalogueNames) {
            const cacheKey = input.text ? input.text.trim().toLowerCase().replace(/\s+/g, ' ') : null;
            if (cacheKey && cache.has(cacheKey)) return cache.get(cacheKey);

            await checkQuota(userId);
            const parts = input.text
                ? [{ text: `What did I eat? "${input.text.trim()}"` }]
                : [{ inlineData: { mimeType: input.mimeType, data: input.image } }, { text: 'What food is in this photo, and how much?' }];
            const parsed = await generate([{ role: 'user', parts }], instructions(catalogueNames));
            await quota.add(userId);

            const result = { isFood: parsed?.isFood !== false, items: cleanItems(parsed) };
            if (cacheKey) {
                if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value);
                cache.set(cacheKey, result);
            }
            return result;
        },
    };
};

let defaultService = null;

/** The app's service, created on first use so tests and scripts don't need a key. */
export const gemini = () => {
    if (!process.env.GEMINI_API_KEY) throw new AiError('AI logging is not set up (GEMINI_API_KEY is missing).', 503);
    if (!defaultService) {
        defaultService = createGeminiService({
            client: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
            model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
        });
    }
    return defaultService;
};
