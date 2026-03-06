const { ethers } = require("ethers");
const { simulateRobot } = require("./robotSimulator");
const Groq = require("groq-sdk");
require("dotenv").config();

// ABI for the relevant parts of BotCall contract (Production Alpha)
const BOT_CALL_ABI = [
    "event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward)",
    "event ActionExecuting(uint256 indexed taskId, address indexed executor)",
    "function completeAction(uint256 _taskId) external",
    "function startExecuting(uint256 _taskId) external",
    "function registerRobot(string _metadata) external",
    "function robots(address) view returns (bool isRegistered, string metadata, uint256 tasksCompleted)",
    "event ActionCancelled(uint256 indexed taskId)"
];

const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const botCallContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, BOT_CALL_ABI, wallet);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getAiReasoning(action) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are the brain of a robot in the BOT-CALL protocol. Your task is to provide a very short, high-speed 'AI thought' or 'reasoning' for the requested action. Example: for 'wave', say 'Initializing servo motors for haptic greeting.' Be concise (max 12 words) and sound like a high-tech AI."
                },
                { role: "user", content: action }
            ],
            model: "llama3-70b-8192",
        });
        return chatCompletion.choices[0]?.message?.content || "Reasoning initialized...";
    } catch (error) {
        console.error("[GROQ AI ERROR]", error.message);
        return "Executing standard robotic protocol.";
    }
}

async function checkAndRegister() {
    console.log(`[AUTH] Checking registration for ${wallet.address}...`);
    try {
        const robotInfo = await botCallContract.robots(wallet.address);
        if (!robotInfo.isRegistered) {
            console.log("[AUTH] Robot not registered. Registering now...");
            const tx = await botCallContract.registerRobot("Llama-3-Agentic-Robot-v1");
            await tx.wait();
            console.log("[AUTH] Registration SUCCESS.");
        } else {
            console.log(`[AUTH] Robot already registered. Tasks completed: ${robotInfo.tasksCompleted}`);
        }
    } catch (error) {
        console.error("[AUTH ERROR] Failed to check/register robot:", error.message);
    }
}

async function start() {
    console.log("-----------------------------------------");
    console.log("🤖 BOT-CALL Backend Listener v1.2.0");
    console.log(`Monitoring contract: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`Using executor: ${wallet.address}`);
    console.log("-----------------------------------------");

    await checkAndRegister();

    console.log("\n[LISTEN] Waiting for ActionRequested events...");

    botCallContract.on("ActionRequested", async (taskId, requester, action, reward) => {
        console.log(`\n[EVENT] New Task #${taskId} | Action: ${action} | Reward: ${ethers.formatEther(reward)} ETH`);

        try {
            // 1. Mark as executing on-chain
            process.stdout.write("[PROTOCOL] Claiming task... ");
            const txStart = await botCallContract.startExecuting(taskId);
            await txStart.wait();
            console.log("DONE (Assigned to us)");

            // 2. AI Reasoning Layer
            console.log(`[AI BRAIN] Thinking...`);
            const reason = await getAiReasoning(action);
            console.log(`[AI BRAIN] ${reason}`);

            // 3. Trigger Robot Simulator
            console.log(`[ROBOT] Actuating simulator...`);
            const success = await simulateRobot(action);

            if (success) {
                // 4. Mark as completed and release payment
                process.stdout.write("[PROTOCOL] Task success. Releasing reward... ");
                const txComplete = await botCallContract.completeAction(taskId);
                await txComplete.wait();
                console.log("DONE! ETH released.");
            }
        } catch (error) {
            console.log("FAILED");
            console.error("[ERROR] Task processing failed:", error.reason || error.message);
        }
    });

    botCallContract.on("ActionCancelled", (taskId) => {
        console.log(`\n[EVENT] Task #${taskId} CANCELLED by user. Abortion sequence triggered.`);
    });
}

start().catch((error) => {
    console.error("Critical Runtime Error:", error);
    process.exit(1);
});

// Reconnection logic
provider.on("error", (e) => {
    console.error("[NETWORK ERROR] Lost connection. Restarting in 5s...");
    setTimeout(() => process.exit(1), 5000); // Let PM2 or similar restart the process
});
