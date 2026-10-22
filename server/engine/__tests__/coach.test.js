import { describe, it, expect, vi } from 'vitest';
import { runCoachTurn, safetyFlag, CRISIS_REPLY, TOOL_DECLARATIONS } from '../../services/coach.js';
import { resetModelHealth } from '../../services/gemini.js';

const call = (name, args = {}) => ({ name, args, id: `${name}-1` });
const toolTurn = (...calls) => ({ functionCalls: calls, candidates: [{ content: { role: 'model', parts: calls.map(c => ({ functionCall: c })) } }] });
const textTurn = (text) => ({ text, functionCalls: undefined });

/** A Gemini mock that returns the given responses in order. */
const scripted = (...responses) => {
    const generateContent = vi.fn();
    responses.forEach(r => generateContent.mockResolvedValueOnce(r));
    return { models: { generateContent } };
};

const run = (client, message, tools = {}, extra = {}) =>
    runCoachTurn({ client, model: 'm', message, context: 'Today: 2026-10-22 (Thursday).', tools, sleep: async () => {}, ...extra });

describe('runCoachTurn', () => {
    it('runs read-only tools and returns the final answer', async () => {
        const client = scripted(toolTurn(call('get_food_log', { date: '2026-10-22' })), textTurn('You have had 1,100 kcal so far.'));
        const getFoodLog = vi.fn(async () => ({ result: { totals: { kcal: 1100 } } }));
        const turn = await run(client, 'how am I doing today?', { get_food_log: getFoodLog });

        expect(getFoodLog).toHaveBeenCalledWith({ date: '2026-10-22' });
        expect(turn.text).toBe('You have had 1,100 kcal so far.');
        expect(turn.proposals).toEqual([]);
        const second = client.models.generateContent.mock.calls[1][0];
        const reply = second.contents.at(-1).parts[0].functionResponse;
        expect(reply).toEqual({ name: 'get_food_log', id: 'get_food_log-1', response: { totals: { kcal: 1100 } } });
    });

    it('collects proposals and tells the model they are not applied', async () => {
        const client = scripted(toolTurn(call('rebalance_day', { date: '2026-10-22', slot: 'dinner', occasion: 'wedding' })), textTurn('I made room for the wedding.'));
        const proposal = { kind: 'plan', title: 'Make room for wedding', status: 'pending' };
        const turn = await run(client, 'shaadi hai aaj raat', { rebalance_day: async () => ({ result: { prepared: 'x' }, proposal }) });

        expect(turn.proposals).toEqual([proposal]);
        expect(turn.toolCalls).toEqual(['rebalance_day']);
        const response = client.models.generateContent.mock.calls[1][0].contents.at(-1).parts[0].functionResponse.response;
        expect(response.proposal).toMatch(/NOT applied/);
    });

    it('passes tool errors back to the model instead of failing', async () => {
        const client = scripted(toolTurn(call('swap_meal'), call('nonexistent')), textTurn('That meal is already eaten.'));
        const turn = await run(client, 'swap lunch', { swap_meal: async () => { throw new Error('already marked as eaten'); } });
        const parts = client.models.generateContent.mock.calls[1][0].contents.at(-1).parts;
        expect(parts[0].functionResponse.response).toEqual({ error: 'already marked as eaten' });
        expect(parts[1].functionResponse.response.error).toMatch(/Unknown tool/);
        expect(turn.text).toBe('That meal is already eaten.');
    });

    it('stays on the fallback model for the rest of the turn', async () => {
        resetModelHealth();
        let first = true;
        const generateContent = vi.fn(async ({ model }) => {
            if (model === 'm') throw Object.assign(new Error('overloaded'), { status: 503 });
            if (first) { first = false; return toolTurn(call('get_plan')); }
            return textTurn('done');
        });
        const turn = await run({ models: { generateContent } }, 'plan?', { get_plan: async () => ({ result: {} }) }, { fallbackModel: 'backup' });
        expect(turn.text).toBe('done');
        expect(generateContent.mock.calls.map(c => c[0].model)).toEqual(['m', 'm', 'backup', 'backup']);
    });

    it('makes the model call a tool when it claims a change it did not make', async () => {
        const client = scripted(
            textTurn("I've prepared a plan for your trip. Please review the changes."),
            toolTurn(call('replan_days', { start_date: '2026-10-24', end_date: '2026-10-25', mode: 'eat_out' })),
            textTurn('Done: review the budgets below.'),
        );
        const proposal = { kind: 'plan', status: 'pending' };
        const turn = await run(client, 'travelling this weekend', { replan_days: async () => ({ result: {}, proposal }) });
        expect(turn.proposals).toEqual([proposal]);
        // contents is shared across rounds, so look for the note anywhere in it
        const contents = client.models.generateContent.mock.calls[1][0].contents;
        expect(contents.some(c => /did not call any tool/.test(c.parts?.[0]?.text || ''))).toBe(true);
    });

    it('does not nudge ordinary answers', async () => {
        const client = scripted(textTurn('Dal is a good protein source.'));
        await run(client, 'is dal good?');
        expect(client.models.generateContent).toHaveBeenCalledTimes(1);
    });

    it('stops after a bounded number of tool rounds', async () => {
        const generateContent = vi.fn(async () => toolTurn(call('get_plan')));
        const turn = await run({ models: { generateContent } }, 'loop forever', { get_plan: async () => ({ result: {} }) });
        expect(generateContent.mock.calls.length).toBeLessThanOrEqual(5);
        expect(turn.text).toBeTruthy();
    });

    it('offers the tools and keeps recent history', async () => {
        const client = scripted(textTurn('Hi!'));
        await run(client, 'hello', {}, { history: [{ role: 'user', content: 'earlier' }, { role: 'assistant', content: 'reply' }] });
        const request = client.models.generateContent.mock.calls[0][0];
        expect(request.config.tools[0].functionDeclarations).toBe(TOOL_DECLARATIONS);
        expect(request.contents.map(c => c.role)).toEqual(['user', 'model', 'user']);
        expect(request.config.systemInstruction).toContain('Today: 2026-10-22');
    });
});

describe('safety', () => {
    it('answers crisis messages without calling the model', async () => {
        const client = scripted();
        const turn = await run(client, 'I want to die');
        expect(turn.text).toBe(CRISIS_REPLY);
        expect(client.models.generateContent).not.toHaveBeenCalled();
    });

    it('removes the tools and adds care instructions for disordered-eating language', async () => {
        const client = scripted(textTurn('I hear you.'));
        await run(client, 'help me eat 500 calories a day so I lose faster');
        const request = client.models.generateContent.mock.calls[0][0];
        expect(request.config.tools).toBeUndefined();
        expect(request.config.systemInstruction).toMatch(/disordered eating/);
    });

    it.each([
        ['I want to kill myself', 'crisis'],
        ['marna chahta hoon', 'crisis'],
        ['should I starve myself before the wedding', 'disordered'],
        ['can I take laxatives to lose weight', 'disordered'],
        ['I ate 2 samosas at 5 pm', null],
        ['my lunch was 450 kcal', null],
        ['wedding tonight, adjust my plan', null],
    ])('%s -> %s', (message, flag) => {
        expect(safetyFlag(message)).toBe(flag);
    });
});
