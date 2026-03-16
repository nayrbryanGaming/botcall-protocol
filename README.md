# BOT-CALL Protocol

BOT-CALL is a decentralized infrastructure for pay-per-action robotics. It enables users to hire autonomous robotic nodes to perform real-world tasks using the Base blockchain for verifiable settlement.

## System Architecture

- **Frontend**: Professional React interface with ethers.js wallet integration.
- **Smart Contract**: Solidity implementation on Base Sepolia for secure task escrow and payment.
- **Backend Listener**: Node.js worker that monitors blockchain events.
- **Robot Simulator**: Simulated robotic node executing physical payloads (Scan, Move, Wave, etc.).

## Quick Start
1. `npm install`
2. Configure `.env` with `PRIVATE_KEY` and `CONTRACT_ADDRESS`.
3. `node backend/listener.js`
4. `npm run dev` in frontend directory.

## Technical Resolution (Exam Answer Key)

### Crisis #1: Infinite Reload Loop
**Root Cause**: Inefficient session synchronization logic that re-triggered on every account change event, conflicting with state updates.
**Resolution**: Implemented a **Singleton Initialization Pattern** using `useRef` and a `syncSession` lock. Added an emergency failsafe timer to ensure UI renders within 2.5s regardless of provider lag.

### Crisis #2: Zero Balance Error
**Root Cause**: Local state was not polling for chain updates after faucet deposits.
**Resolution**: Implemented a **Blockchain Heartbeat** mechanism (12-second interval) that refreshes user balance and task state directly from the Base RPC.

### Crisis #3: Black Screen / Initialization Crash
**Root Cause**: Unhandled `BigInt` objects were passed to React children, causing a fatal render crash before the loading screen could hide.
**Resolution**: Sanitized all contract outputs using `.toString()` and indexed fetching to ensure React-safe primitive rendering.
