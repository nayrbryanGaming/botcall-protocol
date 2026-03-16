const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function drawProgressBar(durationMs, label) {
    const width = 30;
    const steps = 10;
    const stepDuration = durationMs / steps;
    
    process.stdout.write(`[MISSION] ${label} [`);
    for (let i = 0; i <= steps; i++) {
        const percent = Math.round((i / steps) * 100);
        const filledWidth = Math.round((i / steps) * width);
        const emptyWidth = width - filledWidth;
        const bar = "#".repeat(filledWidth) + "-".repeat(emptyWidth);
        
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`[MISSION] ${label} [${bar}] ${percent}%`);
        
        if (i < steps) await sleep(stepDuration);
    }
    process.stdout.write("\n");
}

async function executeAction(action) {
    console.log(`\n[NODE] >>> RECEIVED COMMAND: ${action.toUpperCase()}`);
    console.log(`[NODE] STATUS: NOMINAL | LINK: STABLE`);

    switch (action.toLowerCase()) {
        case "scan":
            await drawProgressBar(3000, "SCANNING ENVIRONMENT");
            return { log: "Environment map generated." };

        case "move":
            await drawProgressBar(4000, "EXECUTING NAVIGATION");
            return { log: "Navigation successful." };

        case "pick object":
            await drawProgressBar(3500, "GRIPPING OBJECT");
            return { log: "Object secured." };

        case "recharge":
            await drawProgressBar(5000, "RESTORE POWER");
            return { log: "System recharged." };

        case "wave":
            await drawProgressBar(2000, "EXECUTING GESTURE");
            return { log: "Greeting protocol completed." };

        default:
            await drawProgressBar(2000, "PROCESSING COMMAND");
            return { log: "Process complete." };
    }
}

module.exports = { executeAction };
