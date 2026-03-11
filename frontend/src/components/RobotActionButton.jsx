import { useState } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS } from '../config';

const RobotActionButton = ({ actionName, rewardEth, disabled, onActionInitiated }) => {
    const [loading, setLoading] = useState(false);

    const handleRequest = async () => {
        if (!window.ethereum) return alert("Neural Link required: Please install MetaMask.");

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
            onClick={!loading && !disabled ? handleRequest : undefined} 
            style={{ 
                cursor: loading || disabled ? 'not-allowed' : 'pointer',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
            }}
        >
            <div style={{ 
                fontSize: '2rem', 
                marginBottom: '0.5rem',
                color: 'var(--primary)',
                filter: loading ? 'drop-shadow(0 0 15px var(--primary))' : 'drop-shadow(0 0 10px var(--primary-glow))',
                transition: 'var(--transition)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: loading ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
            }}>{Icon}</div>
            
            <div style={{ textAlign: 'center' }}>
                <h3 style={{ 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.2em', 
                    fontWeight: '900', 
                    fontSize: '1.25rem',
                    color: '#fff',
                    marginBottom: '0.25rem'
                }}>{actionName}</h3>
                <div style={{ height: '2px', width: '30px', background: 'var(--primary)', margin: '0.5rem auto', opacity: 0.6 }}></div>
            </div>
            
            <p style={{ 
                color: 'var(--text-dim)', 
                fontSize: '0.75rem', 
                fontFamily: 'var(--font-mono)',
                lineHeight: '1.5',
                maxWidth: '220px'
            }}>
                [AUTH_L4] // DISPATCH_KEY_V3 // TARGET_NODE: TITAN-01
            </p>
            
            <div style={{ 
                margin: '1.5rem 0', 
                padding: '0.5rem 1.5rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '100px',
                border: '1px solid var(--glass-border)',
                fontSize: '1.6rem', 
                fontWeight: '950', 
                color: 'var(--primary)',
                textShadow: '0 0 15px var(--primary-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                {rewardEth} <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: '400' }}>ETH</span>
            </div>
            
            <button
                className="connect-btn"
                style={{ 
                    width: '100%', 
                    fontSize: '0.8rem', 
                    padding: '1rem',
                    background: loading ? 'var(--bg-black)' : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    border: loading ? '1px solid var(--primary)' : 'none',
                    color: loading ? 'var(--primary)' : '#000'
                }}
                disabled={loading || disabled}
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? "ESTABLISHING_LINK..." : `AUTHORIZE_CORE`}
            </button>
        </div>
    );
};

export default RobotActionButton;
