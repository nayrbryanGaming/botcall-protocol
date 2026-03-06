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

            console.log("Transaction sent:", tx.hash);
            onActionInitiated(tx.hash);
            await tx.wait();
            console.log("Transaction confirmed");
        } catch (error) {
            console.error("Action request failed:", error);
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="robot-card">
            <h3>{actionName.charAt(0) + actionName.slice(1).toLowerCase()}</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Remote command for the BOT-CALL robot executor.
            </p>
            <div style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {rewardEth} ETH
            </div>
            <button
                onClick={handleRequest}
                disabled={loading || disabled || !CONTRACT_ADDRESS}
            >
                {loading ? "Confirming..." : `Hire Robot to ${actionName}`}
            </button>
        </div>
    );
};

export default RobotActionButton;
