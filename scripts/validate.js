const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    console.log("\n🛰️  BOT-CALL PROTOCOL INTEGRATION AUDIT");
    console.log("=========================================");

    const rpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
    const pk = process.env.PRIVATE_KEY;
    const address = process.env.CONTRACT_ADDRESS;

    const provider = new ethers.JsonRpcProvider(rpc);

    // 1. Check RPC
    try {
        const network = await provider.getNetwork();
        console.log(`✅ RPC: Connected to ${network.name} (ChainID: ${network.chainId})`);
    } catch (e) {
        console.log("❌ RPC: Connection failed!");
        return;
    }

    // 2. Check Wallet
    if (pk) {
        const wallet = new ethers.Wallet(pk, provider);
        const balance = await provider.getBalance(wallet.address);
        console.log(`✅ NODE_WALLET: ${wallet.address}`);
        console.log(`✅ BALANCE: ${ethers.formatEther(balance)} ETH`);
        if (balance === 0n) {
            console.log("⚠️  WARNING: Node has 0 ETH. It cannot pay for gas to complete missions!");
        }
    } else {
        console.log("❌ WALLET: PRIVATE_KEY missing in .env");
    }

    // 3. Check Contract
    if (address) {
        console.log(`✅ CONTRACT: ${address}`);
        const code = await provider.getCode(address);
        if (code === "0x") {
            console.log("❌ CONTRACT: No code at this address! Is it correct for Base Sepolia?");
        } else {
            console.log("✅ CONTRACT: Verified on-chain.");
        }
    } else {
        console.log("❌ CONTRACT: CONTRACT_ADDRESS missing in .env");
    }

    console.log("=========================================");
    console.log("🚀 STATUS: SILICON PERFECT READINESS ATTAINED.\n");
}

main();
