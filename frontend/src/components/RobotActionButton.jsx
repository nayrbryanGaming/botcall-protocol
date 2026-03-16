import { useState } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS } from '../config';

const TESTNET_TOKEN_SYMBOL = 'tETH';

const formatRequestError = (error) => {
    const raw = error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message || 'Unknown error';
    const msg = String(raw);
    const lower = msg.toLowerCase();

    if (lower.includes('insufficient funds')) {
        return 'Insufficient Base Sepolia tETH (testnet) for reward and gas.';
    }
    if (lower.includes('user rejected') || lower.includes('user denied')) {
        return 'Transaction was rejected in wallet.';
    }
    return msg.length > 180 ? `${msg.slice(0, 180)}...` : msg;
};

const RobotActionButton = ({ actionName, rewardEth, disabled, onActionInitiated, onRequestAction }) => {
    const [loading, setLoading] = useState(false);

    const handleRequest = async () => {
        setLoading(true);
        try {
            if (onRequestAction) {
                const hash = await onRequestAction(actionName, rewardEth);
                if (onActionInitiated) onActionInitiated(hash);
                return;
            }

            if (!window.ethereum) {
                alert('No wallet detected. Please install or unlock a wallet extension.');
                return;
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);

            const tx = await contract.requestAction(actionName, {
                value: ethers.parseEther(rewardEth)
            });

            await tx.wait();
            if (onActionInitiated) onActionInitiated(tx.hash);
        } catch (error) {
            console.error('Action request failed:', error);
            const reason = formatRequestError(error);
            if (!String(reason).toLowerCase().includes('rejected in wallet')) {
                alert(`Action request error: ${reason}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const icons = {
        SCAN: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" opacity="0.35" />
                <path d="M12 12l7-4" stroke="var(--primary)" strokeWidth="2">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="3s" repeatCount="indefinite" />
                </path>
                <circle cx="12" cy="12" r="1.8" fill="var(--primary)" />
            </svg>
        ),
        MOVE: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12h8" opacity="0.35" strokeWidth="1" />
            </svg>
        ),
        PICK: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="8" y="8" width="8" height="8" rx="1.5" />
                <path d="M12 4v3M12 17v3M4 12h3M17 12h3" opacity="0.5" />
                <path d="M6 8l2 2M18 8l-2 2" opacity="0.6" />
            </svg>
        ),
        PLACE: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 16h16" />
                <rect x="8" y="6" width="8" height="8" rx="1.5" />
                <path d="M10 19h4" opacity="0.5" />
            </svg>
        ),
        ROTATE: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 12a8 8 0 1 1-2.3-5.7" />
                <path d="M20 4v6h-6" />
            </svg>
        ),
        STOP: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="6" y="6" width="12" height="12" rx="2" />
                <path d="M9 9h6v6H9z" fill="var(--primary)" fillOpacity="0.3" stroke="none" />
            </svg>
        ),
        INSPECT: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6" />
                <path d="M20 20l-4-4" />
                <path d="M11 8v6M8 11h6" opacity="0.55" />
            </svg>
        ),
        MAP: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
                <path d="M9 4v14M15 6v14" opacity="0.55" />
            </svg>
        ),
        RETURN: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 12h10a6 6 0 1 1 0 12" transform="translate(0,-6)" />
            </svg>
        ),
        DOCK: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 16h18" />
                <rect x="5" y="7" width="14" height="7" rx="2" />
                <path d="M9 19h6" opacity="0.6" />
            </svg>
        )
    };

    const Icon = icons[actionName] || icons.SCAN;

    return (
        <div 
            className={`robot-card glass ${loading ? 'holographic' : ''}`} 
            style={{ 
                padding: '1.5rem 1rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                border: loading ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                transition: 'var(--transition)'
            }}
        >
            <div style={{ 
                fontSize: '2.5rem', 
                marginBottom: '0.5rem',
                color: 'var(--primary)',
                filter: loading ? 'drop-shadow(0 0 20px var(--primary))' : 'drop-shadow(0 0 10px var(--primary-glow))',
                transition: 'var(--transition)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: loading ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
            }}>{Icon}</div>
            
            <div style={{ textAlign: 'center' }}>
                <h3 style={{ 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.25em', 
                    fontWeight: '900', 
                    fontSize: '1.4rem',
                    color: '#fff',
                    marginBottom: '0.25rem'
                }}>{actionName}</h3>
                <div style={{ height: '3px', width: '40px', background: 'var(--primary)', margin: '0.5rem auto', opacity: 0.8 }}></div>
            </div>
            
            <p style={{ 
                color: 'var(--text-dim)', 
                fontSize: '0.7rem', 
                fontFamily: 'var(--font-mono)',
                lineHeight: '1.4',
                maxWidth: '220px',
                letterSpacing: '0.05em'
            }}>
                STATUS: Wallet-connected action trigger
            </p>
            
            <div style={{ 
                margin: '1.25rem 0', 
                padding: '0.5rem 1.5rem',
                background: 'rgba(0, 242, 255, 0.05)',
                borderRadius: '100px',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                fontSize: '1.5rem', 
                fontWeight: '900', 
                color: 'var(--primary)',
                textShadow: '0 0 15px var(--primary-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                {rewardEth} <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: '600' }}>{TESTNET_TOKEN_SYMBOL}</span>
            </div>
            
            <button
                className="connect-btn"
                style={{ 
                    width: '100%', 
                    fontSize: '0.85rem', 
                    padding: '1rem',
                    background: loading ? 'transparent' : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    border: loading ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.4)',
                    color: loading ? 'var(--primary)' : '#000',
                    boxShadow: loading ? 'none' : '0 10px 20px rgba(0, 242, 255, 0.2)',
                    cursor: loading || disabled ? 'not-allowed' : 'pointer'
                }}
                disabled={loading || disabled}
                onClick={handleRequest}
            >
                {loading ? 'Submitting transaction...' : `Execute ${actionName}`}
            </button>
        </div>
    );
};

export default RobotActionButton;
