import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, BOT_CALL_ABI, BASE_SEPOLIA_CHAIN_ID } from './config';
import { interpretAction } from './services/aiAgent';
import RobotActionButton from './components/RobotActionButton';
import './index.css';

function App() {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [highlightAction, setHighlightAction] = useState(null);

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
        setHighlightAction(null);
        const action = await interpretAction(aiPrompt);
        setIsAiThinking(false);

        if (action) {
            setHighlightAction(action);
            const msg = action === 'wave'
                ? "AI mapping: 'WAVE' action detected! Confirm the transaction below."
                : "AI mapping: 'SCAN' action detected! Confirm the transaction below.";
            alert(msg);
            setAiPrompt("");
        } else {
            alert("AI Agent is unsure. Please try simpler commands like 'wave' or 'scan'.");
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

                <section className="ai-agent-card">
                    <div className="ai-header">
                        <h3>🧠 AI COMMAND CENTER</h3>
                        <span className="badge">POWERED BY LLAMA-3</span>
                    </div>
                    <form className="ai-form" onSubmit={handleAiCommand}>
                        <input
                            type="text"
                            placeholder="e.g. 'Can the robot greet the guests?'..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            disabled={isAiThinking}
                        />
                        <button type="submit" disabled={isAiThinking || !account}>
                            {isAiThinking ? "THINKING..." : "ASK AI"}
                        </button>
                    </form>
                    <p className="ai-hint">The AI Agent interprets your intent and maps it to on-chain robotic actions.</p>
                </section>

                <section className="action-grid">
                    <div className={highlightAction === 'wave' ? 'highlight-pulse' : ''}>
                        <RobotActionButton
                            label="Hire to Wave"
                            action="wave"
                            reward="0.001"
                            contract={contract}
                            onSuccess={() => loadTasks(contract)}
                        />
                    </div>
                    <div className={highlightAction === 'scan room' ? 'highlight-pulse' : ''}>
                        <RobotActionButton
                            label="Hire to Scan Room"
                            action="scan room"
                            reward="0.001"
                            contract={contract}
                            onSuccess={() => loadTasks(contract)}
                        />
                    </div>
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
                                        <span className="task-id">#{task[0]?.toString() || idx}</span>
                                        <span className="task-action">{task[2]}</span>
                                    </div>
                                    <div className={`status-badge status-${task[4]?.toString()}`}>
                                        {task[4]?.toString() === '0' ? "Pending" : task[4]?.toString() === '1' ? "Executing" : "Completed"}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>

            <footer>
                <p>Built with ❤️ for Agentic Robotics &bull; Base Sepolia</p>
            </footer>
        </div>
    );
}

export default App;
