// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BotCall
 * @dev A protocol for pay-per-action robotics.
 */
contract BotCall is ReentrancyGuard, Ownable {
    
    enum TaskStatus { Pending, Executing, Completed, Cancelled }

    struct Task {
        uint256 id;
        address requester;
        string action;
        uint256 reward;
        TaskStatus status;
    }

    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    address public robotExecutor;

    event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward);
    event ActionExecuting(uint256 indexed taskId);
    event ActionCompleted(uint256 indexed taskId, address indexed executor, uint256 reward);
    event RobotExecutorUpdated(address indexed newExecutor);

    constructor() Ownable(msg.sender) {
        robotExecutor = msg.sender; // Default executor is the owner
    }

    /**
     * @dev Sets the address allowed to complete tasks.
     * @param _executor The address of the robot/backend.
     */
    function setRobotExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "Invalid executor address");
        robotExecutor = _executor;
        emit RobotExecutorUpdated(_executor);
    }

    /**
     * @dev Request a robot action by sending ETH as a reward.
     * @param _action The description of the action (e.g., "wave", "scan room").
     */
    function requestAction(string calldata _action) external payable nonReentrant {
        require(msg.value > 0, "Reward must be greater than zero");
        
        taskCount++;
        tasks[taskCount] = Task({
            id: taskCount,
            requester: msg.sender,
            action: _action,
            reward: msg.value,
            status: TaskStatus.Pending
        });

        emit ActionRequested(taskCount, msg.sender, _action, msg.value);
    }

    /**
     * @dev Marks an action as completed and releases payment.
     * @param _taskId The ID of the task to complete.
     */
    function completeAction(uint256 _taskId) external nonReentrant {
        require(msg.sender == robotExecutor, "Only robot executor can complete tasks");
        
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Pending || task.status == TaskStatus.Executing, "Task is not in a valid state");
        
        task.status = TaskStatus.Completed;
        uint256 reward = task.reward;
        
        (bool success, ) = payable(robotExecutor).call{value: reward}("");
        require(success, "Transfer failed");

        emit ActionCompleted(_taskId, robotExecutor, reward);
    }

    /**
     * @dev (Optional) Update status to Executing to inform the frontend.
     */
    function startExecuting(uint256 _taskId) external {
        require(msg.sender == robotExecutor, "Only robot executor can update status");
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Pending, "Task already executing or completed");
        
        task.status = TaskStatus.Executing;
        emit ActionExecuting(_taskId);
    }

    /**
     * @dev Fallback function to accept ETH.
     */
    receive() external payable {}
}
