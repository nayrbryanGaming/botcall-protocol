import { useState } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS } from '../config';

const RobotActionButton = ({ actionName, rewardEth, disabled, onActionInitiated }) => {
    const [loading, setLoading] = useState(false);

    const handleRequest = async () => {
        if (!window.ethereum) return alert("Neural Link required: Please install a secure Web3 wallet provider (e.g. Rabby, Coinbase, etc.) to interface with the protocol.");

        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);

            const tx = await contract.requestAction(actionName, {
                value: ethers.parseEther(rewardEth)
            });

            console.log("Transmission sent:", tx.hash);
            await tx.wait();
            if (onActionInitiated) onActionInitiated(tx.hash);
        } catch (error) {
            console.error("Transmission failed:", error);
            const reason = error.reason || error.message;
            if (!reason.includes("user rejected")) {
                alert(`MISSION INTERFACE ERROR: ${reason}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const Icons = {
        SCAN: (
            <svg width="40" height="40" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                <path d="M20 50H80" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <circle cx="50" cy="50" r="5" fill="currentColor" />
            </svg>
        ),
        MOVE: (
            <svg width="40" height="40" viewBox="0 0 100 100">
                <path d="M50 20L80 50L50 80L20 50Z" stroke="currentColor" strokeWidth="2" />
                <path d="M50 40V60M40 50H60" stroke="currentColor" strokeWidth="2" />
            </svg>
        ),
        PICK_OBJECT: (
            <svg width="40" height="40" viewBox="0 0 100 100">
                <path d="M30 70V30H70V70M40 30V20H60V30" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="2" />
            </svg>
        ),
        PATROL: (
            <svg width="40" height="40" viewBox="0 0 100 100">
                <path d="M20 20L80 20L80 80L20 80Z" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" />
                <rect x="40" y="40" width="20" height="20" stroke="currentColor" strokeWidth="2" />
            </svg>
        ),
        RECHARGE: (
            <svg width="40" height="40" viewBox="0 0 100 100">
                <path d="M40 20L30 50H50L40 80L70 40H50L60 20Z" fill="currentColor" />
            </svg>
        ),
        WAVE: (
            <svg width="40" height="40" viewBox="0 0 100 100">
                <path d="M30 60C30 40 70 40 70 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M50 60V80" stroke="currentColor" strokeWidth="2" />
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
                ID: PROTO-PLATINUM // STATUS: MULTI-WALLET READY
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
                {loading ? "DATA_LINK_ESTABLISHING..." : `EXECUTE ${actionName}`}
            </button>
        </div>
    );
};

export default RobotActionButton;
