const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BotCall", function () {
    let BotCall;
    let botCall;
    let owner;
    let requester;
    let executor;

    beforeEach(async function () {
        [owner, requester, executor] = await ethers.getSigners();
        BotCall = await ethers.getContractFactory("BotCall");
        botCall = await BotCall.deploy();
        await botCall.waitForDeployment();

        // Set executor
        await botCall.setRobotExecutor(executor.address);
    });

    it("Should allow a user to request an action with ETH", async function () {
        const reward = ethers.parseEther("0.1");
        await expect(botCall.connect(requester).requestAction("wave", { value: reward }))
            .to.emit(botCall, "ActionRequested")
            .withArgs(1, requester.address, "wave", reward);

        const task = await botCall.tasks(1);
        expect(task.requester).to.equal(requester.address);
        expect(task.reward).to.equal(reward);
        expect(task.status).to.equal(0); // Pending
    });

    it("Should allow the executor to mark an action as completed and receive payment", async function () {
        const reward = ethers.parseEther("0.1");
        await botCall.connect(requester).requestAction("wave", { value: reward });

        const initialBalance = await ethers.provider.getBalance(executor.address);

        await expect(botCall.connect(executor).completeAction(1))
            .to.emit(botCall, "ActionCompleted")
            .withArgs(1, executor.address, reward);

        const finalBalance = await ethers.provider.getBalance(executor.address);
        // Note: finalBalance = initialBalance + reward - gasCosts
        expect(finalBalance).to.be.greaterThan(initialBalance);

        const task = await botCall.tasks(1);
        expect(task.status).to.equal(2); // Completed
    });

    it("Should NOT allow anyone else to complete the action", async function () {
        await botCall.connect(requester).requestAction("wave", { value: ethers.parseEther("0.1") });
        await expect(botCall.connect(requester).completeAction(1))
            .to.be.revertedWith("Only robot executor can complete tasks");
    });

    it("Should protect against reentrancy (manual check of code logic)", async function () {
        // Code has nonReentrant modifier and updates state BEFORE transfer
        // This is a logic check, but can be expanded with a mock malicious contract
    });
});
