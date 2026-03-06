const hre = require("hardhat");

async function main() {
    const BotCall = await hre.ethers.getContractFactory("BotCall");
    const botCall = await BotCall.deploy();

    await botCall.waitForDeployment();

    console.log(`BotCall deployed to: ${await botCall.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
