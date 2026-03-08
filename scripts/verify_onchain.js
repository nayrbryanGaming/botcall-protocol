const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const wallet = new ethers.Wallet("3ed7524b66da7ebedb2618692bdbf46ca3342b0aa931a1f79f7758ab651ecb41", provider);
    const contractAddress = "0x2A62eeC69cB289cFAfFc6a37503Fd66fa5f751cF";

    console.log("Checking Node: " + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance: " + ethers.formatEther(balance) + " ETH");

    const abi = ["function robots(address) view returns (bool, string, uint256)"];
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const [isRegistered, metadata, tasks] = await contract.robots(wallet.address);
    console.log("Is Registered: " + isRegistered);
    console.log("Metadata: " + metadata);
    console.log("Tasks: " + tasks);
}

main().catch(console.error);
