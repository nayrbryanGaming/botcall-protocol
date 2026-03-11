export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x408B7c870Ce7bd5Db3FBF92eDAA99C7b5e7AdDD1";

export const BASE_SEPOLIA_CHAIN_ID = "0x14a34"; // 84532

export const BOT_CALL_ABI = [
    "function requestAction(string action) external payable",
    "event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward, uint256 timestamp)",
    "event ActionExecuting(uint256 indexed taskId, address indexed executor, uint256 timestamp)",
    "event ActionCompleted(uint256 indexed taskId, address indexed executor, uint256 reward, uint256 timestamp)",
    "event ActionCancelled(uint256 indexed taskId, uint256 timestamp)",
    "event RobotRegistered(address indexed robot, string metadata)",
    "function tasks(uint256) view returns (uint256 id, address requester, address assignedExecutor, string action, uint256 reward, uint8 status, uint256 timestamp)",
    "function robots(address) view returns (bool isRegistered, string metadata, uint256 tasksCompleted)",
    "function taskCount() view returns (uint256)",
    "function getLatestTasks(uint256 count) view returns (tuple(uint256 id, address requester, address assignedExecutor, string action, uint256 reward, uint8 status, uint256 timestamp)[])",
    "function registerRobot(string _metadata) external",
    "function startExecuting(uint256 _taskId) external",
    "function completeAction(uint256 _taskId) external",
    "function cancelTask(uint256 _taskId) external"
];
