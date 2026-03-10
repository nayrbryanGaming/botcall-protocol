const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function drawProgressBar(durationMs, label) {
    const width = 30;
    const steps = 10;
    const stepDuration = durationMs / steps;
    
    process.stdout.write(`[ROBOT] ${label} [`);
    for (let i = 0; i <= steps; i++) {
        const percent = Math.round((i / steps) * 100);
        const filledWidth = Math.round((i / steps) * width);
        const emptyWidth = width - filledWidth;
        const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);
        
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`[ROBOT] ${label} [${bar}] ${percent}%`);
        
        if (i < steps) await sleep(stepDuration);
    }
    process.stdout.write("\n");
}

async function executeAction(action) {
    console.log(`\n🤖 [ROBOT] >>> Incoming Command: ${action.toUpperCase()}`);
    console.log(`[ROBOT] System Status: NOMINAL | Battery: ${Math.floor(Math.random() * 20) + 80}% | Connection: STABLE`);
    console.log(`[ROBOT] Sensors: [LIDAR: OK] [IMU: OK] [ENCODERS: OK]`);

    switch (action.toLowerCase()) {
        case "scan":
            console.log("[ROBOT] Calibrating 3D depth sensors...");
            await sleep(1000);
            await drawProgressBar(3000, "SCANNING ENVIRONMENT");
            return { battery: Math.floor(Math.random() * 20) + 70, sensors: "OK", log: "Obstacle map generated." };

        case "move":
            console.log("[ROBOT] Engaging drivetrain motors...");
            await sleep(1000);
            await drawProgressBar(4000, "NAVIGATING TO TARGET");
            return { battery: Math.floor(Math.random() * 20) + 60, sensors: "OK", log: "Navigation successful." };

        case "pick object":
            console.log("[ROBOT] Initializing end-effector torque sensors...");
            await sleep(1000);
            await drawProgressBar(3500, "GRIPPING OBJECT");
            return { battery: Math.floor(Math.random() * 20) + 50, sensors: "OK", log: "Object secured in manipulator." };

        case "recharge":
            console.log("[ROBOT] Locating induction charging station...");
            await sleep(1000);
            await drawProgressBar(5000, "CHARGING BATTERY");
            return { battery: 100, sensors: "OK", log: "Battery capacity restored to 100%." };

        case "patrol":
            console.log("[ROBOT] Initializing autonomous loop...");
            await sleep(1000);
            await drawProgressBar(6000, "SECURITY PATROL");
            return { battery: Math.floor(Math.random() * 20) + 40, sensors: "OK", log: "Area clear. No anomalies detected." };

        default:
            console.log(`[ROBOT] WARNING: Command "${action}" not in standard library.`);
            await drawProgressBar(2000, "PROCESSING GENERIC CMD");
            return { battery: 100, sensors: "OK", log: "Process complete." };
    }
}

module.exports = { executeAction };
