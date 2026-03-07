const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.error("PRIVATE_KEY missing in .env");
        return;
    }
    const wallet = new ethers.Wallet(pk, provider);
    const contractAddress = process.env.CONTRACT_ADDRESS;

    console.log("=== BOT-CALL DIAGNOSTIC ===");
    console.log(`Node Wallet: ${wallet.address}`);
    console.log(`Contract: ${contractAddress}`);
    console.log(`Network: ${(await provider.getNetwork()).name} (${(await provider.getNetwork()).chainId})`);

    try {
        const balance = await provider.getBalance(wallet.address);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

        if (balance < ethers.parseEther("0.001")) {
            console.warn("WARNING: Extremely low balance. Transactions may fail.");
        }

        const BotCall = await ethers.getContractAt([
            "function taskCount() view returns (uint256)",
            "function robots(address) view returns (bool isRegistered, string metadata, uint256 tasksCompleted)",
            "function tasks(uint256) view returns (uint256 id, address requester, address assignedExecutor, string action, uint256 reward, uint8 status, uint256 timestamp)"
        ], contractAddress, wallet);

        const count = await BotCall.taskCount();
        console.log(`Total Tasks: ${count}`);

        const robotInfo = await BotCall.robots(wallet.address);
        console.log(`Robot Registered: ${robotInfo.isRegistered}`);
        console.log(`Robot Reputation: ${robotInfo.tasksCompleted}`);

        if (count > 0) {
            const lastTask = await BotCall.tasks(count);
            console.log(`Last Task #${count}: Action="${lastTask.action}", Status=${lastTask.status}`);
        }

        console.log("Diagnostic complete. System nominal.");
    } catch (error) {
        console.error("DIAGNOSTIC FAILED:", error.message);
        if (error.message.includes("call revert exception")) {
            console.error("Suggestion: Check if CONTRACT_ADDRESS is correct and deployed on this network.");
        }
    }
}

main();
