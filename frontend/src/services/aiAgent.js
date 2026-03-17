const AI_ENDPOINT = import.meta.env.VITE_AI_AGENT_ENDPOINT || '';

const DEFAULT_ACTION = 'scan';

const ACTION_RULES = [
    {
        action: 'dock',
        keywords: ['dock', 'station', 'park', 'recharge', 'charge', 'sleep', 'rest', 'idle', 'standby', 'hide', 'shelter', 'cover', 'tidur', 'istirahat', 'berlindung']
    },
    {
        action: 'return',
        keywords: ['return', 'go back', 'back home', 'home', 'retreat', 'fallback', 'evacuate', 'kembali', 'pulang', 'mundur']
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
        keywords: ['move', 'walk', 'go', 'advance', 'navigate', 'travel', 'run', 'sprint', 'rush', 'chase', 'escape', 'evade', 'maju', 'pergi', 'menuju', 'lari']
    },
    {
        action: 'scan',
        keywords: ['scan', 'sweep', 'search', 'detect', 'locate', 'recon', 'monitor', 'pindai', 'deteksi']
    }
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const keywordMatched = (text, keyword) => {
    const normalizedKeyword = String(keyword || '').toLowerCase().trim();
    if (!normalizedKeyword) return false;

    // Multi-word phrases should match as-is; single words use boundaries to avoid noisy substring hits.
    if (normalizedKeyword.includes(' ')) {
        return text.includes(normalizedKeyword);
    }

    const pattern = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, 'i');
    return pattern.test(text);
};

const countKeywordMatches = (text, keywords) => keywords.reduce((score, keyword) => {
    return keywordMatched(text, keyword) ? score + 1 : score;
}, 0);

const classifyPrompt = (value = '') => {
    const prompt = String(value || '').toLowerCase().trim();
    if (!prompt) {
        return {
            action: DEFAULT_ACTION,
            reason: 'Prompt is empty, defaulting to SCAN.',
            score: 0,
            matchedKeywords: []
        };
    }

    const scored = ACTION_RULES.map((rule) => ({
        ...rule,
        score: countKeywordMatches(prompt, rule.keywords)
    }));

    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];

    if (winner && winner.score > 0) {
        const matchedKeywords = winner.keywords.filter((keyword) => keywordMatched(prompt, keyword)).slice(0, 3);
        return {
            action: winner.action,
            reason: `Mapped by local classifier (${matchedKeywords.join(', ') || winner.action}).`,
            score: winner.score,
            matchedKeywords
        };
    }

    return {
        action: DEFAULT_ACTION,
        reason: 'No strong keyword match, defaulting to SCAN.',
        score: 0,
        matchedKeywords: []
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
    const promptDecision = classifyPrompt(userPrompt);

    try {
        if (!AI_ENDPOINT) {
            return {
                ...promptDecision,
                source: 'prompt'
            };
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
        const endpointSignal = [data?.action, data?.reason]
            .filter((item) => typeof item === 'string' && item.trim().length > 0)
            .join(' ');
        const endpointDecision = classifyPrompt(endpointSignal);

        const shouldTrustPrompt = promptDecision.score > 0;
        const shouldTrustEndpoint = !shouldTrustPrompt && endpointDecision.score > 0;
        const finalDecision = shouldTrustPrompt
            ? promptDecision
            : (shouldTrustEndpoint ? endpointDecision : promptDecision);

        return {
            action: finalDecision.action,
            reason: shouldTrustPrompt
                ? promptDecision.reason
                : (data?.reason || finalDecision.reason),
            score: finalDecision.score,
            matchedKeywords: finalDecision.matchedKeywords,
            source: shouldTrustPrompt ? 'prompt' : (shouldTrustEndpoint ? 'endpoint' : 'default')
        };
    } catch (error) {
        console.error('AI Agent Error:', error);
        return {
            ...fallbackInterpretation(userPrompt),
            source: 'fallback'
        };
    }
};
