import { useState } from 'react';
import { ethers } from 'ethers';
import { BOT_CALL_ABI, CONTRACT_ADDRESS } from '../config';

const RobotActionButton = ({ actionName, rewardEth, disabled, onActionInitiated }) => {
    const [loading, setLoading] = useState(false);

    const handleRequest = async () => {
        if (!window.ethereum) return alert("Please install MetaMask");

        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, BOT_CALL_ABI, signer);

            const tx = await contract.requestAction(actionName, {
                value: ethers.parseEther(rewardEth)
            });

            onActionInitiated(tx.hash);
            await tx.wait();
        } catch (error) {
            console.error("Action request failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const icon = actionName === 'wave' ? '👋' : actionName === 'scan room' ? '📷' : '🤖';

    return (
        <div className="robot-card glass">
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{icon}</div>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{actionName}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '1rem 0' }}>
                On-chain request for autonomous unit execution.
            </p>
            <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)' }}>
                {rewardEth} ETH
            </div>
            <button
                className="connect-btn"
                style={{ width: '100%' }}
                onClick={handleRequest}
                disabled={loading || disabled || !CONTRACT_ADDRESS}
            >
                {loading ? "TRANSACTING..." : `EXECUTE ${actionName.toUpperCase()}`}
            </button>
        </div>
    );
};

export default RobotActionButton;
