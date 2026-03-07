import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true // Required for frontend client-side usage
});

/**
 * AI Agent Service
 * Interprets user intent to decide on the best robot action.
 */
export const interpretAction = async (userPrompt) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are the brain of the BOT-CALL robot protocol. 
                    Interpret the user's intent and map it to an action: 'wave' or 'scan room'.
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
        let action = data.action?.toLowerCase() || "wave";

        // Validation
        if (action.includes("scan")) action = "scan room";
        else action = "wave";

        return {
            action,
            reason: data.reason || "Executing standard robotic procedure."
        };
    } catch (error) {
        console.error("AI Agent Error:", error);
        return { action: "wave", reason: "AI fallback engaged." };
    }
};
