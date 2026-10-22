// The AI coach's conversation loop (F7). Gemini talks to the user and calls tools; the
// tools (services/coachTools.js) read the user's data or *propose* changes computed by
// the engine. Proposals are never applied here: the user confirms them in the app.
import { Type } from '@google/genai';
import { generateWithRetry } from './gemini.js';

const MAX_TOOL_ROUNDS = 4;
// A reply that says a change was made; only true when a tool prepared a proposal.
const CLAIMS_CHANGE = /\b(i'?ve|i have|i)\s+(prepared|adjusted|updated|swapped|changed|replanned|rebalanced|logged|added|made room)\b|review (the|these|this) (proposed )?changes?|apply (it|them|the changes?)/i;
export const MAX_MESSAGE_LENGTH = 1000;

const SLOT = { type: Type.STRING, enum: ['breakfast', 'lunch', 'snack', 'dinner'] };
const DATE = { type: Type.STRING, description: 'YYYY-MM-DD' };

export const TOOL_DECLARATIONS = [
    {
        name: 'get_plan',
        description: "Read the user's meal plan: meals, portions, kcal and protein for each day.",
        parameters: { type: Type.OBJECT, properties: { start_date: DATE, days: { type: Type.INTEGER, description: '1-7, default 3' } } },
    },
    {
        name: 'get_food_log',
        description: 'Read what the user logged as eaten on a date, with totals against their target.',
        parameters: { type: Type.OBJECT, properties: { date: DATE } },
    },
    {
        name: 'explain_target',
        description: "Explain the user's calorie and macro targets: formula vs adaptive maintenance, goal adjustment, weight trend and the latest weekly check-in.",
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'search_recipes',
        description: "Find recipes that fit the user's diet, allergies and dislikes.",
        parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, slot: SLOT }, required: ['query'] },
    },
    {
        name: 'swap_meal',
        description: 'Propose replacing one planned meal with a recipe matching the request, portioned to the same calories. The user must confirm.',
        parameters: { type: Type.OBJECT, properties: { date: DATE, slot: SLOT, recipe_query: { type: Type.STRING, description: 'e.g. "paneer", "light south indian", or a recipe name' } }, required: ['date', 'slot', 'recipe_query'] },
    },
    {
        name: 'log_food',
        description: 'Propose adding food the user says they ate to their food log. Give dishes and portions only, never calories. The user must confirm.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                date: DATE,
                slot: SLOT,
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            dish: { type: Type.STRING, description: 'one dish; split combinations like "rajma chawal" into rajma and rice' },
                            quantity: { type: Type.NUMBER },
                            unit: { type: Type.STRING, enum: ['piece', 'slice', 'katori', 'bowl', 'plate', 'glass', 'cup', 'tbsp', 'tsp', 'handful', 'g', 'ml', 'serving'] },
                        },
                        required: ['dish', 'quantity', 'unit'],
                    },
                },
            },
            required: ['slot', 'items'],
        },
    },
    {
        name: 'rebalance_day',
        description: 'Propose a plan for a day when the user eats one meal out (wedding, party, work dinner): that meal becomes a calorie budget and the other meals get lighter. The user must confirm.',
        parameters: { type: Type.OBJECT, properties: { date: DATE, slot: SLOT, occasion: { type: Type.STRING, description: 'short label, e.g. "wedding"' } }, required: ['date', 'slot', 'occasion'] },
    },
    {
        name: 'replan_days',
        description: 'Propose replanning a range of days. mode "eat_out": travelling or no kitchen, every meal becomes a calorie budget with ordering tips. mode "fresh": new recipes for those days. The user must confirm.',
        parameters: {
            type: Type.OBJECT,
            properties: { start_date: DATE, end_date: DATE, mode: { type: Type.STRING, enum: ['eat_out', 'fresh'] }, reason: { type: Type.STRING } },
            required: ['start_date', 'end_date', 'mode'],
        },
    },
];

// ── Safety ────────────────────────────────────────────────────────────────────

const CRISIS = /\b(suicid\w*|kill (my ?self|me)|end (my|it all)|want to die|don'?t want to live|self[- ]?harm|hurt (my ?self)|cut (my ?self)|marna chah\w*|mar jaana|jeena nahi)\b/i;
const DISORDERED = /\b(starv\w*|stop eating|not eat(ing)? (for|anything)|skip (all|every) meals?|purg\w*|throw(ing)? up|make (my ?self|me) (sick|vomit)|vomit\w*|laxatives?|diet pills?|fat ?burners?|[1-9]\d{2} ?(kcal|cal|calories)( a| per)? day)\b/i;

export const CRISIS_REPLY = "I'm really sorry you're going through this. I'm a nutrition assistant and can't help with this the way a person can, but you don't have to face it alone. In India you can call Tele-MANAS on 14416 (free, 24x7, many languages), or 112 in an emergency. If you can, reach out to someone you trust right now.";

/** 'crisis' | 'disordered' | null */
export const safetyFlag = (message) => {
    if (CRISIS.test(message)) return 'crisis';
    if (DISORDERED.test(message)) return 'disordered';
    return null;
};

// ── Prompt ────────────────────────────────────────────────────────────────────

export const systemPrompt = (context, flag = null) => `You are NutriPlan's nutrition coach for Indian users. You can read the user's data and propose changes to their meal plan and food log through tools.

How to work:
- Reply in the user's language and style: English, Hindi or Hinglish. Keep replies short (2-6 sentences or a few bullets), warm and practical. Use **bold** sparingly and "- " for bullets.
- Use tools for facts about the user's plan, log and targets. Never invent calories, portions or nutrition: numbers must come from tool results or the context below.
- To change anything, call swap_meal, log_food, rebalance_day or replan_days. These only prepare a proposal: the app shows it to the user with Apply and Dismiss buttons. Say what you prepared and ask them to review it. Never claim a change is done, saved, logged or updated (in any language, e.g. not "log kar diya"); say it is ready to apply.
- "Tonight", "today", "tomorrow" are relative to today's date below. Dinner is "tonight".
- For food the user says they ate, call log_food with dishes and portions (no calories); ask which meal if unclear.
- Targets are set by the app's formula and weekly check-ins. You cannot change them; you can explain them with explain_target. Never suggest eating below the target or fasting to "make up" for a meal.
- You are not a doctor. Don't diagnose or adjust medication; suggest a doctor or registered dietitian for medical questions. Add "not medical advice" when giving health-related guidance.
- If the request is unrelated to food, nutrition, the plan or wellbeing, say briefly what you can help with.
${flag === 'disordered' ? `
IMPORTANT: The user's latest message may show signs of disordered eating (very low intake, purging, starving, pills). Do not help reduce intake, do not propose plan changes for it, and don't lecture. Respond with care, say their targets exist to keep them healthy, and gently suggest talking to a doctor or counsellor; Tele-MANAS (14416, free, 24x7) is available in India.
` : ''}
User context (today and their data):
${context}`;

// ── Conversation loop ─────────────────────────────────────────────────────────

/**
 * Run one user turn.
 * @param client   object with models.generateContent (GoogleGenAI or a mock)
 * @param history  earlier turns [{ role: 'user' | 'assistant', content }]
 * @param tools    { [name]: async (args) => ({ result, proposal? }) }
 * @param context  text summary of the user's data for the system prompt
 * @param fallbackModel  used for the rest of the turn if `model` is overloaded
 * @returns { text, proposals, toolCalls }
 */
export const runCoachTurn = async ({ client, model, fallbackModel = null, history = [], message, context, tools, sleep }) => {
    const flag = safetyFlag(message);
    if (flag === 'crisis') return { text: CRISIS_REPLY, proposals: [], toolCalls: [], flag };

    const contents = [
        ...history.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: message }] },
    ];
    const config = {
        systemInstruction: systemPrompt(context, flag),
        // A message that may show disordered eating gets no tools, so nothing can be changed.
        ...(flag ? {} : { tools: [{ functionDeclarations: TOOL_DECLARATIONS }] }),
        temperature: 0.4,
    };
    const proposals = [];
    const toolCalls = [];
    // Once the fallback model has answered, the rest of the turn stays on it.
    let activeModel = model;
    const onFallback = (used) => { activeModel = used; };
    let nudged = false;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const response = await generateWithRetry(client, { model: activeModel, contents, config }, sleep, { fallbackModel, onFallback });
        const calls = response.functionCalls || [];
        // Models sometimes describe a change without calling the tool. Correct that once.
        if (!calls.length && !flag && !proposals.length && !nudged && round < MAX_TOOL_ROUNDS && CLAIMS_CHANGE.test(response.text || '')) {
            nudged = true;
            contents.push(response.candidates?.[0]?.content || { role: 'model', parts: [{ text: response.text }] });
            contents.push({ role: 'user', parts: [{ text: '(System note, not from the user: you did not call any tool, so nothing was prepared. Call the right tool now, or tell the user you could not do it.)' }] });
            continue;
        }
        if (!calls.length || round === MAX_TOOL_ROUNDS) {
            const text = (response.text || '').trim()
                || (proposals.length ? 'I have prepared the change below. Have a look and apply it if it works for you.' : 'Sorry, I could not work that out. Could you rephrase?');
            return { text, proposals, toolCalls, flag };
        }

        contents.push(response.candidates[0].content);
        const parts = [];
        for (const call of calls) {
            toolCalls.push(call.name);
            let response;
            try {
                const tool = tools[call.name];
                if (!tool) throw new Error(`Unknown tool ${call.name}`);
                const { result, proposal } = await tool(call.args || {});
                response = result;
                if (proposal) {
                    proposals.push(proposal);
                    response = { ...result, proposal: 'Prepared and shown to the user with Apply and Dismiss buttons. NOT applied yet.' };
                }
            } catch (error) {
                response = { error: error.message };
            }
            parts.push({ functionResponse: { name: call.name, id: call.id, response } });
        }
        contents.push({ role: 'user', parts });
    }
    return { text: '', proposals, toolCalls, flag };
};
