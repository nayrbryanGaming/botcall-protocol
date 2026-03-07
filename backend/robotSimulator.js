const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeAction(action) {
    console.log(`\n🤖 [ROBOT] >>> Incoming Command: ${action.toUpperCase()}`);
    console.log(`[ROBOT] System Status: NOMINAL | Battery: ${Math.floor(Math.random() * 20) + 80}% | Connection: STABLE`);
    console.log(`[ROBOT] Sensors: [LIDAR: OK] [IMU: OK] [ENCODERS: OK]`);

    switch (action.toLowerCase()) {
        case "wave":
            console.log("[ROBOT] Calibrating 7-DOF arm actuators...");
            await sleep(1500);
            console.log("[ROBOT] ACTION: Executing friendly wave gesture 👋");
            await sleep(2500);
            console.log("[ROBOT] TELEMETRY: Torque peaked at 1.2Nm | Velocity: 0.5rad/s");
            const bat1 = Math.floor(Math.random() * 20) + 80;
            return { battery: bat1, sensors: "OK", log: "Gesture completed successfully." };

        case "scan room":
            console.log("[ROBOT] Deploying high-resolution LIDAR array...");
            await sleep(2000);
            console.log("[ROBOT] ACTION: 360-degree environmental mapping in progress 📷");
            await sleep(4000);
            console.log("[ROBOT] TELEMETRY: 4.2M points collected | Precision: 0.2mm");
            const bat2 = Math.floor(Math.random() * 20) + 80;
            return { battery: bat2, sensors: "OK", log: "Point cloud data stored to local buffer." };

        default:
            console.log(`[ROBOT] WARNING: Command "${action}" not in standard library.`);
            console.log("[ROBOT] ACTION: Initializing generic cognitive response...");
            await sleep(2000);
            return { battery: 100, sensors: "OK", log: "Process complete." };
    }
}

module.exports = { executeAction };
