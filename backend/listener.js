const { ethers } = require("ethers");
const { executeAction } = require("./robotSimulator");
const Groq = require("groq-sdk");
require("dotenv").config();

// --- Configuration ---
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("Missing PRIVATE_KEY or CONTRACT_ADDRESS in .env");
    process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const BOT_CALL_ABI = [
    "event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward)",
    "function startExecuting(uint256 _taskId) external",
    "function completeAction(uint256 _taskId) external",
    "function robots(address) view returns (bool isRegistered, string metadata, uint256 tasksCompleted)",
    "function registerRobot(string _metadata) external"
];

const botCallContract = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, wallet);

// --- Task Queue System ---
// Prevents nonce collisions by processing one robotic mission at a time.
let isProcessing = false;
const taskQueue = [];

async function processQueue() {
    if (isProcessing || taskQueue.length === 0) return;
    isProcessing = true;

    const task = taskQueue.shift();
    console.log(`\n[QUEUE] STARTING MISSION #${task.taskId} | ACTION: ${task.action.toUpperCase()}`);

    try {
        // 1. Claim Task on-chain
        process.stdout.write("[PROTOCOL] Claiming mission... ");
        const txStart = await botCallContract.startExecuting(task.taskId);
        await txStart.wait();
        console.log("SUCCESS");

        // 2. AI Reason
        console.log("[BRAIN] Synchronizing neural pathways...");
        let thought = "Actuating robotic subsystems for optimal execution.";
        try {
            const chat = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are the internal brain of a robot in the BOT-CALL protocol. Give a 1-sentence high-tech thought." },
                    { role: "user", content: task.action }
                ],
                model: "llama3-8b-8192",
            });
            thought = chat.choices[0]?.message?.content || thought;
        } catch (e) {
            console.warn("[BRAIN ERROR] Falling back to default heuristics.");
        }
        console.log(`[BRAIN] Thought: "${thought}"`);

        // 3. Physical Simulation
        console.log("[SIM] Triggering hardware actuators...");
        const res = await executeAction(task.action);
        console.log(`[SIM] LOG >> ${res.log}`);
        console.log(`[SIM] STATUS >> Bat:${res.battery}% | Sensor:${res.sensors}`);

        // 4. Finalize on-chain
        process.stdout.write("[PROTOCOL] Mission complete. Sending proof... ");
        const txEnd = await botCallContract.completeAction(task.taskId);
        await txEnd.wait();
        console.log("PAID");
        console.log(`[PROTOCOL] TX_HASH: ${txEnd.hash.slice(0, 16)}...`);

    } catch (error) {
        console.log("CRITICAL FAILURE");
        console.error(`[ERROR] Task #${task.taskId} error:`, error.reason || error.message);
    }

    console.log("-----------------------------------------");
    isProcessing = false;
    processQueue(); // Check for next mission
}

async function checkAndRegister() {
    process.stdout.write(`[AUTH] Verifying node ${wallet.address.slice(0, 10)}... `);
    try {
        const info = await botCallContract.robots(wallet.address);
        if (!info.isRegistered) {
            console.log("NOT REGISTERED.");
            process.stdout.write("[AUTH] Registering on Base Sepolia... ");
            const tx = await botCallContract.registerRobot("BOT-CALL_PROD_NODE_V2");
            await tx.wait();
            console.log("SUCCESS");
        } else {
            console.log(`VERIFIED. Reputation: ${info.tasksCompleted}`);
        }
    } catch (error) {
        console.log("FAILED.");
        console.error("[AUTH ERROR]", error.message);
    }
}

async function start() {
    console.log("\n=========================================");
    console.log("🤖 BOT-CALL PROTOCOL | BACKEND v1.4.1");
    console.log("=========================================");
    console.log(`NET: BASE SEPOLIA`);
    console.log(`CONTRACT: ${CONTRACT_ADDRESS}`);
    console.log(`WALLET: ${wallet.address}`);
    console.log("=========================================\n");

    await checkAndRegister();

    console.log("[LISTEN] Scanning for missions (Polling Mode: 5s)...");

    let lastBlock = await provider.getBlockNumber();

    // Polling Loop for Robustness
    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock <= lastBlock) return;

            const events = await botCallContract.queryFilter("ActionRequested", lastBlock + 1, currentBlock);

            for (const event of events) {
                const { taskId, action, reward } = event.args;
                console.log(`[EVENT] New Mission #${taskId}: ${action} | Reward: ${ethers.formatEther(reward)} ETH`);
                taskQueue.push({ taskId, action });
                processQueue();
            }

            lastBlock = currentBlock;
        } catch (e) {
            console.warn("[POLL WARNING] Network glitch, retrying... ", e.message);
        }
    }, 5000);
}

// Global crash handler
process.on("unhandledRejection", (err) => {
    console.error("[FATAL] Unhandled Rejection:", err);
    setTimeout(() => process.exit(1), 3000);
});

start().catch(err => {
    console.error("[FATAL] Backend crashed:", err);
    process.exit(1);
});
