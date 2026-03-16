const AI_ENDPOINT = import.meta.env.VITE_AI_AGENT_ENDPOINT || '';

const normalizeAction = (value = '') => {
    const action = value.toLowerCase();

    if (action.includes('scan')) return 'scan';
    if (action.includes('move') || action.includes('walk') || action.includes('go')) return 'move';
    if (action.includes('pick') || action.includes('get') || action.includes('grab')) return 'pick object';
    if (action.includes('patrol') || action.includes('guard') || action.includes('secure')) return 'patrol';
    if (action.includes('charge') || action.includes('battery') || action.includes('power')) return 'recharge';
    if (action.includes('wave') || action.includes('hello') || action.includes('greet')) return 'wave';
    return 'scan';
};

const fallbackInterpretation = (userPrompt) => {
    const prompt = String(userPrompt || '').toLowerCase();
    let reason = 'Using local action mapping.';

    if (prompt.includes('clean') || prompt.includes('inspect') || prompt.includes('check')) {
        reason = 'The request suggests an environment check first.';
    } else if (prompt.includes('go') || prompt.includes('move')) {
        reason = 'The request indicates movement to a target area.';
    }

    return {
        action: normalizeAction(prompt),
        reason
    };
};

/**
 * AI Agent Service
 * Interprets user intent to decide on the best robot action.
 */
export const interpretAction = async (userPrompt) => {
    try {
        if (!AI_ENDPOINT) {
            return fallbackInterpretation(userPrompt);
        }

        const response = await fetch(AI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userPrompt })
        });

        if (!response.ok) {
            throw new Error(`AI endpoint returned ${response.status}`);
        }

        const data = await response.json();
        return {
            action: normalizeAction(data?.action || userPrompt),
            reason: data?.reason || 'Action selected by AI endpoint.'
        };
    } catch (error) {
        console.error('AI Agent Error:', error);
        return fallbackInterpretation(userPrompt);
    }
};
