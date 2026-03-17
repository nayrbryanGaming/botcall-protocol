const AI_ENDPOINT = import.meta.env.VITE_AI_AGENT_ENDPOINT || '';

const DEFAULT_ACTION = 'scan';

const ACTION_RULES = [
    {
        action: 'dock',
        keywords: ['dock', 'station', 'park', 'recharge', 'charge', 'sleep', 'rest', 'idle', 'standby', 'tidur', 'istirahat']
    },
    {
        action: 'return',
        keywords: ['return', 'go back', 'back home', 'home', 'kembali', 'pulang']
    },
    {
        action: 'stop',
        keywords: ['stop', 'halt', 'pause', 'freeze', 'berhenti', 'diam']
    },
    {
        action: 'pick',
        keywords: ['pick', 'grab', 'collect', 'take', 'angkat', 'ambil']
    },
    {
        action: 'place',
        keywords: ['place', 'drop', 'set down', 'put down', 'taruh', 'letakkan']
    },
    {
        action: 'rotate',
        keywords: ['rotate', 'turn', 'pivot', 'spin', 'putar']
    },
    {
        action: 'inspect',
        keywords: ['inspect', 'inspection', 'check', 'diagnose', 'verify', 'audit', 'periksa', 'cek detail']
    },
    {
        action: 'map',
        keywords: ['map', 'mapping', 'survey', 'layout', 'topology', 'pemetaan', 'peta']
    },
    {
        action: 'move',
        keywords: ['move', 'walk', 'go', 'advance', 'navigate', 'travel', 'maju', 'pergi', 'menuju']
    },
    {
        action: 'scan',
        keywords: ['scan', 'sweep', 'search', 'detect', 'locate', 'recon', 'monitor', 'pindai', 'deteksi']
    }
];

const countKeywordMatches = (text, keywords) => keywords.reduce(
    (score, keyword) => (text.includes(keyword) ? score + 1 : score),
    0
);

const classifyPrompt = (value = '') => {
    const prompt = String(value || '').toLowerCase().trim();
    if (!prompt) {
        return {
            action: DEFAULT_ACTION,
            reason: 'Prompt is empty, defaulting to SCAN.'
        };
    }

    const scored = ACTION_RULES.map((rule) => ({
        ...rule,
        score: countKeywordMatches(prompt, rule.keywords)
    }));

    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];

    if (winner && winner.score > 0) {
        const matchedKeywords = winner.keywords.filter((keyword) => prompt.includes(keyword)).slice(0, 3);
        return {
            action: winner.action,
            reason: `Mapped by local classifier (${matchedKeywords.join(', ') || winner.action}).`
        };
    }

    return {
        action: DEFAULT_ACTION,
        reason: 'No strong keyword match, defaulting to SCAN.'
    };
};

const fallbackInterpretation = (userPrompt) => {
    return classifyPrompt(userPrompt);
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
        const mergedSignal = [data?.action, data?.reason, userPrompt]
            .filter((item) => typeof item === 'string' && item.trim().length > 0)
            .join(' ');
        const localDecision = classifyPrompt(mergedSignal || userPrompt);

        return {
            action: localDecision.action,
            reason: data?.reason || localDecision.reason
        };
    } catch (error) {
        console.error('AI Agent Error:', error);
        return fallbackInterpretation(userPrompt);
    }
};
