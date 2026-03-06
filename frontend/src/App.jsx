import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, BOT_CALL_ABI, BASE_SEPOLIA_CHAIN_ID } from './config';
import { interpretAction } from './services/aiAgent';
import RobotActionButton from './components/RobotActionButton';
import './App.css';

function App() {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiThinking, setIsAiThinking] = useState(false);

    useEffect(() => {
        if (window.ethereum) {
            const p = new ethers.BrowserProvider(window.ethereum);
            setProvider(p);
        }
    }, []);

    const connectWallet = async () => {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccount(accounts[0]);

            // Request network switch to Base Sepolia
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
            });

            const signer = await provider.getSigner();
            const c = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
            setContract(c);
            loadTasks(c);
        } catch (error) {
            console.error("Connection Error", error);
        }
    };

    const loadTasks = async (c) => {
        try {
            const count = await c.taskCount();
            const loadedTasks = [];
            for (let i = 0; i < Number(count); i++) {
                const task = await c.tasks(i);
                loadedTasks.push(task);
            }
            setTasks(loadedTasks.reverse());
        } catch (error) {
            console.error("Load Tasks Error", error);
        }
    };

    const handleAiCommand = async (e) => {
        e.preventDefault();
        if (!aiPrompt || !contract) return;

        setIsAiThinking(true);
        const action = await interpretAction(aiPrompt);
        setIsAiThinking(false);

        if (action) {
            alert(`AI decided to: ${action}`);
            // The RobotActionButton handles the transaction, but we can trigger it here too if we want.
            // For the demo flow, we'll just encourage the user to click the button or trigger it programmatically.
            setAiPrompt("");
        } else {
            alert("AI couldn't decide on an action. Try 'wave' or 'scan'.");
        }
    };

    return (
        <div className="container">
            <header>
                <div className="logo-container">
                    <span className="logo-icon">🤖</span>
                    <h1>BOT-CALL</h1>
                </div>
                <p className="subtitle">Agentic Robotics Protocol</p>

                {!account ? (
                    <button className="connect-btn" onClick={connectWallet}>
                        Connect MetaMask
                    </button>
                ) : (
                    <div className="account-info">
                        <span className="dot active"></span>
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                )}
            </header>

            <main>
                <section className="hero">
                    <h2>Hire a Robot via Blockchain</h2>
                    <p>Request real-world actions with Base Sepolia ETH.</p>
                </section>

                {/* AI Agent Section */}
                <section className="ai-agent-card">
                    <div className="ai-header">
                        <h3>🧠 AI COMMAND CENTER</h3>
                        <span className="badge">POWERED BY LLAMA-3</span>
                    </div>
                    <form className="ai-form" onSubmit={handleAiCommand}>
                        <input
                            type="text"
                            placeholder="e.g. 'clean my room' or 'say hello'..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            disabled={isAiThinking}
                        />
                        <button type="submit" disabled={isAiThinking || !account}>
                            {isAiThinking ? "THINKING..." : "ASK AI"}
                        </button>
                    </form>
                    <p className="ai-hint">AI Agent will interpret your command and map it to robot actions.</p>
                </section>

                <section className="action-grid">
                    <RobotActionButton
                        label="Hire to Wave"
                        action="wave"
                        reward="0.001"
                        contract={contract}
                        onSuccess={() => loadTasks(contract)}
                    />
                    <RobotActionButton
                        label="Hire to Scan Room"
                        action="scan room"
                        reward="0.001"
                        contract={contract}
                        onSuccess={() => loadTasks(contract)}
                    />
                </section>

                <section className="task-history">
                    <h3>Recent Robotic Tasks</h3>
                    <div className="task-list">
                        {tasks.length === 0 ? (
                            <p className="empty">No tasks yet.</p>
                        ) : (
                            tasks.map((task, idx) => (
                                <div key={idx} className="task-card">
                                    <div className="task-main">
                                        <span className="task-id">#{Number(task[0])}</span>
                                        <span className="task-action">{task[2]}</span>
                                    </div>
                                    <div className={`status-badge status-${task[4]}`}>
                                        {task[4] === 0n ? "Pending" : task[4] === 1n ? "Executing" : "Completed"}
                                    </div>
                                </div>
                            ))
                        )}
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
