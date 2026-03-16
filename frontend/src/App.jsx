import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { motion, useSpring, useTransform } from 'framer-motion';
import { BOT_CALL_ABI, CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from './config';
import { interpretAction } from './services/aiAgent';
import RobotActionButton from './components/RobotActionButton.jsx';
import RobotVisualizer from './components/RobotVisualizer.jsx';
import './index.css';

function SmoothBalance({ value }) {
    const numericValue = parseFloat(value) || 0;
    const springs = useSpring(numericValue, {
        mass: 0.8,
        stiffness: 75,
        damping: 15
    });

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
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState("0");
    const [tasks, setTasks] = useState([]);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [missionProposal, setMissionProposal] = useState(null);
    const [providers, setProviders] = useState([]);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const providerRef = useRef(null);
    const contractRef = useRef(null);
    const isConnecting = useRef(false);
    const lastChainId = useRef(null);
    const initializedRef = useRef(false);

    const [terminal, setTerminal] = useState([
        "SYSTEM_BOOT // INITIALIZED",
        "AUTH_LINK // PENDING...",
        "NETWORK // BASE_SEPOLIA"
    ]);

    const addTerminalLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminal(prev => [...prev.slice(-20), `[${timestamp}] ${msg}`]);
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        const onAnnouncement = (e) => {
            setProviders(prev => {
                if (prev.find(p => p.info.uuid === e.detail.info.uuid)) return prev;
                return [...prev, e.detail];
            });
        };
        window.addEventListener("eip6963:announceProvider", onAnnouncement);
        window.dispatchEvent(new Event("eip6963:requestProvider"));
        return () => window.removeEventListener("eip6963:announceProvider", onAnnouncement);
    }, []);

    const syncSession = async () => {
        const hideLoader = () => {
            const loader = document.getElementById('boot-loader');
            if (loader) loader.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        if (!window.ethereum || initializedRef.current) {
            setIsInitialized(true);
            hideLoader();
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
            if (accounts && accounts.length > 0) {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null);
                if (chainId === BASE_SEPOLIA_CHAIN_ID) {
                    setAccount(accounts[0]);
                    providerRef.current = new ethers.BrowserProvider(window.ethereum);
                    const signer = await providerRef.current.getSigner();
                    contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
                    loadTasks();
                }
            }
        } catch (e) {
            console.warn("Soft startup fail:", e);
        } finally {
            setIsInitialized(true);
            initializedRef.current = true;
            hideLoader();
        }
    };

    const loadTasks = async () => {
        if (!contractRef.current) return;
        try {
            const total = await contractRef.current.taskCount();
            const lastId = Number(total);
            const count = Math.min(lastId, 10);
            const fetched = [];
            for (let i = 0; i < count; i++) {
                const id = lastId - i;
                if (id <= 0) break;
                const t = await contractRef.current.tasks(id);
                fetched.push({
                    id: Number(t.id),
                    requester: String(t.requester),
                    executor: String(t.assignedExecutor),
                    action: String(t.action),
                    reward: t.reward.toString(),
                    status: Number(t.status),
                    timestamp: Number(t.timestamp)
                });
            }
            setTasks(fetched);
        } catch (error) {
            console.warn("Task sync pending...");
        }
    };

    useEffect(() => {
        const emergencyTimer = setTimeout(() => {
            if (!initializedRef.current) {
                setIsInitialized(true);
                initializedRef.current = true;
                const loader = document.getElementById('boot-loader');
                if (loader) loader.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }, 2500);
        syncSession();
        return () => clearTimeout(emergencyTimer);
    }, []);

    useEffect(() => {
        if (!account) return;
        const hb = setInterval(() => {
            if (providerRef.current) {
                loadTasks();
                providerRef.current.getBalance(account).then(b => setBalance(ethers.formatEther(b))).catch(() => {});
            }
        }, 12000);
        return () => clearInterval(hb);
    }, [account]);

    const connectWallet = async (selectedProvider = null) => {
        if (isConnecting.current) return;
        isConnecting.current = true;
        const injected = selectedProvider?.provider || window.ethereum;
        try {
            addTerminalLog("AUTH // Initializing connection...");
            const accounts = await injected.request({ method: 'eth_requestAccounts' });
            let chainId = await injected.request({ method: 'eth_chainId' });
            if (chainId !== '0x14a34') {
                await injected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x14a34' }] });
            }
            setAccount(accounts[0]);
            providerRef.current = new ethers.BrowserProvider(injected);
            const signer = await providerRef.current.getSigner();
            contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);
            addTerminalLog(`CONNECTED // Node Ready.`);
            setShowWalletModal(false);
            loadTasks();
        } catch (error) {
            addTerminalLog(`ERR // Connection failed.`);
        } finally {
            isConnecting.current = false;
        }
    };

    const handleAiCommand = async (e) => {
        e.preventDefault();
        if (!aiPrompt || !account) return;
        setIsAiThinking(true);
        addTerminalLog(`CMD >> "${aiPrompt}"`);
        try {
            const result = await interpretAction(aiPrompt);
            addTerminalLog(`AI >> Decision: ${result.action.toUpperCase()}`);
            setMissionProposal({
                action: result.action.toUpperCase(),
                reason: result.reason,
                reward: result.action.toLowerCase() === 'scan' ? '0.0001' : '0.0002',
            });
        } catch (error) {
            addTerminalLog("ERR // AI LAG");
        }
        setIsAiThinking(false);
        setAiPrompt('');
    };

    const executeMission = async () => {
        if (!missionProposal || !contractRef.current) return;
        const { action, reward } = missionProposal;
        addTerminalLog("TX >> Broadcasting...");
        try {
            const tx = await contractRef.current.requestAction(action, { value: ethers.parseEther(reward) });
            setMissionProposal(null);
            await tx.wait();
            addTerminalLog("TX // Confirmed.");
            loadTasks();
        } catch (error) {
            addTerminalLog("TX // Aborted.");
        }
    };

    if (!isInitialized) return null;

    return (
        <div className="app-wrapper">
            <header>
                <div className="logo-container">
                    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
                        <path d="M20 30L50 10L80 30V70L50 90L20 70V30Z" stroke="var(--primary)" strokeWidth="6" />
                    </svg>
                    <div>
                        <h1>BOT-CALL</h1>
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Robotic Infrastructure Protocol</p>
                    </div>
                </div>
                {!account ? (
                    <button className="connect-btn" onClick={() => providers.length > 1 ? setShowWalletModal(true) : connectWallet()}>Connect Wallet</button>
                ) : (
                    <div className="account-info glass">
                        <code>{account.slice(0, 6)}...{account.slice(-4)}</code>
                        <span style={{ margin: '0 10px' }}>|</span>
                        <SmoothBalance value={balance} />
                    </div>
                )}
            </header>
            <main>
                <section className="hero">
                    <h2>Robotic Control Node</h2>
                    <p>Professional interface for decentralized robotic task execution.</p>
                </section>
                <div className="dashboard-grid">
                    <div className="left-col">
                        <section className="ai-agent-card glass">
                            <h3>Command Interface</h3>
                            <form className="ai-form" onSubmit={handleAiCommand}>
                                <input type="text" placeholder="Enter robot command..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} disabled={isAiThinking} />
                                <button className="connect-btn" disabled={isAiThinking || !account}>Send</button>
                            </form>
                        </section>
                        <div className="action-grid">
                            <RobotActionButton actionName="SCAN" rewardEth="0.0001" disabled={!account} onActionInitiated={loadTasks} />
                            <RobotActionButton actionName="MOVE" rewardEth="0.0002" disabled={!account} onActionInitiated={loadTasks} />
                        </div>
                    </div>
                    <div className="right-col">
                        <section className="robot-terminal glass">
                            <div className="terminal-body">
                                {terminal.map((log, i) => <div key={i}>{log}</div>)}
                            </div>
                        </section>
                        <RobotVisualizer status={tasks.length > 0 ? tasks[0].status : 0} action={tasks.length > 0 ? tasks[0].action : 'idle'} />
                    </div>
                </div>
                {missionProposal && (
                    <section className="mission-proposal glass">
                        <h3>MISSION PROPOSAL</h3>
                        <p><strong>Action:</strong> {missionProposal.action}</p>
                        <p><i>{missionProposal.reason}</i></p>
                        <button className="connect-btn" onClick={executeMission}>Authorize</button>
                    </section>
                )}
                <section className="task-history">
                    <h3>MISSION LEDGER</h3>
                    <div className="task-list">
                        {tasks.map(task => (
                            <div key={task.id} className="task-card glass">
                                <span>#{task.id} <strong>{task.action.toUpperCase()}</strong></span>
                                <span>{ethers.formatEther(task.reward)} ETH</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;
