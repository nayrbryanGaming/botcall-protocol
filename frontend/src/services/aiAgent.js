import Groq from "groq-sdk";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

let groq = null;
if (GROQ_API_KEY) {
    groq = new Groq({
        apiKey: GROQ_API_KEY,
        dangerouslyAllowBrowser: true // Required for frontend client-side usage
    });
} else {
    console.warn("GROQ_API_KEY missing. AI will use local heuristic fallback.");
}

/**
 * AI Agent Service
 * Interprets user intent to decide on the best robot action.
 */
export const interpretAction = async (userPrompt) => {
    try {
        if (!groq) throw new Error("AI Brain offline");

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are the brain of the BOT-CALL robot protocol. 
                    Interpret the user's intent and map it to an action: 'scan', 'move', 'pick object', 'patrol', 'recharge', or 'wave'.
                    Also provide a one-sentence high-tech reasoning.
                    Return JSON: { "action": "action_name", "reason": "reasoning" }`
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            model: "llama3-70b-8192",
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0]?.message?.content || "{}");
        let action = data.action?.toLowerCase() || "scan";

        // Logic-based validation to ensure it matches supported contract actions
        if (action.includes("scan")) action = "scan";
        else if (action.includes("move") || action.includes("walk") || action.includes("go")) action = "move";
        else if (action.includes("pick") || action.includes("get") || action.includes("grab")) action = "pick object";
        else if (action.includes("patrol") || action.includes("guard") || action.includes("secure")) action = "patrol";
        else if (action.includes("charge") || action.includes("battery") || action.includes("power")) action = "recharge";
        else if (action.includes("wave") || action.includes("hello") || action.includes("greet")) action = "wave";
        else action = "scan"; // Default to safest high-utility action

        return {
            action,
            reason: data.reason || "Autonomous decisioning based on environment heuristics."
        };
    } catch (error) {
        console.error("AI Agent Error:", error);

        // Advanced Heuristic Fallback
        const prompt = userPrompt.toLowerCase();
        let action = "scan";
        let reason = "Switching to autonomous heuristic mode due to neural lag.";

        if (prompt.includes("move") || prompt.includes("go") || prompt.includes("walk")) action = "move";
        else if (prompt.includes("pick") || prompt.includes("grab") || prompt.includes("get")) action = "pick object";
        else if (prompt.includes("patrol") || prompt.includes("guard")) action = "patrol";
        else if (prompt.includes("charge") || prompt.includes("power")) action = "recharge";
        else if (prompt.includes("wave") || prompt.includes("hello")) action = "wave";

        return { action, reason };
    }
};
