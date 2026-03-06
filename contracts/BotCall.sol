// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BotCall Protocol (Production Alpha)
 * @dev On-chain infrastructure for Agentic Robotics Economic Coordination.
 */
contract BotCall is Ownable, ReentrancyGuard {
    enum TaskStatus { Pending, Executing, Completed, Cancelled }

    struct Robot {
        bool isRegistered;
        string metadata; // e.g., IPFS hash to robot specs
        uint256 tasksCompleted;
    }

    struct Task {
        uint256 id;
        address requester;
        address assignedExecutor;
        string action;
        uint256 reward;
        TaskStatus status;
        uint256 timestamp;
    }

    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    mapping(address => Robot) public robots;
    
    event RobotRegistered(address indexed robot, string metadata);
    event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward);
    event ActionExecuting(uint256 indexed taskId, address indexed executor);
    event ActionCompleted(uint256 indexed taskId, address indexed executor, uint256 reward);
    event ActionCancelled(uint256 indexed taskId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register a robot in the protocol.
     */
    function registerRobot(string memory _metadata) external {
        robots[msg.sender] = Robot(true, _metadata, 0);
        emit RobotRegistered(msg.sender, _metadata);
    }

    /**
     * @dev User requests a robotic action with an ETH reward.
     */
    function requestAction(string memory _action) external payable nonReentrant {
        require(msg.value > 0, "Reward must be greater than zero");
        
        taskCount++;
        tasks[taskCount] = Task({
            id: taskCount,
            requester: msg.sender,
            assignedExecutor: address(0),
            action: _action,
            reward: msg.value,
            status: TaskStatus.Pending,
            timestamp: block.timestamp
        });

        emit ActionRequested(taskCount, msg.sender, _action, msg.value);
    }

    /**
     * @dev A registered robot accepts and starts executing a task.
     */
    function startExecuting(uint256 _taskId) external {
        require(robots[msg.sender].isRegistered, "Only registered robots");
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Pending, "Task not pending");
        
        task.status = TaskStatus.Executing;
        task.assignedExecutor = msg.sender;
        
        emit ActionExecuting(_taskId, msg.sender);
    }

    /**
     * @dev Robot completes the task and receives the reward.
     */
    function completeAction(uint256 _taskId) external nonReentrant {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.assignedExecutor, "Only assigned robot");
        require(task.status == TaskStatus.Executing, "Task not executing");

        task.status = TaskStatus.Completed;
        robots[msg.sender].tasksCompleted++;
        
        uint256 reward = task.reward;
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Payment failed");

        emit ActionCompleted(_taskId, msg.sender, reward);
    }

    /**
     * @dev Requester cancels task if it hasn't been executing.
     */
    function cancelTask(uint256 _taskId) external nonReentrant {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.requester, "Only requester can cancel");
        require(task.status == TaskStatus.Pending, "Cannot cancel if started");

        task.status = TaskStatus.Cancelled;
        uint256 reward = task.reward;
        
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Refund failed");

        emit ActionCancelled(_taskId);
    }

    receive() external payable {}
}
