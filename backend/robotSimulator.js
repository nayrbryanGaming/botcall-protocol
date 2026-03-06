/**
 * Robot Simulator
 * Simulates real-world robot actions with delays.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeAction(action) {
    console.log(`\n🤖 [ROBOT] >>> Incoming Command: ${action.toUpperCase()}`);
    console.log(`[ROBOT] System Status: NOMINAL | Battery: 98% | Connection: STABLE`);

    switch (action.toLowerCase()) {
        case "wave":
            console.log("[ROBOT] Calibrating 7-DOF arm actuators...");
            await sleep(2000);
            console.log("[ROBOT] ACTION: Executing friendly wave gesture 👋");
            await sleep(3000);
            console.log("[ROBOT] RESULT: Gesture completed successfully.");
            return true;

        case "scan room":
            console.log("[ROBOT] Deploying high-resolution LIDAR array...");
            await sleep(2000);
            console.log("[ROBOT] ACTION: 360-degree environmental mapping in progress 📷");
            await sleep(5000);
            console.log("[ROBOT] RESULT: Point cloud data stored to local buffer.");
            return true;

        default:
            console.log(`[ROBOT] WARNING: Command "${action}" not in standard library.`);
            console.log("[ROBOT] ACTION: Initializing generic cognitive response...");
            await sleep(3000);
            console.log("[ROBOT] RESULT: Process complete.");
            return true;
    }
}

module.exports = { executeAction };
