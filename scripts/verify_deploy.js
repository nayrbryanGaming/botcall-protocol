const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Wallet address:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    const transactionCount = await provider.getTransactionCount(wallet.address);
    console.log("Transaction count:", transactionCount);

    // Get the address of the last deployed contract if the last tx was a contract creation
    const nonce = transactionCount - 1;
    if (nonce >= 0) {
        const contractAddress = ethers.getCreateAddress({
            from: wallet.address,
            nonce: nonce
        });
        console.log("Last deployed contract address (predicted from nonce):", contractAddress);
    }
}

main().catch(console.error);
