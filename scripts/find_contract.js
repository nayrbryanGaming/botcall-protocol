const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const count = await provider.getTransactionCount(wallet.address);
    for (let i = count - 1; i >= 0; i--) {
        const address = ethers.getCreateAddress({ from: wallet.address, nonce: i });
        const code = await provider.getCode(address);
        if (code !== "0x") {
            console.log("FOUND_ADDRESS:" + address);
            return;
        }
    }
}

main().catch(console.error);
