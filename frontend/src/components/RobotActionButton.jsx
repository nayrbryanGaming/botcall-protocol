import { useState } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS } from '../config';

const formatRequestError = (error) => {
    const raw = error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message || 'Unknown error';
    const msg = String(raw);
    const lower = msg.toLowerCase();

    if (lower.includes('insufficient funds')) {
        return 'Insufficient Base Sepolia ETH for reward and gas.';
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

    const Icons = {
        SCAN: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" opacity="0.4" />
                <g>
                    <path d="M12 12l8-5" strokeWidth="2" stroke="var(--primary)">
                       <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="3s" repeatCount="indefinite" />
                    </path>
                    <circle cx="12" cy="12" r="2" fill="var(--primary)" />
                </g>
                <circle cx="12" cy="12" r="6" strokeDasharray="2 4" opacity="0.3" />
            </svg>
        ),
        MOVE: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12h8" opacity="0.3" strokeWidth="1" />
                <rect x="2" y="11" width="2" height="2" fill="currentColor" opacity="0.5" />
            </svg>
        ),
        PICK_OBJECT: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 11V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6" />
                <path d="M4 11h16v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8z" />
                <path d="M9 15h6M12 11v8" opacity="0.4" />
                <path d="M7 11l-2 4m12-4l2 4" opacity="0.6" />
            </svg>
        ),
        PATROL: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 11l2 2 4-4" strokeWidth="2" />
                <circle cx="12" cy="11" r="5" strokeOpacity="0.2" />
            </svg>
        ),
        RECHARGE: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="6" width="16" height="12" rx="2" strokeWidth="2" />
                <path d="M22 10v4M6 12l2-3h-3l2-3" fill="var(--primary)" transform="translate(4, 5)" />
                <path d="M18 9h1v6h-1" opacity="0.4" />
            </svg>
        ),
        WAVE: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
                <path d="M14 10V5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
        )
    };

    const Icon = Icons[actionName] || Icons.SCAN;

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
                {rewardEth} <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: '600' }}>ETH</span>
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
