import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { motion, useSpring, useTransform } from 'framer-motion';
import { BOT_CALL_ABI, CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from './config';
import { interpretAction } from './services/aiAgent';
import RobotActionButton from './components/RobotActionButton.jsx';
import RobotVisualizer from './components/RobotVisualizer.jsx';
import './index.css';

/**
 * @component SmoothBalance
 * @description Renders ETH balance with high-precision (8 decimals) and smooth spring animation.
 * Optimized for displaying small faucet deposits on Base Sepolia.
 */
function SmoothBalance({ value }) {
    const numericValue = parseFloat(value) || 0;
    const springs = useSpring(numericValue, {
        mass: 0.8,
        stiffness: 75,
        damping: 15
    });
    
    // Increased precision to 8 decimals for maximum transparency of faucet funds
    const displayValue = useTransform(springs, (latest) => latest.toFixed(8));

    useEffect(() => {
        springs.set(numericValue);
    }, [numericValue, springs]);

    return (
        <motion.span style={{ fontWeight: 'bold', color: 'var(--primary)', minWidth: '130px', display: 'inline-block' }}>
            {displayValue} ETH
        </motion.span>
    );
}

function App() {
    // State management
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState("0");
    const [tasks, setTasks] = useState([]);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [missionProposal, setMissionProposal] = useState(null);
    const [providers, setProviders] = useState([]);
    const [showWalletModal, setShowWalletModal] = useState(false);
    
    // Stable Refs for logic (prevents loops)
    const providerRef = useRef(null);
    const contractRef = useRef(null);
    const isConnecting = useRef(false);
    const lastChainId = useRef(null);

    const [terminal, setTerminal] = useState([
        "PROTOCOL // SYSTEM INITIALIZED",
        "AUTH // AWAITING SECURE LINK...",
        "NETWORK // BASE SEPOLIA"
    ]);

    const addTerminalLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminal(prev => [...prev.slice(-20), `[${timestamp}] ${msg}`]);
    };

    // Cleanup scrolling behavior
    useEffect(() => {
        window.scrollTo(0, 0);
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Detect multiple wallet providers (EIP-6963)
        const onAnnouncement = (e) => {
            setProviders(prev => {
                if (prev.find(p => p.info.uuid === e.detail.info.uuid)) return prev;
                return [...prev, e.detail];
            });
        };
        window.addEventListener("eip6963:announceProvider", onAnnouncement);
        window.dispatchEvent(new Event("eip6963:requestProvider"));
        
        return () => {
            window.removeEventListener("eip6963:announceProvider", onAnnouncement);
        };
    }, []);

    const syncSession = async () => {
        if (!window.ethereum || isConnecting.current) return;
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                // Only sync if ALREADY on Base Sepolia (84532)
                if (chainId === '0x14a34') {
                    setAccount(accounts[0]);
                    providerRef.current = new ethers.BrowserProvider(window.ethereum);
                    const signer = await providerRef.current.getSigner();
                    contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
                    const bal = await providerRef.current.getBalance(accounts[0]);
                    setBalance(ethers.formatEther(bal));
                    loadTasks();
                }
            }
        } catch (e) {
            console.error("Sync failed", e);
        }
    };

    const loadTasks = async () => {
        if (!contractRef.current) return;
        try {
            const latestTasks = await contractRef.current.getLatestTasks(12);
            setTasks(latestTasks.map(t => ({
                id: Number(t.id),
                requester: t.requester,
                executor: t.assignedExecutor,
                action: t.action,
                reward: t.reward,
                status: Number(t.status),
                timestamp: Number(t.timestamp)
            })));
        } catch (error) {
            console.error("Load tasks error", error);
        }
    };

    useEffect(() => {
        syncSession();
        const interval = setInterval(() => {
            if (account) {
                loadTasks();
                if (providerRef.current) {
                    providerRef.current.getBalance(account).then(b => setBalance(ethers.formatEther(b)));
                }
            }
        }, 8000);
        return () => clearInterval(interval);
    }, [account]);

    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccounts = (accs) => {
            if (accs.length === 0) {
                setAccount(null);
                providerRef.current = null;
                contractRef.current = null;
            } else if (accs[0] !== account) {
                syncSession();
            }
        };

        const handleChain = (cid) => {
            if (cid !== lastChainId.current) {
                lastChainId.current = cid;
                syncSession();
            }
        };

        window.ethereum.on('accountsChanged', handleAccounts);
        window.ethereum.on('chainChanged', handleChain);
        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccounts);
            window.ethereum.removeListener('chainChanged', handleChain);
        };
    }, [account]);

    const connectWallet = async (selectedProvider = null) => {
        if (isConnecting.current) return;
        isConnecting.current = true;
        const injected = selectedProvider?.provider || window.ethereum;

        try {
            addTerminalLog("AUTH // Initiating handshake...");
            const accounts = await injected.request({ method: 'eth_requestAccounts' });
            let chainId = await injected.request({ method: 'eth_chainId' });

            if (chainId !== '0x14a34') {
                addTerminalLog("NET // Aligning with Base Sepolia...");
                try {
                    await injected.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x14a34' }],
                    });
                } catch (err) {
                    if (err.code === 4902) {
                        await injected.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x14a34',
                                chainName: 'Base Sepolia',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://sepolia.base.org'],
                                blockExplorerUrls: ['https://sepolia.basescan.org']
                            }],
                        });
                    } else throw err;
                }
            }

            setAccount(accounts[0]);
            providerRef.current = new ethers.BrowserProvider(injected);
            const signer = await providerRef.current.getSigner();
            contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
            
            const bal = await providerRef.current.getBalance(accounts[0]);
            setBalance(ethers.formatEther(bal));
            addTerminalLog(`CONNECTED // Node Ready.`);
            setShowWalletModal(false);
            loadTasks();
        } catch (error) {
            addTerminalLog(`ERR // Handshake failed.`);
        } finally {
            isConnecting.current = false;
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setProvider(null);
        setContract(null);
        setBalance("0");
        addTerminalLog("AUTH // Neural link severed.");
    };

    // Balance heart-beat (Updates every 5 seconds)
    useEffect(() => {
        let interval;
        if (provider && account) {
            interval = setInterval(async () => {
                try {
                    const bal = await provider.getBalance(account);
                    setBalance(ethers.formatEther(bal));
                } catch (e) {
                    console.error("Balance fetch failure", e);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
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
        if (!missionProposal || !contractRef.current) return;
        const { action, reward } = missionProposal;

        addTerminalLog(`USER >> MISSION AUTHORIZED: ${action.toUpperCase()}`);
        addTerminalLog("TX >> Broadcasting to blockchain...");

        try {
            const tx = await contractRef.current.requestAction(action, {
                value: ethers.parseEther(reward)
            });
            setMissionProposal(null);
            addTerminalLog(`TX >> Hash: ${tx.hash.slice(0, 16)}...`);
            await tx.wait();
            addTerminalLog("TX // Confirmed. Mission is live.");
            loadTasks();
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
                    <span className="status-value highlight" style={{ color: 'var(--primary)' }}>ALIGNED</span>
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
                            ROBOT ACTION NETWORK // PLATINUM v4.8.9 SUPREME
                        </p>
                    </div>
                </div>

                {!account ? (
                    <button 
                        className="connect-btn" 
                        onClick={() => providers.length > 1 ? setShowWalletModal(true) : connectWallet()} 
                        style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}>
                        {providers.length > 1 ? 'SELECT WALLET' : 'CONNECT WALLET'}
                    </button>
                ) : (
                    <div className="account-info-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="account-info glass" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>●</span>
                            <code>{account.slice(0, 6)}...{account.slice(-4)}</code>
                            <span style={{ margin: '0 0.75rem', opacity: 0.2 }}>|</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span className="heartbeat-pulse" style={{ width: '6px', height: '6px' }}></span>
                                <SmoothBalance value={balance} />
                            </span>
                        </div>
                        <button 
                            onClick={disconnectWallet}
                            className="disconnect-btn"
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
                        <h2>BOT-CALL INTERFACE // TITAN PLATINUM</h2>
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
                            <RobotActionButton actionName="SCAN" rewardEth="0.0001" disabled={!account} onActionInitiated={loadTasks} />
                            <RobotActionButton actionName="MOVE" rewardEth="0.0002" disabled={!account} onActionInitiated={loadTasks} />
                            <RobotActionButton actionName="PICK_OBJECT" rewardEth="0.0003" disabled={!account} onActionInitiated={loadTasks} />
                            <RobotActionButton actionName="PATROL" rewardEth="0.0005" disabled={!account} onActionInitiated={loadTasks} />
                            <RobotActionButton actionName="WAVE" rewardEth="0.0001" disabled={!account} onActionInitiated={loadTasks} />
                            <RobotActionButton actionName="RECHARGE" rewardEth="0.0001" disabled={!account} onActionInitiated={loadTasks} />
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

            {showWalletModal && providers.length > 1 && (
                <div style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: 'rgba(0, 0, 0, 0.8)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass" style={{ 
                        padding: '2rem', 
                        borderRadius: '16px', 
                        maxWidth: '500px',
                        width: '90%'
                    }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>SELECT WALLET</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                            {providers.map((p) => (
                                <button
                                    key={p.info.uuid}
                                    onClick={() => connectWallet(p)}
                                    style={{
                                        padding: '1rem',
                                        background: 'rgba(0, 242, 255, 0.1)',
                                        border: '1px solid var(--primary)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {p.info.name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowWalletModal(false)}
                            style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                width: '100%',
                                fontSize: '0.9rem'
                            }}
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}

            <footer>
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
