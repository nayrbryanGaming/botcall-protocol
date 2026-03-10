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
    "event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward, uint256 timestamp)",
    "event ActionExecuting(uint256 indexed taskId, address indexed executor, uint256 timestamp)",
    "event ActionCompleted(uint256 indexed taskId, address indexed executor, uint256 reward, uint256 timestamp)",
    "event ActionCancelled(uint256 indexed taskId, uint256 timestamp)",
    "function startExecuting(uint256 _taskId) external",
    "function completeAction(uint256 _taskId) external",
    "function robots(address) view returns (bool isRegistered, string metadata, uint256 tasksCompleted)",
    "function registerRobot(string _metadata) external",
    "function tasks(uint256) view returns (uint256 id, address requester, address assignedExecutor, string action, uint256 reward, uint8 status, uint256 timestamp)"
];

const botCallContract = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, wallet);

// --- Local State ---
let currentNonce = -1;
const processedTasks = new Set();

async function getNextNonce() {
    if (currentNonce === -1) {
        currentNonce = await provider.getTransactionCount(wallet.address, "pending");
    } else {
        currentNonce++;
    }
    return currentNonce;
}

// --- Task Queue System ---
let isProcessing = false;
const taskQueue = [];

async function sendTxWithRetry(contractFunc, args, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const nonce = await getNextNonce();
            const tx = await contractFunc(...args, { nonce });
            return await tx.wait();
        } catch (error) {
            console.error(`[TX ERROR] Attempt ${i + 1}:`, error.message.slice(0, 100));

            if (error.message.includes("nonce") || error.message.includes("already be used")) {
                currentNonce = await provider.getTransactionCount(wallet.address, "latest");
                continue;
            }

            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function processQueue() {
    if (isProcessing || taskQueue.length === 0) return;
    isProcessing = true;

    const task = taskQueue.shift();
    if (processedTasks.has(task.taskId.toString())) {
        isProcessing = false;
        setTimeout(processQueue, 100);
        return;
    }

    console.log(`\n=========================================`);
    console.log(`🚀 [MISSION] STARTING MISSION #${task.taskId}`);
    console.log(`[ACTION] ${task.action.toUpperCase()}`);
    console.log(`=========================================`);

    try {
        // 1. Claim Task
        process.stdout.write("[PROTOCOL] Claiming mission... ");
        try {
            await sendTxWithRetry(botCallContract.startExecuting, [task.taskId]);
            console.log("SUCCESS ✅");
        } catch (err) {
            if (err.message.includes("Task not pending")) {
                console.log("ALREADY CLAIMED ⚠️");
            } else {
                throw err;
            }
        }

        // 2. AI Brain
        console.log("[BRAIN] Analyzing mission parameters...");
        let thought = "Optimizing robotic trajectories for maximum efficiency.";
        try {
            const chat = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a robot brain. 1 sentence high-tech thought about the mission." },
                    { role: "user", content: `Mission: ${task.action}` }
                ],
                model: "llama3-8b-8192",
            });
            thought = chat.choices[0]?.message?.content || thought;
        } catch (e) { }
        console.log(`[BRAIN] Analysis: "${thought}"`);

        // 3. Simulation
        console.log("[PHYSICAL] Executing payload...");
        await executeAction(task.action);

        // 4. Finalize
        process.stdout.write("[PROTOCOL] Submitting proof of completion... ");
        await sendTxWithRetry(botCallContract.completeAction, [task.taskId]);
        console.log("DONE ✅");

        console.log(`\n✨ [MISSION] MISSION #${task.taskId} ACCOMPLISHED`);
        processedTasks.add(task.taskId.toString());

    } catch (error) {
        console.log("FAILED ❌");
        console.error(`[ERROR] Task #${task.taskId}:`, error.reason || error.message);
    }

    console.log("=========================================\n");
    isProcessing = false;
    setTimeout(processQueue, 1000);
}

async function checkAndRegister() {
    process.stdout.write(`[AUTH] Checking node ${wallet.address.slice(0, 8)}... `);
    try {
        const balance = await provider.getBalance(wallet.address);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

        if (balance === 0n) {
            console.warn("[CRITICAL] Wallet has 0 ETH. Missions cannot be processed.");
        }

        const info = await botCallContract.robots(wallet.address);
        if (!info.isRegistered) {
            process.stdout.write("[AUTH] Registering robotic node... ");
            await sendTxWithRetry(botCallContract.registerRobot, ["BOT-CALL_PLATINUM_NODE_V3"]);
            console.log("REGISTERED ✅");
        } else {
            console.log(`VALIDATED ✅ | Missions Completed: ${info.tasksCompleted}`);
        }
    } catch (error) {
        console.log("AUTH ERROR ❌");
        console.error(error.message);
    }
}

async function start() {
    console.log("\n🤖 BOT-CALL BACKEND // PLATINUM MVP");
    console.log("=========================================");
    console.log(`RPC:      ${RPC_URL}`);
    console.log(`CONTRACT: ${CONTRACT_ADDRESS}`);
    console.log(`NODE:     ${wallet.address}`);
    console.log("=========================================\n");

    await checkAndRegister();

    console.log("[LISTEN] Polling for blockchain events...");

    let lastBlock = await provider.getBlockNumber();
    console.log(`[LISTEN] Starting from block: ${lastBlock}`);

    const poll = async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock <= lastBlock) {
                setTimeout(poll, 4000);
                return;
            }

            const startBlock = Math.max(0, lastBlock - 5);
            const events = await botCallContract.queryFilter("ActionRequested", startBlock, currentBlock);

            for (const event of events) {
                const taskId = event.args[0];
                const action = event.args[2];

                if (processedTasks.has(taskId.toString()) || taskQueue.some(t => t.taskId.toString() === taskId.toString())) {
                    continue;
                }

                try {
                    const task = await botCallContract.tasks(taskId);
                    if (Number(task.status) !== 0) { // 0 = Pending
                        processedTasks.add(taskId.toString());
                        continue;
                    }
                } catch (err) {
                    continue;
                }

                console.log(`\n🔔 [EVENT] NEW MISSION DETECTED: #${taskId} [${action.toUpperCase()}]`);
                taskQueue.push({ taskId, action });
                processQueue();
            }

            lastBlock = currentBlock;
        } catch (e) {
            console.warn("[POLL ERROR]", e.message.slice(0, 100));
        }
        setTimeout(poll, 4000);
    };

    poll();

    // Heartbeat
    setInterval(() => {
        const status = isProcessing ? "EXECUTING" : "IDLE";
        console.log(`[HB] ONLINE | Status: ${status} | Queue: ${taskQueue.length} | Block: ${lastBlock}`);
    }, 30000);
}

async function saferStart() {
    try {
        await start();
    } catch (err) {
        console.error("[FATAL] Backend crashed:", err.message);
        console.log("[REBOOT] Restarting in 10s...");
        setTimeout(saferStart, 10000);
    }
}

process.on("unhandledRejection", (err) => {
    console.error("[CRITICAL] Unhandled Rejection:", err);
});

saferStart();
