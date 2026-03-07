const { ethers } = require("ethers");
const { executeAction } = require("./robotSimulator");
const Groq = require("groq-sdk");
require("dotenv").config();

// ABI for the relevant parts of BotCall contract
const BOT_CALL_ABI = [
    "event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward)",
    "event ActionExecuting(uint256 indexed taskId, address indexed executor)",
    "function completeAction(uint256 _taskId) external",
    "function startExecuting(uint256 _taskId) external",
    "function registerRobot(string _metadata) external",
    "function robots(address) view returns (bool isRegistered, string metadata, uint256 tasksCompleted)",
    "event ActionCancelled(uint256 indexed taskId)"
];

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
let provider = new ethers.JsonRpcProvider(RPC_URL);
let wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
let botCallContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, BOT_CALL_ABI, wallet);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getAiReasoning(action) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are the autonomous brain of a robot in the BOT-CALL protocol. Provide a high-speed 'AI thought' for the action. Example: 'wave' -> 'Actuating limb-01 for optical social pulse.' Be extremely concise (max 8 words)."
                },
                { role: "user", content: action }
            ],
            model: "llama3-70b-8192",
        });
        return chatCompletion.choices[0]?.message?.content || "Synchronizing motor cortex...";
    } catch (error) {
        return "Executing default neural pathway.";
    }
}

async function checkAndRegister() {
    process.stdout.write(`[AUTH] Verifying node ${wallet.address.slice(0, 10)}... `);
    try {
        const robotInfo = await botCallContract.robots(wallet.address);
        if (!robotInfo.isRegistered) {
            console.log("NOT REGISTERED.");
            console.log("[AUTH] Initiating on-chain registration...");
            const tx = await botCallContract.registerRobot("BOT-CALL-PROD-NODE-X");
            await tx.wait();
            console.log("[AUTH] Registration SUCCESS.");
        } else {
            console.log(`VERIFIED. [Rep: ${robotInfo.tasksCompleted}]`);
        }
    } catch (error) {
        console.log("FAILED.");
        console.error("[AUTH ERROR]", error.message);
    }
}

async function start() {
    console.log("\n=========================================");
    console.log("🤖 BOT-CALL PROTOCOL | PROD-NODE v1.3.0");
    console.log("=========================================");
    console.log(`NET: BASE SEPOLIA`);
    console.log(`CONTRACT: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`WALLET: ${wallet.address}`);
    console.log("=========================================\n");

    await checkAndRegister();

    console.log("[LISTEN] Scanning for missions...");

    botCallContract.on("ActionRequested", async (taskId, requester, action, reward) => {
        console.log(`\n[MISSION] #${taskId} | ${action.toUpperCase()} | REWARD: ${ethers.formatEther(reward)} ETH`);

        try {
            // 1. Claim Task
            process.stdout.write("[PROTOCOL] Claiming... ");
            const txStart = await botCallContract.startExecuting(taskId);
            await txStart.wait();
            console.log("SUCCESS");

            // 2. AI Reason
            const thought = await getAiReasoning(action);
            console.log(`[BRAIN] Thought: ${thought}`);

            // 3. Physical Simulation
            const res = await executeAction(action);

            if (res) {
                // 4. Complete
                process.stdout.write("[PROTOCOL] Mission Success. Finalizing payment... ");
                const txEnd = await botCallContract.completeAction(taskId);
                await txEnd.wait();
                console.log("PAID");
            }
        } catch (error) {
            console.log("REJECTED/FAILED");
            console.error("[!] Error:", error.reason || error.message);
        }
    });

    botCallContract.on("ActionCancelled", (taskId) => {
        console.log(`[CANCEL] Task #${taskId} aborted by user.`);
    });
}

// Global error handling for provider stability
process.on("unhandledRejection", (err) => {
    console.error("[FATAL] Unhandled Rejection:", err);
    setTimeout(() => process.exit(1), 3000);
});

start().catch(err => {
    console.error("[FATAL] Startup failed:", err);
    process.exit(1);
});
