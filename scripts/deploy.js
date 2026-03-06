const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const BotCall = await hre.ethers.getContractFactory("BotCall");
    const botCall = await BotCall.deploy();

    await botCall.waitForDeployment();

    const address = await botCall.getAddress();
    console.log(`BotCall deployed to: ${address}`);
    fs.writeFileSync("address.txt", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

