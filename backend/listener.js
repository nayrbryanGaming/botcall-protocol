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
let isProcessing = false;
const taskQueue = [];

async function sendTxWithRetry(contractFunc, args, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            // Force fetch latest nonce to avoid provider-side staleness
            const nonce = await provider.getTransactionCount(wallet.address, "latest");
            const tx = await contractFunc(...args, { nonce });
            return await tx.wait();
        } catch (error) {
            const isNonceErr = error.message.includes("nonce") || error.message.includes("already be used");
            if (isNonceErr && i < retries - 1) {
                console.warn(`[RETRY] Nonce sync issue. Waiting 2s... (Attempt ${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            throw error;
        }
    }
}

async function processQueue() {
    if (isProcessing || taskQueue.length === 0) return;
    isProcessing = true;

    const task = taskQueue.shift();
    console.log(`\n[QUEUE] STARTING MISSION #${task.taskId} | ACTION: ${task.action.toUpperCase()}`);

    try {
        // 1. Claim Task
        process.stdout.write("[PROTOCOL] Claiming mission... ");
        await sendTxWithRetry(botCallContract.startExecuting, [task.taskId]);
        console.log("SUCCESS");

        // 2. AI Brain
        console.log("[BRAIN] Neural pathway sync in progress...");
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
            console.warn("[BRAIN ERROR] Heuristics fallback.");
        }
        console.log(`[BRAIN] Thought: "${thought}"`);

        // 3. Physical Simulation
        console.log("[SIM] Engaging actuators...");
        const res = await executeAction(task.action);
        console.log(`[SIM] LOG >> ${res.log}`);
        console.log(`[SIM] STATUS >> Bat:${res.battery}% | Sensor:${res.sensors}`);

        // 4. Finalize
        process.stdout.write("[PROTOCOL] Finalizing & Sending Proof... ");
        const receipt = await sendTxWithRetry(botCallContract.completeAction, [task.taskId]);
        console.log(`SUCCESS | PAID | TX: ${receipt.hash.slice(0, 10)}...`);

    } catch (error) {
        console.log("CRITICAL ERROR");
        console.error(`[ERROR] Task #${task.taskId}:`, error.reason || error.message);
    }

    console.log("-----------------------------------------");
    isProcessing = false;
    setTimeout(processQueue, 500); // Check for next mission with slight breathing room
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
    console.log("🤖 BOT-CALL PROTOCOL | BACKEND v1.4.2");
    console.log("=========================================");
    console.log(`NET: BASE SEPOLIA`);
    console.log(`CONTRACT: ${CONTRACT_ADDRESS}`);
    console.log(`WALLET: ${wallet.address}`);
    console.log("=========================================\n");

    await checkAndRegister();

    console.log("[LISTEN] Polling for missions (5s interval)...");

    let lastBlock = await provider.getBlockNumber();

    // Heartbeat for visibility
    setInterval(() => {
        if (!isProcessing) console.log(`[HEARTBEAT] Node online. Queue: ${taskQueue.length} | Block: ${lastBlock}`);
    }, 30000);

    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock <= lastBlock) return;

            // console.log(`[POLL] Checking blocks ${lastBlock + 1} to ${currentBlock}...`); // Removed for cleaner logs
            const events = await botCallContract.queryFilter("ActionRequested", lastBlock + 1, currentBlock);

            for (const event of events) {
                // Robust extraction via index
                const taskId = event.args[0];
                const action = event.args[2];
                const reward = event.args[3];
                console.log(`[EVENT] Mission #${taskId} spotted: ${action}`);
                taskQueue.push({ taskId, action });
                processQueue();
            }

            lastBlock = currentBlock;
        } catch (e) {
            console.warn("[POLL WARNING]", e.message.slice(0, 50));
            // Brief sleep before next interval to prevent spamming
            await new Promise(r => setTimeout(r, 2000));
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
