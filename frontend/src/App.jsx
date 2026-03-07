import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from './config';
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
    const [missionProposal, setMissionProposal] = useState(null);

    const terminalEndRef = useRef(null);
    const [terminal, setTerminal] = useState([
        "SYSTEM // BOT-CALL OS READY",
        "PROTOCOL // v1.4.2 STABLE",
        "CORE // Neural Bridge Synchronized",
        "DATA // BASE SEPOLIA CHANNEL ACTIVE",
        "AUTH // NEURAL INTERFACE READY"
    ]);

    const scrollToBottom = () => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [terminal]);

    useEffect(() => {
        if (window.ethereum) {
            const p = new ethers.BrowserProvider(window.ethereum);
            setProvider(p);
        }
    }, []);

    const addTerminalLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminal(prev => [...prev, `[${timestamp}] ${msg}`]);
    };

    const loadTasks = async (contractInstance) => {
        if (!contractInstance) return;
        try {
            const addr = await contractInstance.getAddress();
            const latestTasks = await contractInstance.getLatestTasks(10);
            const taskArray = Array.from(latestTasks).map(t => Array.from(t));
            setTasks(taskArray);
            addTerminalLog(`SYNC // Protocol ${addr.slice(0, 8)}... synced. ${taskArray.length} missions.`);
        } catch (error) {
            console.error("Load tasks error", error);
            addTerminalLog("ERR // Mission sync failed.");
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) return addTerminalLog("ERR // No Web3 provider detected.");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccount(accounts[0]);

            const p = provider || new ethers.BrowserProvider(window.ethereum);
            if (!provider) setProvider(p);

            const network = await p.getNetwork();
            if (network.chainId !== BigInt(BASE_SEPOLIA_CHAIN_ID)) {
                addTerminalLog("NET // Switching to Base Sepolia...");
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
                    });
                } catch (switchError) {
                    addTerminalLog("ERR // Failed to switch network.");
                    return;
                }
            }

            const signer = await p.getSigner();
            const c = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
            setContract(c);
            loadTasks(c);
            addTerminalLog(`CONNECTED // Wallet ${accounts[0].slice(0, 8)}... online.`);
        } catch (error) {
            console.error("Connection Error", error);
            addTerminalLog(`ERR // Wallet sync rejected.`);
        }
    };

    const handleAiCommand = async (e) => {
        e.preventDefault();
        if (!aiPrompt || !account) return;

        setIsAiThinking(true);
        addTerminalLog(`CMD >> "${aiPrompt}"`);
        addTerminalLog("AI >> Interfacing with Llama3...");

        try {
            const result = await interpretAction(aiPrompt);
            addTerminalLog(`AI >> Reason: "${result.reason}"`);
            addTerminalLog(`AI >> Action Decided: ${result.action.toUpperCase()}`);

            setMissionProposal({
                action: result.action,
                reason: result.reason,
                reward: result.action === 'wave' ? '0.0001' : '0.0002',
                complexity: "Level 4 (Autonomous)",
                security: "Verified"
            });

            addTerminalLog("SYS >> Mission Proposal generated. Awaiting Auth.");
        } catch (error) {
            addTerminalLog("ERR >> Neural interface failed.");
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
            addTerminalLog("TX >> CONFIRMED. Robotic Node starting execution.");
            loadTasks(contract);
        } catch (error) {
            addTerminalLog(`TX >> FAILED: Interruption detected.`);
        }
    };

    return (
        <div className="app-wrapper">
            <div className="protocol-status-bar">
                <div className="status-item">
                    <span className="status-label">PROTOCOL</span>
                    <span className="status-value pulse-primary">BOT-CALL v1.4.2</span>
                </div>
                <div className="status-item">
                    <span className="status-label">NET</span>
                    <span className="status-value">BASE SEPOLIA</span>
                </div>
                <div className="status-item">
                    <span className="status-label">HEARTBEAT</span>
                    <span className="status-value">NOMINAL</span>
                </div>
            </div>

            <header>
                <div className="logo-container">
                    <span style={{ fontSize: '2.5rem' }}>🤖</span>
                    <div>
                        <h1>BOT-CALL</h1>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                            Agentic Robotics Protocol
                        </p>
                    </div>
                </div>

                {!account ? (
                    <button className="connect-btn" onClick={connectWallet}>
                        Connect Terminal
                    </button>
                ) : (
                    <div className="account-info">
                        <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 10px var(--success)' }}></span>
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                )}
            </header>

            <main>
                <section className="hero">
                    <h2>Own a Robot <br /> for a Minute</h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-dim)', fontWeight: '300' }}>
                        Decentralized pay-per-action robotic primitives.
                    </p>
                </section>

                <div className="dashboard-grid">
                    <section className="left-panel">
                        <section className="ai-agent-card glass">
                            <div className="ai-header" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontFamily: 'JetBrains Mono', color: 'var(--primary)', letterSpacing: '0.1em' }}>🧠 AI BRAIN INTERFACE</h3>
                            </div>
                            <form className="ai-form" style={{ display: 'flex', gap: '1rem' }} onSubmit={handleAiCommand}>
                                <input
                                    type="text"
                                    placeholder="Enter natural language command..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    disabled={isAiThinking}
                                    style={{ flex: 1, padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', color: '#fff' }}
                                />
                                <button className="connect-btn" type="submit" disabled={isAiThinking || !account}>
                                    {isAiThinking ? "..." : "PROCESS"}
                                </button>
                            </form>
                        </section>

                        <section className="robot-terminal glass" style={{ marginTop: '2rem' }}>
                            <div className="terminal-header" style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="terminal-dot red" style={{ width: '10px', height: '10px', background: '#ff5f56', borderRadius: '50%' }}></span>
                                <span className="terminal-dot orange" style={{ width: '10px', height: '10px', background: '#ffbd2e', borderRadius: '50%' }}></span>
                                <span className="terminal-dot green" style={{ width: '10px', height: '10px', background: '#27c93f', borderRadius: '50%' }}></span>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '1rem' }}>PROTOCOL_FEED // NODE_01</span>
                            </div>
                            <div className="terminal-body" style={{ height: '250px', overflowY: 'auto', padding: '1.5rem', fontFamily: 'JetBrains Mono', color: 'var(--success)' }}>
                                {terminal.map((log, i) => (
                                    <div key={i} className="terminal-line" style={{ marginBottom: '0.5rem', opacity: 0.8 }}>{log}</div>
                                ))}
                                <div ref={terminalEndRef} />
                            </div>
                        </section>

                        {missionProposal && (
                            <section className="mission-proposal glass" style={{ marginTop: '2rem', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>🚀 MISSION PROPOSAL</h3>
                                    <button onClick={() => setMissionProposal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                                </div>
                                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', minWidth: '100px' }}>ACTION:</span>
                                        <span style={{ fontWeight: '800' }}>{missionProposal.action.toUpperCase()}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', minWidth: '100px' }}>REASON:</span>
                                        <span style={{ fontStyle: 'italic' }}>"{missionProposal.reason}"</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', minWidth: '100px' }}>REWARD:</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{missionProposal.reward} ETH</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button className="connect-btn" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} onClick={() => setMissionProposal(null)}>ABORT</button>
                                    <button className="connect-btn" onClick={executeMission}>EXECUTE</button>
                                </div>
                            </section>
                        )}
                    </section>
                </div>

                <div className="action-grid" style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
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
                </div>

                <section className="task-history" style={{ marginTop: '6rem' }}>
                    <h3 style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.3em', marginBottom: '2rem' }}>MISSION LEDGER</h3>
                    <div className="task-list" style={{ display: 'grid', gap: '1rem' }}>
                        {tasks.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Synchronizing with Base Sepolia...</p>
                        ) : (
                            tasks.map((task, idx) => (
                                <div key={idx} className="task-card glass" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2.5rem', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-dim)', fontSize: '0.8rem' }}>#{task[0]?.toString()}</span>
                                        <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>{task[3]?.toString().toUpperCase()}</span>
                                    </div>
                                    <div className={`status-badge status-${task[5]?.toString()}`} style={{ padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800' }}>
                                        {task[5]?.toString() === '0' ? "PENDING" :
                                            task[5]?.toString() === '1' ? "EXECUTING" :
                                                task[5]?.toString() === '2' ? "COMPLETED" : "CANCELLED"}
                                    </div>
                                    <div style={{ color: 'var(--primary)', fontWeight: '800' }}>
                                        {ethers.formatEther(task[4] || 0n)} ETH
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>

            <footer style={{ marginTop: '8rem', padding: '4rem', borderTop: '1px solid var(--card-border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                <p>&copy; 2026 BOT-CALL PROTOCOL &bull; THE AGENTIC ROBOTICS ECONOMY</p>
            </footer>
        </div>
    );
}

export default App;
