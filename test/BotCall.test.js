const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("BotCall Production Alpha", function () {
    let BotCall;
    let botCall;
    let owner;
    let requester;
    let robot;

    beforeEach(async function () {
        [owner, requester, robot] = await ethers.getSigners();
        BotCall = await ethers.getContractFactory("BotCall");
        botCall = await BotCall.deploy();
        await botCall.waitForDeployment();

        // Register the robot
        await botCall.connect(robot).registerRobot("Test-Robot-v1");
    });

    it("Should allow robot registration and track reputation", async function () {
        const info = await botCall.robots(robot.address);
        expect(info.isRegistered).to.equal(true);
        expect(info.metadata).to.equal("Test-Robot-v1");
        expect(info.tasksCompleted).to.equal(0);
    });

    it("Should allow a user to request an action", async function () {
        const reward = ethers.parseEther("0.1");
        await expect(botCall.connect(requester).requestAction("SCAN", { value: reward }))
            .to.emit(botCall, "ActionRequested")
            .withArgs(1, requester.address, "SCAN", reward, anyValue);

        const task = await botCall.tasks(1);
        expect(task.status).to.equal(0); // Pending
    });

    it("Should allow a registered robot to claim and complete a task", async function () {
        const reward = ethers.parseEther("0.1");
        await botCall.connect(requester).requestAction("wave", { value: reward });

        // Claim task
        await expect(botCall.connect(robot).startExecuting(1))
            .to.emit(botCall, "ActionExecuting")
            .withArgs(1, robot.address, anyValue);

        // Complete task
        const initialBalance = await ethers.provider.getBalance(robot.address);
        await expect(botCall.connect(robot).completeAction(1))
            .to.emit(botCall, "ActionCompleted")
            .withArgs(1, robot.address, reward, anyValue);

        const finalBalance = await ethers.provider.getBalance(robot.address);
        expect(finalBalance).to.be.greaterThan(initialBalance);

        const robotInfo = await botCall.robots(robot.address);
        expect(robotInfo.tasksCompleted).to.equal(1);
    });

    it("Should NOT allow unassigned robot to complete a task", async function () {
        await botCall.connect(requester).requestAction("wave", { value: ethers.parseEther("0.1") });
        await botCall.connect(robot).startExecuting(1);

        // Another wallet tries to complete
        const signers = await ethers.getSigners();
        const anotherRobot = signers[3];
        await expect(botCall.connect(anotherRobot).completeAction(1))
            .to.be.revertedWith("Only assigned robot");
    });

    it("Should allow requester to cancel a pending task", async function () {
        await botCall.connect(requester).requestAction("wave", { value: ethers.parseEther("0.1") });

        await expect(botCall.connect(requester).cancelTask(1))
            .to.emit(botCall, "ActionCancelled")
            .withArgs(1, anyValue);

        const task = await botCall.tasks(1);
        expect(task.status).to.equal(3); // Cancelled
    });
});
