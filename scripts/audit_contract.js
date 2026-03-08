const { ethers } = require("ethers");
require("dotenv").config();

async function check() {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    const contractAddress = "0x2A62eeC69cB289cFAfFc6a37503Fd66fa5f751cF";
    const abi = [
        "function taskCount() view returns (uint256)",
        "function owner() view returns (address)",
        "function robots(address) view returns (bool isRegistered, string metadata, uint256 tasksCompleted)"
    ];

    console.log("Checking contract at:", contractAddress);
    try {
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const count = await contract.taskCount();
        const owner = await contract.owner();
        console.log("Task Count:", count.toString());
        console.log("Contract Owner:", owner);

        console.log("Checking robot status for:", process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY).address : "N/A");
        const robot = await contract.robots(new ethers.Wallet(process.env.PRIVATE_KEY).address);
        console.log("Is Registered:", robot.isRegistered);

        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
            console.error("CRITICAL: No contract code found at this address!");
        } else {
            console.log("Contract code detected. Bytes:", code.length);
        }
    } catch (e) {
        console.error("Error checking contract:", e.message);
    }
}

check();
