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
    console.log("BOT-CALL Backend Listener started...");
    console.log(`Monitoring contract: ${contractAddress}`);
    console.log(`Using executor address: ${wallet.address}`);

    botCallContract.on("ActionRequested", async (taskId, requester, action, reward, event) => {
        console.log(`-----------------------------------------`);
        console.log(`New Action Requested!`);
        console.log(`Task ID: ${taskId}`);
        console.log(`Requester: ${requester}`);
        console.log(`Action: ${action}`);
        console.log(`Reward: ${ethers.formatEther(reward)} ETH`);

        try {
            // 1. Mark as executing on-chain
            console.log("[BACKEND] Updating status to 'Executing'...");
            const txStart = await botCallContract.startExecuting(taskId);
            await txStart.wait();
            console.log("[BACKEND] Status updated on-chain.");

            // 2. Trigger Robot Simulator
            const success = await executeAction(action);

            if (success) {
                // 3. Mark as completed and release payment
                console.log("[BACKEND] Task successful. Calling completeAction...");
                const txComplete = await botCallContract.completeAction(taskId);
                await txComplete.wait();
                console.log("[BACKEND] Task completed! Payment released.");
            }
        } catch (error) {
            console.error("[BACKEND] Error processing task:", error.message);
        }
    });

    // Keep script running
    process.stdin.resume();
}

main().catch((error) => {
    console.error("Critical Error:", error);
    process.exit(1);
});
