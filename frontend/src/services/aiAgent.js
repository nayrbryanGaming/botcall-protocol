const AI_ENDPOINT = import.meta.env.VITE_AI_AGENT_ENDPOINT || '';

const normalizeAction = (value = '') => {
    const action = value.toLowerCase();

    if (action.includes('scan')) return 'scan';
    if (action.includes('move') || action.includes('walk') || action.includes('go') || action.includes('advance')) return 'move';
    if (action.includes('pick') || action.includes('grab') || action.includes('collect') || action.includes('take')) return 'pick';
    if (action.includes('place') || action.includes('drop') || action.includes('set')) return 'place';
    if (action.includes('rotate') || action.includes('turn') || action.includes('pivot')) return 'rotate';
    if (action.includes('stop') || action.includes('halt') || action.includes('pause')) return 'stop';
    if (action.includes('inspect') || action.includes('check') || action.includes('diagnose')) return 'inspect';
    if (action.includes('map') || action.includes('survey') || action.includes('layout')) return 'map';
    if (action.includes('return') || action.includes('back') || action.includes('home')) return 'return';
    if (action.includes('dock') || action.includes('park') || action.includes('station')) return 'dock';
    return 'scan';
};

const fallbackInterpretation = (userPrompt) => {
    const prompt = String(userPrompt || '').toLowerCase();
    const selectedAction = normalizeAction(prompt);
    const reason = 'Using local action mapping.';

    return {
        action: selectedAction,
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
