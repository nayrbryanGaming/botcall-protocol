/**
 * Robot Simulator
 * Simulates real-world robot actions with delays.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeAction(action) {
    console.log(`\n[ROBOT] Received task: ${action}`);

    switch (action.toLowerCase()) {
        case "wave":
            console.log("[ROBOT] Initializing actuators...");
            await sleep(2000);
            console.log("[ROBOT] Action: Waving hand...");
            await sleep(3000);
            console.log("[ROBOT] Action completed: Wave successful.");
            return true;

        case "scan room":
            console.log("[ROBOT] Powering up LIDAR sensors...");
            await sleep(2000);
            console.log("[ROBOT] Action: Scanning environment...");
            await sleep(5000);
            console.log("[ROBOT] Action completed: Map generated.");
            return true;

        default:
            console.log(`[ROBOT] Action "${action}" not recognized. Performing generic calibration...`);
            await sleep(3000);
            console.log("[ROBOT] Generic action completed.");
            return true;
    }
}

module.exports = { executeAction };
