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

    const icons = {
        scan: 'SCN_01',
        move: 'NAV_02',
        'pick object': 'ACT_03',
        patrol: 'SEC_04',
        recharge: 'PWR_05',
        wave: 'WAV_06'
    };

    const icon = icons[actionName] || 'SYS_XX';

    return (
        <div 
            className={`robot-card glass ${loading ? 'holographic' : ''}`} 
            onClick={!loading && !disabled ? handleRequest : undefined} 
            style={{ 
                cursor: loading || disabled ? 'not-allowed' : 'pointer',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
            }}
        >
            <div style={{ 
                fontSize: '3rem', 
                marginBottom: '0.5rem',
                filter: loading ? 'drop-shadow(0 0 20px var(--primary))' : 'drop-shadow(0 0 10px var(--primary-glow))',
                transition: 'var(--transition)'
            }}>{icon}</div>
            
            <h3 style={{ 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em', 
                fontWeight: '800', 
                fontSize: '1.1rem',
                color: '#fff'
            }}>{actionName}</h3>
            
            <p style={{ 
                color: 'var(--text-dim)', 
                fontSize: '0.7rem', 
                fontFamily: 'var(--font-mono)',
                lineHeight: '1.4'
            }}>
                [AUTH_L4] // Execute target procedure on remote cluster.
            </p>
            
            <div style={{ 
                margin: '1.5rem 0', 
                fontSize: '1.4rem', 
                fontWeight: '900', 
                color: 'var(--primary)',
                textShadow: '0 0 10px var(--primary-glow)' 
            }}>
                {rewardEth} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>ETH</span>
            </div>
            
            <button
                className="connect-btn"
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.75rem' }}
                disabled={loading || disabled}
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? "LINKING..." : `EXECUTE`}
            </button>
        </div>
    );
};

export default RobotActionButton;
