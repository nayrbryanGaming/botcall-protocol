import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from './config';
import { interpretAction } from './services/aiAgent';
import RobotActionButton from './components/RobotActionButton.jsx';
import RobotVisualizer from './components/RobotVisualizer.jsx';
import './index.css';

function App() {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [balance, setBalance] = useState("0");
    const [tasks, setTasks] = useState([]);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [missionProposal, setMissionProposal] = useState(null);

    const [terminal, setTerminal] = useState([
        "PROTOCOL // SYSTEM INITIALIZED",
        "AUTH // AWAITING SECURE LINK...",
        "NETWORK // BASE SEPOLIA CONNECTED"
    ]);

    // Autoscroll logic removed per user request
    useEffect(() => {
        window.scrollTo(0, 0);
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    useEffect(() => {
        if (account) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [account]);

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

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());
        }
    }, []);

    const addTerminalLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminal(prev => [...prev.slice(-25), `[${timestamp}] ${msg}`]);
    };

    const loadTasks = async (contractInstance) => {
        if (!contractInstance) return;
        try {
            const latestTasks = await contractInstance.getLatestTasks(15);
            const taskArray = latestTasks.map(t => ({
                id: Number(t.id),
                requester: t.requester,
                executor: t.assignedExecutor,
                action: t.action,
                reward: t.reward,
                status: Number(t.status),
                timestamp: Number(t.timestamp)
            }));

            if (taskArray.length > tasks.length && tasks.length > 0) {
                addTerminalLog(`SYNC // New mission detected in ledger.`);
            }
            setTasks(taskArray);
        } catch (error) {
            console.error("Load tasks error", error);
        }
    };

    useEffect(() => {
        if (contract) {
            const interval = setInterval(() => loadTasks(contract), 5000);
            return () => clearInterval(interval);
        }
    }, [contract, tasks.length]);

    const connectWallet = async () => {
        if (!window.ethereum) return addTerminalLog("ERR // Secure Neural Link not detected.");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccount(accounts[0]);

            const p = new ethers.BrowserProvider(window.ethereum);
            setProvider(p);

            const network = await p.getNetwork();
            if (network.chainId !== BigInt(BASE_SEPOLIA_CHAIN_ID)) {
                addTerminalLog("NET // Switching to Base Sepolia cluster...");
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
                    });
                } catch (err) {
                    addTerminalLog("ERR // Network switch failed.");
                    return;
                }
            }

            const signer = await p.getSigner();
            const c = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
            setContract(c);
            loadTasks(c);
            
            // Initial balance fetch
            const bal = await p.getBalance(accounts[0]);
            setBalance(ethers.formatEther(bal));

            addTerminalLog(`CONNECTED // Node ${accounts[0].slice(0, 8)} authorized.`);
        } catch (error) {
            addTerminalLog(`ERR // Auth sequence rejected.`);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setProvider(null);
        setContract(null);
        setBalance("0");
        addTerminalLog("AUTH // Neural link severed.");
    };

    // Auto-update balance
    useEffect(() => {
        if (provider && account) {
            const interval = setInterval(async () => {
                const bal = await provider.getBalance(account);
                setBalance(ethers.formatEther(bal));
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [provider, account]);

    const handleAiCommand = async (e) => {
        e.preventDefault();
        if (!aiPrompt || !account) return;

        setIsAiThinking(true);
        addTerminalLog(`CMD >> "${aiPrompt}"`);
        addTerminalLog("AI >> Interfacing with Llama 3...");

        try {
            const result = await interpretAction(aiPrompt);
            addTerminalLog(`AI >> Reason: "${result.reason}"`);
            addTerminalLog(`AI >> Decision: ${result.action.toUpperCase()}`);

            setMissionProposal({
                action: result.action.toUpperCase(),
                reason: result.reason,
                reward: result.action.toLowerCase() === 'scan' ? '0.0001' :
                    result.action.toLowerCase() === 'move' ? '0.0002' :
                        result.action.toLowerCase() === 'pick object' ? '0.0003' :
                            result.action.toLowerCase() === 'patrol' ? '0.0005' :
                                result.action.toLowerCase() === 'wave' ? '0.0001' : '0.001',
            });
            addTerminalLog("SYS >> Awaiting manual authorization.");
        } catch (error) {
            addTerminalLog("ERR // Neural interface timeout.");
        }
        setIsAiThinking(false);
        setAiPrompt('');
    };

    const executeMission = async () => {
        if (!missionProposal || !contract) return;
        const { action, reward } = missionProposal;

        addTerminalLog(`USER >> MISSION AUTHORIZED: ${action.toUpperCase()}`);
        addTerminalLog("TX >> Broadcasting to blockchain...");

        try {
            const tx = await contract.requestAction(action, {
                value: ethers.parseEther(reward)
            });
            setMissionProposal(null);
            addTerminalLog(`TX >> Hash: ${tx.hash.slice(0, 16)}...`);
            await tx.wait();
            addTerminalLog("TX // Confirmed. Mission is live.");
            loadTasks(contract);
        } catch (error) {
            addTerminalLog(`TX // Failed: ${error.reason || "User aborted"}`);
        }
    };

    const formatTime = (ts) => {
        if (!ts) return "N/A";
        const now = Math.floor(Date.now() / 1000);
        const diff = now - ts;
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return new Date(ts * 1000).toLocaleTimeString();
    };

    return (
        <div className="app-wrapper">
            <div className="neural-overlay"></div>
            
            <div className="protocol-status-bar">
                <div className="status-item">
                    <span className="status-label">PROTOCOL_SYNC</span>
                    <span className="status-value">v3.3.5</span>
                </div>
                <div className="status-item">
                    <span className="status-label">NETWORK</span>
                    <span className="status-value">BASE_SEPOLIA</span>
                </div>
                <div className="status-item">
                    <span className="status-label">QUANTUM_STATE</span>
                    <div className="heartbeat-pulse"></div>
                    <span className="status-value" style={{ color: 'var(--success)', marginLeft: '0.2rem' }}>STABLE</span>
                </div>
            </div>

            <header>
                <div className="logo-container">
                    <div className="logo-glow"></div>
                    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 12px var(--primary))' }}>
                        <path d="M20 30L50 10L80 30V70L50 90L20 70V30Z" stroke="var(--primary)" strokeWidth="6" />
                        <path d="M50 25V75M25 50H75" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <div>
                        <h1>BOT-CALL</h1>
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '0.1rem' }}>
                            ROBOT ACTION NETWORK // MULTI-WALLET ENABLED
                        </p>
                    </div>
                </div>

                {!account ? (
                    <button className="connect-btn" onClick={connectWallet} style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}>CONNECT WALLET</button>
                ) : (
                    <div className="account-info-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="account-info glass" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>●</span>
                            <code>{account.slice(0, 6)}...{account.slice(-4)}</code>
                            <span style={{ margin: '0 0.75rem', opacity: 0.2 }}>|</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span className="heartbeat-pulse" style={{ width: '6px', height: '6px' }}></span>
                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{parseFloat(balance).toFixed(4)} ETH</span>
                            </span>
                        </div>
                        <button 
                            onClick={disconnectWallet}
                            style={{ 
                                background: 'transparent', 
                                border: '1px solid var(--error)', 
                                color: 'var(--error)', 
                                padding: '0.4rem 0.8rem', 
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            DISCONNECT
                        </button>
                    </div>
                )}
            </header>

            <main>
                <section className="hero">
                    <div className="hero-content">
                        <h2>BOT-CALL INTERFACE // PLATINUM v4</h2>
                        <div className="status-badge status-1 pulse-primary" style={{ display: 'inline-block', marginBottom: '1rem', padding: '0.25rem 1rem' }}>SYSTEM_OPTIMIZED</div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', maxWidth: '700px', margin: '0 auto' }}>
                            Advanced neural link for pay-per-action robotic operations. 
                            Verifiable blockchain-based task execution with sub-second latency targets.
                        </p>
                    </div>
                </section>

                <div className="dashboard-grid">
                    <div className="left-col">
                        <section className="ai-agent-card glass">
                            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>[NEURAL_HUB]</span>
                                <h3 style={{ fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Command Interface</h3>
                            </div>
                            <form className="ai-form" onSubmit={handleAiCommand} style={{ display: 'flex', gap: '0.75rem' }}>
                                <input
                                    type="text"
                                    placeholder="e.g., 'Go to the kitchen and scan for obstacles'"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    disabled={isAiThinking}
                                />
                                <button className="connect-btn" style={{ minWidth: '120px' }} disabled={isAiThinking || !account}>
                                    {isAiThinking ? "..." : "SEND"}
                                </button>
                            </form>
                        </section>

                        <div className="action-grid" style={{ marginTop: '2rem' }}>
                            <RobotActionButton actionName="SCAN" rewardEth="0.0001" disabled={!contract} onActionInitiated={() => loadTasks(contract)} />
                            <RobotActionButton actionName="MOVE" rewardEth="0.0002" disabled={!contract} onActionInitiated={() => loadTasks(contract)} />
                            <RobotActionButton actionName="PICK_OBJECT" rewardEth="0.0003" disabled={!contract} onActionInitiated={() => loadTasks(contract)} />
                            <RobotActionButton actionName="PATROL" rewardEth="0.0005" disabled={!contract} onActionInitiated={() => loadTasks(contract)} />
                            <RobotActionButton actionName="WAVE" rewardEth="0.0001" disabled={!contract} onActionInitiated={() => loadTasks(contract)} />
                            <RobotActionButton actionName="RECHARGE" rewardEth="0.0001" disabled={!contract} onActionInitiated={() => loadTasks(contract)} />
                        </div>
                    </div>

                    <div className="right-col">
                        <section className="robot-terminal glass" style={{ height: '240px', marginBottom: '1.5rem' }}>
                            <div className="terminal-header">
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>TELEMETRY_FEED // ACTIVE</span>
                            </div>
                            <div className="terminal-body">
                                {terminal.map((log, i) => (
                                    <div key={i} style={{ marginBottom: '0.4rem', opacity: 0.8 }}>{log}</div>
                                ))}
                            </div>
                        </section>

                        <RobotVisualizer 
                            status={tasks.length > 0 ? tasks[0].status : 0} 
                            action={tasks.length > 0 ? tasks[0].action : 'idle'} 
                        />
                    </div>
                </div>

                {missionProposal && (
                    <section className="mission-proposal glass holographic" style={{ marginTop: '2rem', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: 'var(--primary)', letterSpacing: '0.1em', fontSize: '0.8rem' }}>MISSION PROPOSAL</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                                <div style={{ color: 'var(--text-dim)' }}>Action:</div>
                                <div style={{ fontWeight: '800', color: 'var(--primary)' }}>{missionProposal.action.toUpperCase()}</div>
                                <div style={{ color: 'var(--text-dim)' }}>Analysis:</div>
                                <div style={{ fontStyle: 'italic' }}>"{missionProposal.reason}"</div>
                                <div style={{ color: 'var(--text-dim)' }}>Neural Fee:</div>
                                <div style={{ fontWeight: '800', color: 'var(--primary)' }}>{missionProposal.reward} ETH</div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="connect-btn" onClick={executeMission} style={{ flex: 1 }}>AUTHORIZE ACTION</button>
                                <button className="connect-btn" onClick={() => setMissionProposal(null)} style={{ flex: 0.5, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>CANCEL</button>
                            </div>
                        </div>
                        <div className="preview-container" style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '0.75rem', textAlign: 'center' }}>PREVIEW</div>
                            <RobotVisualizer status={1} action={missionProposal.action} />
                        </div>
                    </section>
                )}

                <section className="task-history" style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', letterSpacing: '0.2rem', color: 'var(--text-dim)' }}>GLOBAL MISSION LEDGER</h3>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{tasks.length} RECORDS FOUND</span>
                    </div>
                    <div className="task-list">
                        {tasks.length === 0 ? (
                            <div className="glass" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>Synchronizing with blockchain...</div>
                        ) : (
                            tasks.map((task) => (
                                <div key={task.id} className="task-card glass">
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.7rem' }}>#{task.id}</span>
                                        <span style={{ fontWeight: '800' }}>{task.action.toUpperCase()}</span>
                                    </div>
                                    <div className={`status-badge status-${task.status}`}>
                                        {task.status === 0 ? "Pending" : task.status === 1 ? "Executing" : task.status === 2 ? "Completed" : "Cancelled"}
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                        {formatTime(task.timestamp)}
                                    </div>
                                    <div style={{ fontWeight: '800', color: 'var(--primary)' }}>
                                        {ethers.formatEther(task.reward)} ETH
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>

            <footer style={{ marginTop: '3rem', padding: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.6rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    DEPLOYED_CONTRACT: <a href={`https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{CONTRACT_ADDRESS}</a>
                </p>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.55rem', letterSpacing: '0.1em', opacity: 0.5 }}>
                    &copy; 2026 BOT-CALL // ENTERPRISE ROBOTICS PROTOCOL // BASE_SEPOLIA_84532
                </p>
            </footer>
        </div>
    );
}

export default App;
