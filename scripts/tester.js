const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

    if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
        console.error("Missing PRIVATE_KEY or CONTRACT_ADDRESS");
        return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const abi = ["function requestAction(string action) external payable"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`Sending mission request to ${CONTRACT_ADDRESS}...`);
    try {
        const tx = await contract.requestAction("wave", {
            value: ethers.parseEther("0.0001")
        });
        console.log(`TX Sent: ${tx.hash}`);
        await tx.wait();
        console.log("TX Confirmed!");
    } catch (e) {
        console.error("FAILED:", e.message);
    }
}

main();
