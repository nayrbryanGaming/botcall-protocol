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
            if (reason.includes("user rejected")) {
                // Ignore user rejection
            } else {
                alert(`MISSION INTERFACE ERROR: ${reason}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const icon =
        actionName === 'scan' ? '📡' :
            actionName === 'move' ? '🧭' :
                actionName === 'pick object' ? '🤖' :
                    actionName === 'patrol' ? '🛡️' :
                        actionName === 'recharge' ? '⚡' : '⚙️';

    return (
        <div className="robot-card glass holographic" onClick={!loading && !disabled ? handleRequest : undefined} style={{ cursor: 'pointer', position: 'relative' }}>
            <div className="tech-corner-top"></div>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px var(--primary-glow))' }}>{icon}</div>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: '950', fontSize: '1.2rem' }}>{actionName}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', margin: '1rem 0', minHeight: '3em', fontFamily: 'var(--font-mono)' }}>
                [AUTH_REQUIRED] // Execute {actionName} on robotic cluster.
            </p>
            <div style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: '950', color: 'var(--primary)', textShadow: '0 0 10px var(--primary-glow)' }}>
                {rewardEth} <span style={{ fontSize: '0.8rem' }}>ETH</span>
            </div>
            <button
                className="connect-btn"
                style={{ width: '100%', pointerEvents: 'none' }}
                disabled={loading || disabled || !CONTRACT_ADDRESS}
            >
                {loading ? ">>> [LINKING...]" : `AUTHORIZE_${actionName.toUpperCase()}`}
            </button>
            <div className="tech-corner-bottom"></div>
        </div>
    );
};

export default RobotActionButton;
