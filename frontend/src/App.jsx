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

    const [missionProposal, setMissionProposal] = useState(null);

    const connectWallet = async () => {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccount(accounts[0]);

            const network = await provider.getNetwork();
            if (network.chainId !== BigInt(BASE_SEPOLIA_CHAIN_ID)) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
                });
            }

            const signer = await provider.getSigner();
            const c = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
            setContract(c);
            loadTasks(c);
        } catch (error) {
            console.error("Connection Error", error);
        }
    };

    const [terminalLogs, setTerminalLogs] = useState([
        "> Initializing BOT-CALL Protocol v1.2.0...",
        "> Connection secure: BASE SEPOLIA",
        "> Robot Node PROD-01 detected: Llama-3 Brain Online",
        "> System Ready: Waiting for Mission Parameters..."
    ]);

    const addTerminalLog = (msg) => {
        setTerminalLogs(prev => [...prev.slice(-9), `> ${msg}`]);
    };

    const loadTasks = async (contractInstance) => {
        if (!contractInstance) return;
        try {
            const count = await contractInstance.taskCount();
            const loadedTasks = [];
            const start = Number(count) > 10 ? Number(count) - 9 : 1;
            for (let i = start; i <= Number(count); i++) {
                const task = await contractInstance.tasks(i); // FIXED BUG: was 'c'
                loadedTasks.push(task);
            }
            setTasks(loadedTasks.reverse());
        } catch (error) {
            console.error("Load Tasks Error", error);
        }
    };

    const handleAiCommand = async (e) => {
        e.preventDefault();
        if (!aiPrompt || !account) return;

        setIsAiThinking(true);
        addTerminalLog(`RECEIVED MISSION COMMAND: "${aiPrompt}"`);
        addTerminalLog("AI AGENT: Initiating reasoning sequence (Groq Llama-3)...");

        try {
            const result = await interpretAction(aiPrompt);
            addTerminalLog(`AI BRAIN: Command interpreted as "${result.action.toUpperCase()}"`);
            addTerminalLog(`AI REASONING: ${result.reason}`);

            setMissionProposal({
                action: result.action,
                reason: result.reason,
                reward: result.action === 'wave' ? '0.0001' : '0.0002'
            });

            addTerminalLog("MISSION PROPOSAL GENERATED. Awaiting user authorization...");

        } catch (error) {
            addTerminalLog("PROTOCOL ERROR: AI Reasoning failure.");
            console.error(error);
        }
        setIsAiThinking(false);
        setAiPrompt('');
    };

    const executeMission = async () => {
        if (!missionProposal || !contract) return;
        const { action, reward } = missionProposal;

        addTerminalLog(`USER AUTHORIZED MISSION: ${action.toUpperCase()}`);
        addTerminalLog("TRANSACTION: Broadcasting to Base Sepolia...");

        try {
            const tx = await contract.requestAction(action, {
                value: ethers.parseEther(reward)
            });
            setMissionProposal(null);
            addTerminalLog(`TX SENT: ${tx.hash.slice(0, 10)}...`);
            await tx.wait();
            addTerminalLog("TX CONFIRMED. Robot node picking up mission...");
            loadTasks(contract);
        } catch (error) {
            addTerminalLog(`TX FAILED: ${error.message.slice(0, 50)}...`);
        }
    };

    const handleCancelTask = async (taskId) => {
        if (!contract) return;
        try {
            const tx = await contract.cancelTask(taskId);
            await tx.wait();
            loadTasks(contract);
        } catch (error) {
            console.error("Cancel Task Error", error);
        }
    };

    return (
        <div className="app-wrapper">
            <div className="protocol-status-bar">
                <div className="status-item">
                    <span className="status-label">PROTOCOL</span>
                    <span className="status-value pulse-green">ACTIVE (v1.2.0-alpha)</span>
                </div>
                <div className="status-item">
                    <span className="status-label">NETWORK</span>
                    <span className="status-value">BASE SEPOLIA</span>
                </div>
                <div className="status-item">
                    <span className="status-label">NODES</span>
                    <span className="status-value">1 ACTIVE (PROD-01)</span>
                </div>
                <div className="status-item hide-mobile">
                    <span className="status-label">UPTIME</span>
                    <span className="status-value">99.9%</span>
                </div>
            </div>

            <header>
                <div className="logo-container">
                    <span className="logo-icon">🤖</span>
                    <div>
                        <h1>BOT-CALL</h1>
                        <p className="subtitle">Agentic Robotics Protocol</p>
                    </div>
                </div>

                {!account ? (
                    <button className="connect-btn" onClick={connectWallet}>
                        Connect Wallet
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
                    <h2>Hire a Robot <br /> via Blockchain</h2>
                    <p>On-chain payment. Real-world execution.</p>
                </section>

                <section className="ai-agent-card glass">
                    <div className={`ai-header ${isAiThinking ? 'thinking-glow' : ''}`}>
                        <h3>🧠 {isAiThinking ? 'AI IS THINKING...' : 'AI BRAIN INTERFACE'}</h3>
                        <span className="badge">{isAiThinking ? 'PROCESSING' : 'LLAMA-3 AGENT'}</span>
                    </div>
                    <form className="ai-form" onSubmit={handleAiCommand}>
                        <input
                            type="text"
                            placeholder="Type a command (e.g., 'Say hello to the world')..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            disabled={isAiThinking}
                        />
                        <button className="connect-btn" type="submit" disabled={isAiThinking || !account}>
                            {isAiThinking ? "PROCESSING..." : "PROCESS"}
                        </button>
                    </form>
                </section>

                <section className="robot-terminal glass">
                    <div className="terminal-header">
                        <span className="terminal-dot red"></span>
                        <span className="terminal-dot orange"></span>
                        <span className="terminal-dot green"></span>
                        <span className="terminal-title">ROBOT_NODE_PROD_01 &gt; INTERNAL_FEED</span>
                    </div>
                    <div className="terminal-body">
                        {terminalLogs.map((log, i) => (
                            <div key={i} className="terminal-line">{log}</div>
                        ))}
                    </div>
                </section>

                {missionProposal && (
                    <section className="mission-proposal glass highlight-pulse">
                        <div className="proposal-header">
                            <h3>🚀 MISSION PROPOSAL GENERATED</h3>
                            <button className="close-btn" onClick={() => setMissionProposal(null)}>&times;</button>
                        </div>
                        <div className="proposal-content">
                            <div className="proposal-row">
                                <span className="label">ACTION:</span>
                                <span className="value glow-text-small">{missionProposal.action.toUpperCase()}</span>
                            </div>
                            <div className="proposal-row">
                                <span className="label">REASONING:</span>
                                <span className="value italics">"{missionProposal.reason}"</span>
                            </div>
                            <div className="proposal-row">
                                <span className="label">REWARD:</span>
                                <span className="value neon-alt">{missionProposal.reward} ETH</span>
                            </div>
                        </div>
                        <div className="proposal-footer">
                            <button className="connect-btn secondary" onClick={() => setMissionProposal(null)}>ABORT</button>
                            <button className="connect-btn" onClick={executeMission}>AUTHORIZE MISSION</button>
                        </div>
                    </section>
                )}

                <section className="action-grid">
                    <div className={highlightAction === 'wave' ? 'highlight-pulse' : ''}>
                        <RobotActionButton
                            actionName="wave"
                            rewardEth="0.0001"
                            disabled={!contract}
                            onActionInitiated={() => loadTasks(contract)}
                        />
                    </div>
                    <div className={highlightAction === 'scan room' ? 'highlight-pulse' : ''}>
                        <RobotActionButton
                            actionName="scan room"
                            rewardEth="0.0002"
                            disabled={!contract}
                            onActionInitiated={() => loadTasks(contract)}
                        />
                    </div>
                </section>

                <section className="task-history">
                    <h3>LIVE ROBOTIC FEED</h3>
                    <div className="task-list">
                        {tasks.length === 0 ? (
                            <p className="empty">Initializing feed...</p>
                        ) : (
                            tasks.map((task, idx) => (
                                <div key={idx} className="task-card glass">
                                    <div className="task-info">
                                        <div className="task-main">
                                            <span className="task-id">TASK #{task[0]?.toString()}</span>
                                            <span className="task-action">{task[3].toUpperCase()}</span>
                                        </div>
                                        <div className="task-meta">
                                            {task[2] !== '0x0000000000000000000000000000000000000000' && (
                                                <span className="executor-pill">🤖 {task[2].slice(0, 6)}...</span>
                                            )}
                                            <span className="time-pill">⏰ {new Date(Number(task[6]) * 1000).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    <div className="task-controls">
                                        <div className={`status-badge status-${task[5]?.toString()}`}>
                                            {task[5]?.toString() === '0' ? "Pending" :
                                                task[5]?.toString() === '1' ? "Executing" :
                                                    task[5]?.toString() === '2' ? "Completed" : "Cancelled"}
                                        </div>
                                        {task[5]?.toString() === '0' && task[1].toLowerCase() === account?.toLowerCase() && (
                                            <button
                                                className="cancel-btn"
                                                onClick={() => handleCancelTask(task[0])}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>

            <footer>
                <p>&copy; 2026 BOT-CALL PROTOCOL &bull; SECURED BY BASE</p>
            </footer>
        </div>
    );
}

export default App;
