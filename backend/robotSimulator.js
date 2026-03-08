const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeAction(action) {
    console.log(`\n🤖 [ROBOT] >>> Incoming Command: ${action.toUpperCase()}`);
    console.log(`[ROBOT] System Status: NOMINAL | Battery: ${Math.floor(Math.random() * 20) + 80}% | Connection: STABLE`);
    console.log(`[ROBOT] Sensors: [LIDAR: OK] [IMU: OK] [ENCODERS: OK]`);

    switch (action.toLowerCase()) {
        case "scan":
            console.log("[ROBOT] Calibrating 3D depth sensors...");
            await sleep(1500);
            console.log("[ROBOT] ACTION: Scanning environment for obstacles 🔍");
            await sleep(2500);
            return { battery: Math.floor(Math.random() * 20) + 70, sensors: "OK", log: "Obstacle map generated." };

        case "move":
            console.log("[ROBOT] Engaging drivetrain motors...");
            await sleep(1000);
            console.log("[ROBOT] ACTION: Moving to target coordinates [X:12, Y:45] 🏎️");
            await sleep(3000);
            return { battery: Math.floor(Math.random() * 20) + 60, sensors: "OK", log: "Navigation successful." };

        case "pick object":
            console.log("[ROBOT] Initializing end-effector torque sensors...");
            await sleep(2000);
            console.log("[ROBOT] ACTION: Gripping target object with precision 🦾");
            await sleep(3000);
            return { battery: Math.floor(Math.random() * 20) + 50, sensors: "OK", log: "Object secured in manipulator." };

        case "recharge":
            console.log("[ROBOT] Locating induction charging station...");
            await sleep(1500);
            console.log("[ROBOT] ACTION: Aligning with charging pad ⚡");
            await sleep(4000);
            return { battery: 100, sensors: "OK", log: "Battery capacity restored to 100%." };

        case "patrol":
            console.log("[ROBOT] Initializing autonomous loop...");
            await sleep(1000);
            console.log("[ROBOT] ACTION: Executing security sweep of perimeter 🚓");
            await sleep(5000);
            return { battery: Math.floor(Math.random() * 20) + 40, sensors: "OK", log: "Area clear. No anomalies detected." };

        default:
            console.log(`[ROBOT] WARNING: Command "${action}" not in standard library.`);
            console.log("[ROBOT] ACTION: Initializing generic cognitive response...");
            await sleep(2000);
            return { battery: 100, sensors: "OK", log: "Process complete." };
    }
}

module.exports = { executeAction };
