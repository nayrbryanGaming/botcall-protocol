const { ethers } = require("ethers");
const { executeAction } = require("./robotSimulator");
require("dotenv").config();

// ABI for the relevant parts of BotCall contract
const BOT_CALL_ABI = [
    "event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward)",
    "function completeAction(uint256 _taskId) external",
    "function startExecuting(uint256 _taskId) external"
];

const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;

if (!contractAddress) {
    console.error("ERROR: CONTRACT_ADDRESS not found in .env");
    process.exit(1);
}

const botCallContract = new ethers.Contract(contractAddress, BOT_CALL_ABI, wallet);

async function main() {
    console.log("-----------------------------------------");
    console.log("🤖 BOT-CALL Backend Listener v1.1.0");
    console.log(`Monitoring contract: ${contractAddress}`);
    console.log(`Using executor: ${wallet.address}`);
    console.log("-----------------------------------------");

    const setupListener = () => {
        botCallContract.on("ActionRequested", async (taskId, requester, action, reward) => {
            console.log(`\n[EVENT] New Action Requested!`);
            console.log(`Task ID: ${taskId} | Action: ${action} | Reward: ${ethers.formatEther(reward)} ETH`);

            try {
                // 1. Mark as executing on-chain
                process.stdout.write("[BACKEND] Updating status... ");
                const txStart = await botCallContract.startExecuting(taskId);
                await txStart.wait();
                console.log("DONE");

                // 2. Trigger Robot Simulator
                const success = await executeAction(action);

                if (success) {
                    // 3. Mark as completed and release payment
                    process.stdout.write("[BACKEND] Task success. Releasing payment... ");
                    const txComplete = await botCallContract.completeAction(taskId);
                    await txComplete.wait();
                    console.log("DONE! ETH transferred.");
                }
            } catch (error) {
                console.log("FAILED");
                console.error("[ERROR] Processing failed:", error.reason || error.message);
            }
        });
    };

    setupListener();

    // Reconnection logic for long-running processes
    provider.on("error", (e) => {
        console.error("[NETWORK ERROR] Lost connection. Attempting to restart listener...");
        setTimeout(main, 5000);
    });

    console.log("Listening for robotic tasks...");
    process.stdin.resume();
}

main().catch((error) => {
    console.error("Critical Error:", error);
    process.exit(1);
});
