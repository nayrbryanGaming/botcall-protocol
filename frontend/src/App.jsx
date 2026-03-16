import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from './config';
import { interpretAction } from './services/aiAgent';
import RobotActionButton from './components/RobotActionButton.jsx';
import RobotVisualizer from './components/RobotVisualizer.jsx';
import './index.css';

const BASE_SEPOLIA_PARAMS = {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    chainName: 'Base Sepolia',
    rpcUrls: ['https://sepolia.base.org'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://sepolia.basescan.org']
};

const WALLET_INSTALL_LINKS = [
    { name: 'MetaMask', url: 'https://metamask.io/download/' },
    { name: 'Rainbow', url: 'https://rainbow.me/' },
    { name: 'Rabby', url: 'https://rabby.io/' },
    { name: 'Coinbase Wallet', url: 'https://www.coinbase.com/wallet/downloads' }
];

const FALLBACK_GAS_PRICE = 1_500_000_000n;
const TESTNET_TOKEN_SYMBOL = 'tETH';

const unwrapErrorMessage = (error) => {
    if (!error) return '';

    const candidates = [
        error?.shortMessage,
        error?.reason,
        error?.info?.error?.message,
        error?.info?.message,
        error?.message
    ];

    return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
};

const normalizeErrorMessage = (message) => {
    if (!message) return 'Unknown error';

    const lower = message.toLowerCase();
    if (lower.includes('insufficient funds')) {
        return 'Insufficient Base Sepolia tETH (testnet) for reward and gas. Top up this wallet, then retry.';
    }
    if (lower.includes('user rejected') || lower.includes('user denied')) {
        return 'Transaction was rejected in wallet.';
    }
    if (lower.includes('wallet is not on base sepolia')) {
        return 'Switch wallet network to Base Sepolia first.';
    }

    return message.length > 220 ? `${message.slice(0, 220)}...` : message;
};

const getErrorMessage = (error) => normalizeErrorMessage(unwrapErrorMessage(error));

const shortenAddress = (value) => {
    if (!value) return '-';
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const detectProviderName = (provider, fallback = 'Injected Wallet') => {
    if (!provider) return fallback;
    if (provider.isRainbow) return 'Rainbow';
    if (provider.isRabby) return 'Rabby';
    if (provider.isCoinbaseWallet) return 'Coinbase Wallet';
    if (provider.isMetaMask) return 'MetaMask';
    return fallback;
};

const uniqueProviders = (entries) => {
    const map = new Map();
    for (const entry of entries) {
        if (!entry?.provider) continue;
        const key = entry.info?.uuid || entry.info?.rdns || entry.info?.name || `${entry.provider}`;
        if (!map.has(key)) map.set(key, entry);
    }
    return Array.from(map.values());
};

function SmoothBalance({ value }) {
    const numericValue = Number.parseFloat(value);
    const display = Number.isFinite(numericValue) ? numericValue.toFixed(8) : '0.00000000';

    return (
        <span style={{ fontWeight: 'bold', color: 'var(--primary)', minWidth: '130px', display: 'inline-block' }}>
            {display} {TESTNET_TOKEN_SYMBOL}
        </span>
    );
}

function App() {
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState('0');
    const [tasks, setTasks] = useState([]);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [missionProposal, setMissionProposal] = useState(null);
    const [providers, setProviders] = useState([]);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [isConnectingUi, setIsConnectingUi] = useState(false);
    const [activeChainId, setActiveChainId] = useState(null);
    const [connectedWalletName, setConnectedWalletName] = useState('Not connected');

    const providerRef = useRef(null);
    const contractRef = useRef(null);
    const isConnecting = useRef(false);

    const [terminal, setTerminal] = useState([
        'System initialized',
        'Target network: Base Sepolia'
    ]);

    const isOnBaseSepolia = activeChainId === BASE_SEPOLIA_CHAIN_ID;

    const networkLabel = useMemo(() => {
        if (!activeChainId) return 'No network detected';
        if (activeChainId === BASE_SEPOLIA_CHAIN_ID) return 'Base Sepolia';
        return `Wrong network (${activeChainId})`;
    }, [activeChainId]);

    const addTerminalLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminal((prev) => [...prev.slice(-20), `[${timestamp}] ${msg}`]);
    };

    const hideBootLoader = () => {
        const loader = document.getElementById('boot-loader');
        if (loader) loader.style.display = 'none';
        document.body.style.overflow = 'auto';
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
                const task = await contractRef.current.tasks(id);
                fetched.push({
                    id: Number(task.id),
                    requester: String(task.requester),
                    executor: String(task.assignedExecutor),
                    action: String(task.action),
                    reward: task.reward.toString(),
                    status: Number(task.status),
                    timestamp: Number(task.timestamp)
                });
            }

            setTasks(fetched);
        } catch (error) {
            console.warn('Task sync failed:', getErrorMessage(error));
        }
    };

    const refreshBalance = async (targetAccount = account) => {
        if (!providerRef.current || !targetAccount) return;
        try {
            const rawBalance = await providerRef.current.getBalance(targetAccount);
            setBalance(ethers.formatEther(rawBalance));
        } catch (error) {
            console.warn('Balance refresh failed:', getErrorMessage(error));
        }
    };

    const bindWallet = async (injected, walletAddress, walletName) => {
        providerRef.current = new ethers.BrowserProvider(injected);
        const signer = await providerRef.current.getSigner();
        contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);

        setAccount(walletAddress);
        setConnectedWalletName(walletName || detectProviderName(injected));
        await Promise.all([refreshBalance(walletAddress), loadTasks()]);
    };

    const addInjectedFallbackProviders = () => {
        const injectedEntries = [];
        const rootProvider = window.ethereum;

        if (rootProvider?.providers?.length) {
            rootProvider.providers.forEach((provider, index) => {
                injectedEntries.push({
                    info: {
                        uuid: `injected-${index}`,
                        name: detectProviderName(provider, `Injected Wallet ${index + 1}`),
                        rdns: `injected-${index}`
                    },
                    provider
                });
            });
        } else if (rootProvider) {
            injectedEntries.push({
                info: {
                    uuid: 'window-ethereum',
                    name: detectProviderName(rootProvider, 'Injected Wallet'),
                    rdns: 'window-ethereum'
                },
                provider: rootProvider
            });
        }

        if (injectedEntries.length > 0) {
            setProviders((prev) => uniqueProviders([...prev, ...injectedEntries]));
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);

        const onAnnouncement = (event) => {
            if (!event?.detail?.provider) return;
            setProviders((prev) => uniqueProviders([...prev, event.detail]));
        };

        window.addEventListener('eip6963:announceProvider', onAnnouncement);
        window.dispatchEvent(new Event('eip6963:requestProvider'));
        addInjectedFallbackProviders();

        return () => window.removeEventListener('eip6963:announceProvider', onAnnouncement);
    }, []);

    useEffect(() => {
        const injected = window.ethereum;
        if (!injected?.on) return;

        const handleAccountsChanged = async (accounts) => {
            if (!accounts || accounts.length === 0) {
                disconnectWallet();
                return;
            }

            const selectedProvider = providers[0]?.provider || window.ethereum;
            if (!selectedProvider?.request) return;

            try {
                await bindWallet(
                    selectedProvider,
                    accounts[0],
                    providers[0]?.info?.name || detectProviderName(selectedProvider)
                );
                addTerminalLog(`Active account: ${shortenAddress(accounts[0])}`);
            } catch (error) {
                addTerminalLog(`Account sync failed: ${getErrorMessage(error)}`);
            }
        };

        const handleChainChanged = async (chainId) => {
            setActiveChainId(chainId);
            if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
                addTerminalLog(`Network changed: ${chainId} (switch back to Base Sepolia)`);
                return;
            }

            if (account) {
                addTerminalLog('Network changed: Base Sepolia');
                await refreshBalance(account);
                await loadTasks();
            }
        };

        injected.on('accountsChanged', handleAccountsChanged);
        injected.on('chainChanged', handleChainChanged);

        return () => {
            injected.removeListener('accountsChanged', handleAccountsChanged);
            injected.removeListener('chainChanged', handleChainChanged);
        };
    }, [account, providers]);

    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            try {
                const fallbackProvider = providers[0]?.provider || window.ethereum;
                if (!fallbackProvider?.request) return;

                const chainId = await fallbackProvider.request({ method: 'eth_chainId' }).catch(() => null);
                if (!cancelled) setActiveChainId(chainId);

                const accounts = await fallbackProvider.request({ method: 'eth_accounts' }).catch(() => []);
                if (cancelled || !accounts || accounts.length === 0) return;

                await bindWallet(
                    fallbackProvider,
                    accounts[0],
                    providers[0]?.info?.name || detectProviderName(fallbackProvider)
                );

                if (!cancelled) {
                    addTerminalLog(`Wallet detected: ${shortenAddress(accounts[0])}`);
                    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
                        addTerminalLog('Switch to Base Sepolia to send robot transactions.');
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('Session restore skipped:', getErrorMessage(error));
                }
            } finally {
                if (!cancelled) hideBootLoader();
            }
        };

        restoreSession();
        const fallbackTimer = setTimeout(() => !cancelled && hideBootLoader(), 2200);

        return () => {
            cancelled = true;
            clearTimeout(fallbackTimer);
        };
    }, [providers]);

    useEffect(() => {
        if (!account || !isOnBaseSepolia) return;
        const heartbeat = setInterval(() => {
            refreshBalance(account);
            loadTasks();
        }, 12000);

        return () => clearInterval(heartbeat);
    }, [account, isOnBaseSepolia]);

    const ensureBaseSepolia = async (injected) => {
        const chainId = await injected.request({ method: 'eth_chainId' });
        setActiveChainId(chainId);

        if (chainId === BASE_SEPOLIA_CHAIN_ID) return;

        try {
            await injected.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }]
            });
        } catch (switchError) {
            if (switchError?.code === 4902) {
                await injected.request({
                    method: 'wallet_addEthereumChain',
                    params: [BASE_SEPOLIA_PARAMS]
                });
            } else {
                throw switchError;
            }
        }

        const finalChain = await injected.request({ method: 'eth_chainId' }).catch(() => null);
        setActiveChainId(finalChain);

        if (finalChain !== BASE_SEPOLIA_CHAIN_ID) {
            throw new Error('Wallet is not on Base Sepolia.');
        }
    };

    const connectWallet = async (selectedEntry = null) => {
        if (isConnecting.current) return;
        const injected = selectedEntry?.provider || window.ethereum;

        if (!injected?.request) {
            addTerminalLog('No wallet provider detected in this browser session.');
            setShowWalletModal(true);
            return;
        }

        isConnecting.current = true;
        setIsConnectingUi(true);

        try {
            const walletName = selectedEntry?.info?.name || detectProviderName(injected);
            addTerminalLog(`Connecting wallet: ${walletName}`);

            const accounts = await injected.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('No account returned by wallet provider.');
            }

            await ensureBaseSepolia(injected);
            await bindWallet(injected, accounts[0], walletName);

            addTerminalLog(`Connected: ${shortenAddress(accounts[0])}`);
            setShowWalletModal(false);
        } catch (error) {
            addTerminalLog(`Connect failed: ${getErrorMessage(error)}`);
        } finally {
            isConnecting.current = false;
            setIsConnectingUi(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setBalance('0');
        setTasks([]);
        setMissionProposal(null);
        setConnectedWalletName('Not connected');
        providerRef.current = null;
        contractRef.current = null;
        addTerminalLog('Wallet disconnected from app session.');
    };

    const requestAction = async (actionName, rewardEth) => {
        if (!account || !contractRef.current) {
            throw new Error('Connect wallet first.');
        }
        if (!isOnBaseSepolia) {
            throw new Error('Switch wallet network to Base Sepolia first.');
        }

        const rewardValue = ethers.parseEther(rewardEth);
        const walletBalance = await providerRef.current.getBalance(account);
        const estimatedGas = await contractRef.current.requestAction.estimateGas(actionName, {
            value: rewardValue
        }).catch(() => 220000n);
        const feeData = await providerRef.current.getFeeData();
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || FALLBACK_GAS_PRICE;
        const estimatedTotalCost = rewardValue + (estimatedGas * gasPrice);

        if (walletBalance < estimatedTotalCost) {
            const needed = ethers.formatEther(estimatedTotalCost);
            const current = ethers.formatEther(walletBalance);
            throw new Error(`Insufficient Base Sepolia tETH (testnet). Need about ${needed} ${TESTNET_TOKEN_SYMBOL} (reward + gas), current ${current} ${TESTNET_TOKEN_SYMBOL}.`);
        }

        const tx = await contractRef.current.requestAction(actionName, {
            value: rewardValue
        });

        addTerminalLog(`Transaction submitted: ${tx.hash.slice(0, 10)}...`);
        await tx.wait();
        addTerminalLog(`Action request confirmed: ${actionName}`);
        await loadTasks();

        return tx.hash;
    };

    const handleAiCommand = async (event) => {
        event.preventDefault();
        if (!aiPrompt || !account) return;

        setIsAiThinking(true);
        addTerminalLog(`AI prompt: "${aiPrompt}"`);

        try {
            const result = await interpretAction(aiPrompt);
            addTerminalLog(`AI suggestion: ${result.action.toUpperCase()}`);
            setMissionProposal({
                action: result.action.toUpperCase(),
                reason: result.reason,
                reward: result.action.toLowerCase() === 'scan' ? '0.0001' : '0.0002'
            });
        } catch (error) {
            addTerminalLog(`AI error: ${getErrorMessage(error)}`);
        } finally {
            setIsAiThinking(false);
            setAiPrompt('');
        }
    };

    const executeMission = async () => {
        if (!missionProposal) return;
        try {
            await requestAction(missionProposal.action, missionProposal.reward);
            setMissionProposal(null);
        } catch (error) {
            addTerminalLog(`Action failed: ${getErrorMessage(error)}`);
        }
    };

    return (
        <div className="app-wrapper">
            <header>
                <div className="testnet-banner">BASE SEPOLIA TESTNET (tETH ONLY)</div>
                <div className="logo-container">
                    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
                        <path d="M20 30L50 10L80 30V70L50 90L20 70V30Z" stroke="var(--primary)" strokeWidth="6" />
                    </svg>
                    <div>
                        <h1>BOT-CALL</h1>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                            Pay-per-action robotics protocol
                        </p>
                    </div>
                </div>

                <div className="header-actions">
                    {!account ? (
                        <button className="connect-btn" onClick={() => setShowWalletModal(true)} disabled={isConnectingUi}>
                            {isConnectingUi ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    ) : (
                        <>
                            <div className="account-info glass">
                                <code>{shortenAddress(account)}</code>
                                <span style={{ margin: '0 10px' }}>|</span>
                                <SmoothBalance value={balance} />
                            </div>
                            <button className="connect-btn secondary-btn" onClick={() => setShowWalletModal(true)}>
                                Switch Wallet
                            </button>
                            <button className="connect-btn disconnect-btn" onClick={disconnectWallet}>
                                Disconnect
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main>
                <section className="hero">
                    <h2>Robotic Control Node</h2>
                    <p>
                        Connected Wallet: {connectedWalletName} | Network: <span className={isOnBaseSepolia ? 'status-ok' : 'status-warn'}>{networkLabel}</span>
                    </p>
                    <p style={{ marginTop: '0.35rem' }}>
                        Payments and gas use Base Sepolia {TESTNET_TOKEN_SYMBOL} (testnet), not mainnet ETH.
                    </p>
                </section>

                <div className="dashboard-grid">
                    <div className="left-col">
                        <section className="ai-agent-card glass">
                            <h3>Command Interface</h3>
                            <form className="ai-form" onSubmit={handleAiCommand}>
                                <input
                                    type="text"
                                    placeholder="Describe the robot action"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    disabled={isAiThinking}
                                />
                                <button className="connect-btn" disabled={isAiThinking || !account}>
                                    {isAiThinking ? 'Thinking...' : 'Analyze'}
                                </button>
                            </form>
                        </section>

                        <div className="action-grid">
                            <RobotActionButton
                                actionName="SCAN"
                                rewardEth="0.0001"
                                disabled={!account || !isOnBaseSepolia}
                                onActionInitiated={loadTasks}
                                onRequestAction={requestAction}
                            />
                            <RobotActionButton
                                actionName="MOVE"
                                rewardEth="0.0002"
                                disabled={!account || !isOnBaseSepolia}
                                onActionInitiated={loadTasks}
                                onRequestAction={requestAction}
                            />
                        </div>
                    </div>

                    <div className="right-col">
                        <section className="robot-terminal glass">
                            <div className="terminal-body">
                                {terminal.map((log, index) => <div key={`${log}-${index}`}>{log}</div>)}
                            </div>
                        </section>
                        <RobotVisualizer status={tasks.length > 0 ? tasks[0].status : 0} action={tasks.length > 0 ? tasks[0].action : 'idle'} />
                    </div>
                </div>

                {missionProposal && (
                    <section className="mission-proposal glass">
                        <h3>Mission Proposal</h3>
                        <p><strong>Action:</strong> {missionProposal.action}</p>
                        <p>{missionProposal.reason}</p>
                        <button className="connect-btn" onClick={executeMission}>Submit Action</button>
                    </section>
                )}

                <section className="task-history">
                    <h3>Task Ledger</h3>
                    <div className="task-list">
                        {tasks.map((task) => (
                            <div key={task.id} className="task-card glass">
                                <span>#{task.id} <strong>{task.action.toUpperCase()}</strong></span>
                                <span>{ethers.formatEther(task.reward)} {TESTNET_TOKEN_SYMBOL}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {showWalletModal && (
                <div className="wallet-modal-overlay" onClick={() => setShowWalletModal(false)}>
                    <div className="wallet-modal glass" onClick={(e) => e.stopPropagation()}>
                        <h3>Select Wallet</h3>
                        <p>
                            Detected providers: {providers.length}. Rainbow is supported when the Rainbow provider/extension is installed in this browser.
                        </p>

                        <div className="wallet-provider-list">
                            {providers.length === 0 ? (
                                <div className="wallet-empty">No injected provider detected yet. Install a wallet extension or reload wallet extension context.</div>
                            ) : (
                                providers.map((entry, index) => (
                                    <button
                                        key={`${entry.info?.uuid || entry.info?.rdns || entry.info?.name || 'wallet'}-${index}`}
                                        className="wallet-provider-btn"
                                        onClick={() => connectWallet(entry)}
                                        disabled={isConnectingUi}
                                    >
                                        {entry.info?.icon ? (
                                            <img src={entry.info.icon} alt={entry.info?.name || 'wallet'} />
                                        ) : (
                                            <span className="wallet-fallback-icon">W</span>
                                        )}
                                        <span>{entry.info?.name || detectProviderName(entry.provider)}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="wallet-link-grid">
                            {WALLET_INSTALL_LINKS.map((wallet) => (
                                <a key={wallet.name} className="wallet-link-item" href={wallet.url} target="_blank" rel="noreferrer">
                                    {wallet.name}
                                </a>
                            ))}
                        </div>

                        <button className="connect-btn" onClick={() => setShowWalletModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
