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
                    content: "You are the brain of a BOT-CALL robot. Your goal is to map user natural language requests to one of these valid robot actions: 'wave' or 'scan room'. Only return the action name as a string, no other text."
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            model: "llama3-70b-8192",
        });

        const action = completion.choices[0]?.message?.content?.toLowerCase().trim();

        // Validation to ensure only known actions are returned
        if (action.includes("wave")) return "wave";
        if (action.includes("scan")) return "scan room";

        return "wave"; // Default to wave if unclear
    } catch (error) {
        console.error("AI Agent Error:", error);
        return null;
    }
};
