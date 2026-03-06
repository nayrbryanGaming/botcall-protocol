import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RobotActionButton from './components/RobotActionButton';
import { CONTRACT_ADDRESS, BOT_CALL_ABI } from './config';
import './App.css';

function App() {
    const [account, setAccount] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [status, setStatus] = useState("Idle");

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
            } catch (err) {
                console.error(err);
            }
        } else {
            alert("MetaMask not detected");
        }
    };

    useEffect(() => {
        if (account && CONTRACT_ADDRESS) {
            setupEventListener();
        }
    }, [account]);

    const setupEventListener = async () => {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, provider);

        contract.on("ActionRequested", (taskId, requester, action, reward) => {
            if (requester.toLowerCase() === account.toLowerCase()) {
                setTasks(prev => [...prev, { id: taskId, action, status: "Pending", reward: ethers.formatEther(reward) }]);
            }
        });

        contract.on("ActionExecuting", (taskId) => {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "Executing" } : t));
        });

        contract.on("ActionCompleted", (taskId) => {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "Completed" } : t));
        });
    };

    return (
        <div className="App">
            <div className="wallet-info">
                {account ? (
                    <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
                ) : (
                    <button onClick={connectWallet} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Connect Wallet</button>
                )}
            </div>

            <header>
                <h1>BOT-CALL</h1>
                <p className="subtitle">On-chain protocol for real-world robotic actions</p>
            </header>

            {!CONTRACT_ADDRESS && (
                <div style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4d4d', padding: '1rem', borderRadius: '10px', marginBottom: '2rem' }}>
                    <strong>Attention:</strong> Contract not deployed yet. Please deploy the contract and update <code>config.js</code>.
                </div>
            )}

            <div className="card-container">
                <RobotActionButton
                    actionName="WAVE"
                    rewardEth="0.001"
                    disabled={!account}
                    onActionInitiated={(hash) => console.log("Init:", hash)}
                />
                <RobotActionButton
                    actionName="SCAN ROOM"
                    rewardEth="0.005"
                    disabled={!account}
                    onActionInitiated={(hash) => console.log("Init:", hash)}
                />
            </div>

            <div className="task-history" style={{ marginTop: '4rem', textAlign: 'left' }}>
                <h2>Active Tasks</h2>
                {tasks.length === 0 ? (
                    <p style={{ color: '#666' }}>No actions requested yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {tasks.map(task => (
                            <div key={task.id.toString()} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{task.action}</strong>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>ID: {task.id.toString()} • Reward: {task.reward} ETH</div>
                                </div>
                                <span className={`status-badge status-${task.status.toLowerCase()}`}>
                                    {task.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
