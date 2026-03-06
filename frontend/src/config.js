export const CONTRACT_ADDRESS = "0x3dB23698E922432730D7169CF79b85EA51416e49"; // Base Sepolia
export const BASE_SEPOLIA_CHAIN_ID = "0x14a34"; // 84532

export const BOT_CALL_ABI = [
    "function requestAction(string action) external payable",
    "event ActionRequested(uint256 indexed taskId, address indexed requester, string action, uint256 reward)",
    "event ActionExecuting(uint256 indexed taskId)",
    "event ActionCompleted(uint256 indexed taskId, address indexed executor, uint256 reward)",
    "function tasks(uint256) view returns (uint256 id, address requester, string action, uint256 reward, uint8 status)",
    "function taskCount() view returns (uint256)"
];
