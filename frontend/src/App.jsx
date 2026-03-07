import React, { useState, useEffect, useRef } from 'react';
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

    const terminalEndRef = useRef(null);
    const [terminalLogs, setTerminalLogs] = useState([
        "INIT // BOT-CALL CORE v1.3.0",
        "NET  // CONNECTING TO BASE SEPOLIA...",
        "AUTH // NEURAL INTERFACE (GROQ-LLAMA3) READY",
        "ROBOT// PROD_NODE_01 STANDBY"
    ]);

    const scrollToBottom = () => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [terminalLogs]);

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
            addTerminalLog(`CONNECTED: Wallet ${accounts[0].slice(0, 10)}... synced.`);
        } catch (error) {
            console.error("Connection Error", error);
            addTerminalLog(`SYNC ERROR: Wallet connection rejected.`);
        }
    };

    const addTerminalLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminalLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
    };

    const loadTasks = async (contractInstance) => {
        if (!contractInstance) return;
        try {
            // Log connection attempt for debugging
            const addr = await contractInstance.getAddress();
            console.log("Syncing with contract:", addr);

            const latestTasks = await contractInstance.getLatestTasks(10);
            // Handle Result object safely
            const taskArray = Array.from(latestTasks).map(t => Array.from(t));
            setTasks(taskArray);

            addTerminalLog(`SYNC // Contract ${addr.slice(0, 8)}... synced. ${taskArray.length} missions.`);
        } catch (error) {
            console.error("Load Tasks Error:", error);
            addTerminalLog(`ERR // Sync failed. Check network/contract.`);

            // Fallback for older contract versions
            try {
                const count = await contractInstance.taskCount();
                const loadedTasks = [];
                const startIdx = Number(count) > 8 ? Number(count) - 7 : 1;
                for (let i = startIdx; i <= Number(count); i++) {
                    const t = await contractInstance.tasks(i);
                    loadedTasks.push(t);
                }
                setTasks(loadedTasks.reverse());
            } catch (fallbackError) {
                console.error("Fallback Sync Error:", fallbackError);
            }
        }
    };

    const handleAiCommand = async (e) => {
        e.preventDefault();
        if (!aiPrompt || !account) return;

        setIsAiThinking(true);
        addTerminalLog(`CMD >> "${aiPrompt}"`);
        addTerminalLog("AI >> Analyzing request via Groq-Llama3...");

        try {
            const result = await interpretAction(aiPrompt);
            addTerminalLog(`AI >> Reasoning: "${result.reason}"`);
            addTerminalLog(`AI >> Action determined: ${result.action.toUpperCase()}`);

            setMissionProposal({
                action: result.action,
                reason: result.reason,
                reward: result.action === 'wave' ? '0.0001' : '0.0002'
            });

            addTerminalLog("SYS >> Mission Proposal generated. Waiting for user Auth.");

        } catch (error) {
            addTerminalLog("ERR >> AI interface failed.");
            console.error(error);
        }
        setIsAiThinking(false);
        setAiPrompt('');
    };

    const executeMission = async () => {
        if (!missionProposal || !contract) return;
        const { action, reward } = missionProposal;

        addTerminalLog(`USER >> MISSION AUTHORIZED: ${action.toUpperCase()}`);
        addTerminalLog("TX >> Broadcasting to Base Sepolia...");

        try {
            const tx = await contract.requestAction(action, {
                value: ethers.parseEther(reward)
            });
            setMissionProposal(null);
            addTerminalLog(`TX >> SENT: ${tx.hash.slice(0, 16)}...`);
            await tx.wait();
            addTerminalLog("TX >> CONFIRMED. Robot Node starting execution.");
            loadTasks(contract);
        } catch (error) {
            addTerminalLog(`TX >> FAILED: User rejected or gas error.`);
        }
    };

    return (
        <div className="app-wrapper">
            <div className="protocol-status-bar">
                <div className="status-item">
                    <span className="status-label">PROTOCOL</span>
                    <span className="status-value pulse-primary">BOT-CALL v1.3.0</span>
                </div>
                <div className="status-item">
                    <span className="status-label">NET</span>
                    <span className="status-value">BASE SEPOLIA</span>
                </div>
                <div className="status-item">
                    <span className="status-label">STATUS</span>
                    <span className="status-value">NOMINAL</span>
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
                        Initialize Terminal
                    </button>
                ) : (
                    <div className="account-info">
                        <span className="dot"></span>
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                )}
            </header>

            <main>
                <section className="hero">
                    <h2>Own a Robot <br /> for a Minute</h2>
                    <p>On-chain coordination for real-world robotic actions.</p>
                </section>

                <div className="dashboard-grid">
                    <section className="left-panel">
                        <section className="ai-agent-card glass">
                            <div className="ai-header">
                                <h3>🧠 AI BRAIN INTERFACE</h3>
                                <span className={`badge ${isAiThinking ? 'pulse-primary' : ''}`}>
                                    {isAiThinking ? 'Thinking' : 'Ready'}
                                </span>
                            </div>
                            <form className="ai-form" onSubmit={handleAiCommand}>
                                <input
                                    type="text"
                                    placeholder="e.g., 'Say hello' or 'Scan the area'..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    disabled={isAiThinking}
                                />
                                <button className="connect-btn" type="submit" disabled={isAiThinking || !account}>
                                    {isAiThinking ? "..." : "PROCESS"}
                                </button>
                            </form>
                        </section>

                        <section className="robot-terminal glass">
                            <div className="terminal-header">
                                <span className="terminal-dot red"></span>
                                <span className="terminal-dot orange"></span>
                                <span className="terminal-dot green"></span>
                                <span className="terminal-title">TERMINAL_OUTPUT // NODE_PROD_1</span>
                            </div>
                            <div className="terminal-body">
                                {terminalLogs.map((log, i) => (
                                    <div key={i} className="terminal-line">{log}</div>
                                ))}
                                <div ref={terminalEndRef} />
                            </div>
                        </section>
                    </section>

                    {missionProposal && (
                        <section className="mission-proposal glass">
                            <div className="ai-header">
                                <h3>🚀 MISSION PROPOSAL</h3>
                                <button className="close-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setMissionProposal(null)}>&times;</button>
                            </div>
                            <div className="proposal-content">
                                <div className="proposal-row">
                                    <span className="label">ACTION:</span>
                                    <span className="value glow-text">{missionProposal.action.toUpperCase()}</span>
                                </div>
                                <div className="proposal-row">
                                    <span className="label">REASON:</span>
                                    <span className="value">"{missionProposal.reason}"</span>
                                </div>
                                <div className="proposal-row">
                                    <span className="label">REWARD:</span>
                                    <span className="value neon-green">{missionProposal.reward} ETH</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button className="connect-btn" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} onClick={() => setMissionProposal(null)}>ABORT</button>
                                <button className="connect-btn" onClick={executeMission}>AUTHORIZE MISSION</button>
                            </div>
                        </section>
                    )}
                </div>

                <section className="action-grid">
                    <RobotActionButton
                        actionName="wave"
                        rewardEth="0.0001"
                        disabled={!contract}
                        onActionInitiated={() => loadTasks(contract)}
                    />
                    <RobotActionButton
                        actionName="scan room"
                        rewardEth="0.0002"
                        disabled={!contract}
                        onActionInitiated={() => loadTasks(contract)}
                    />
                </section>

                <section className="task-history">
                    <h3>LIVE ROBOTIC FEED</h3>
                    <div className="task-list">
                        {tasks.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Waiting for robotic synchronization...</p>
                        ) : (
                            tasks.map((task, idx) => (
                                <div key={idx} className="task-card glass">
                                    <div className="task-main">
                                        <span className="task-id">#{task[0]?.toString()}</span>
                                        <span className="task-action">{task[3]?.toString().toUpperCase()}</span>
                                    </div>
                                    <div className={`status-badge status-${task[5]?.toString()}`}>
                                        {task[5]?.toString() === '0' ? "Pending" :
                                            task[5]?.toString() === '1' ? "In Progress" :
                                                task[5]?.toString() === '2' ? "Completed" : "Cancelled"}
                                    </div>
                                    <div className="task-reward" style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>
                                        {ethers.formatEther(task[4] || 0n)} ETH
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>

            <footer style={{ marginTop: '5rem', padding: '3rem', borderTop: '1px solid var(--card-border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                <p>&copy; 2026 BOT-CALL PROTOCOL &bull; AUTONOMOUS ROBOTICS ECONOMY</p>
            </footer>
        </div>
    );
}

export default App;
