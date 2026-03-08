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
        "PROTOCOL // v2.3.0 TITAN FINALE",
        "CORE // Neural Bridge Standardized",
        "DATA // BASE SEPOLIA CHANNEL ACTIVE",
        "AUTH // NODE 0x5415... AUTHORIZED"
    ]);

    const scrollToBottom = () => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [terminal]);

    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    connectWallet();
                }
            }
        };
        checkConnection();

        // Listen for account/network changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => window.location.reload());
                window.ethereum.removeListener('chainChanged', () => window.location.reload());
            }
        }
    }, []);

    const addTerminalLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminal(prev => [...prev.slice(-20), `[${timestamp}] ${msg}`]); // Keep only last 20 for perf
    };

    const loadTasks = async (contractInstance) => {
        if (!contractInstance) return;
        try {
            const latestTasks = await contractInstance.getLatestTasks(15);

            // Explicitly map Result objects to plain JS objects for stability
            const taskArray = latestTasks.map(t => ({
                id: Number(t.id),
                requester: t.requester,
                executor: t.assignedExecutor,
                action: t.action,
                reward: t.reward,
                status: Number(t.status),
                timestamp: Number(t.timestamp)
            }));

            // If tasks changed, log it
            if (taskArray.length > tasks.length) {
                addTerminalLog(`SYNC // Detected ${taskArray.length - tasks.length} new missions in ledger.`);
            }

            setTasks(taskArray);
        } catch (error) {
            console.error("Load tasks error", error);
        }
    };

    // Auto-polling for task updates
    useEffect(() => {
        if (contract) {
            const interval = setInterval(() => loadTasks(contract), 5000);
            return () => clearInterval(interval);
        }
    }, [contract, tasks.length]);

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
                    if (switchError.code === 4902) {
                        addTerminalLog("NET // Adding Base Sepolia network...");
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: BASE_SEPOLIA_CHAIN_ID,
                                chainName: 'Base Sepolia',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://sepolia.base.org'],
                                blockExplorerUrls: ['https://sepolia.basescan.org']
                            }]
                        });
                    } else {
                        addTerminalLog("ERR // Network switch failed.");
                        return;
                    }
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
                reward: result.action === 'scan' ? '0.0001' :
                    result.action === 'move' ? '0.0002' :
                        result.action === 'pick object' ? '0.0003' :
                            result.action === 'patrol' ? '0.0005' : '0.001',
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

        // --- Pre-Flight Network Validation ---
        try {
            const network = await provider.getNetwork();
            if (network.chainId !== BigInt(BASE_SEPOLIA_CHAIN_ID)) {
                addTerminalLog("ERR // Chain mismatch detected. Re-syncing network...");
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
                });
                // After switch, wait a moment for the provider to update
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (netErr) {
            addTerminalLog("ERR // Network validation failed.");
            return;
        }

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
            console.error("Transaction Error", error);
            addTerminalLog(`TX >> FAILED: ${error.reason || "Interruption detected"}`);
        }
    };

    return (
        <div className="app-wrapper">
            <div className="protocol-status-bar">
                <div className="status-item">
                    <span className="status-label">PROTOCOL</span>
                    <span className="status-value pulse-primary">BOT-CALL v2.3.0</span>
                </div>
                <div className="status-item">
                    <span className="status-label">NET</span>
                    <span className="status-value">BASE SEPOLIA</span>
                </div>
                <div className="status-item">
                    <span className="status-label">NODES_ACTIVE</span>
                    <span className="status-value">{Math.floor(Math.random() * 5) + 12} UNITS</span>
                </div>
                <div className="status-item">
                    <span className="status-label">GLOBAL_HEARTBEAT</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="status-value" style={{ color: 'var(--success)' }}>NOMINAL</span>
                        <div className="heartbeat-pulse"></div>
                    </div>
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
                            <section className="mission-proposal glass holographic" style={{ marginTop: '2rem', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '0.9rem', letterSpacing: '0.2em' }}>⚡ MISSION_AUTH_REQUIRED</h3>
                                    <button onClick={() => setMissionProposal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                                </div>
                                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', minWidth: '100px', fontFamily: 'JetBrains Mono' }}>ACTION_TYPE:</span>
                                        <span style={{ fontWeight: '800', letterSpacing: '0.05em' }}>{missionProposal.action.toUpperCase()}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', minWidth: '100px', fontFamily: 'JetBrains Mono' }}>NEURAL_REASON:</span>
                                        <span style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>"{missionProposal.reason}"</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', minWidth: '100px', fontFamily: 'JetBrains Mono' }}>GAS_COST:</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{missionProposal.reward} ETH</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button className="connect-btn alternate" onClick={() => setMissionProposal(null)}>ABORT</button>
                                    <button className="connect-btn" onClick={executeMission}>AUTHORIZE_EXECUTION</button>
                                </div>
                            </section>
                        )}
                    </section>
                </div>

                <div className="action-grid" style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                    <RobotActionButton
                        actionName="scan"
                        rewardEth="0.0001"
                        disabled={!contract}
                        onActionInitiated={() => loadTasks(contract)}
                    />
                    <RobotActionButton
                        actionName="move"
                        rewardEth="0.0002"
                        disabled={!contract}
                        onActionInitiated={() => loadTasks(contract)}
                    />
                    <RobotActionButton
                        actionName="pick object"
                        rewardEth="0.0003"
                        disabled={!contract}
                        onActionInitiated={() => loadTasks(contract)}
                    />
                    <RobotActionButton
                        actionName="patrol"
                        rewardEth="0.0005"
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
                                        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-dim)', fontSize: '0.8rem' }}>#{String(task.id)}</span>
                                        <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>{task.action.toUpperCase()}</span>
                                    </div>
                                    <div className={`status-badge status-${task.status}`} style={{ padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800' }}>
                                        {task.status === 0 ? "PENDING" :
                                            task.status === 1 ? "EXECUTING" :
                                                task.status === 2 ? "COMPLETED" : "CANCELLED"}
                                    </div>
                                    <div style={{ color: 'var(--primary)', fontWeight: '800' }}>
                                        {ethers.formatEther(task.reward ? String(task.reward) : "0")} ETH
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
