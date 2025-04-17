const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let speed = 50; // Initial speed (km/h)
let alertText = "";

// Player vehicle
const player = {
    x: 100,
    y: 300,
    width: 40,
    height: 20
};

// Scenario triggers
const scenarios = {
    speedZone: { x: 300, active: false, limit: 30 },
    following: { frontCar: { x: 500, y: 300 }, safeDistance: 75 },
    junction: { x: 700, priority: false }
};

// Game loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scenario 1: Speed Zone Compliance
    if (player.x > scenarios.speedZone.x && !scenarios.speedZone.active) {
        scenarios.speedZone.active = true;
        speed = Math.min(speed, scenarios.speedZone.limit); // Enforce limit
        alertText = "Speed Zone: Decelerating to 30 km/h!";
    }

    // Scenario 2: Inter-Vehicle Following
    const distance = scenarios.following.frontCar.x - player.x;
    if (distance < scenarios.following.safeDistance) {
        speed = Math.max(speed - 1, 0); // Slow down
        alertText = "Too Close! Maintaining Safe Distance.";
    }

    // Scenario 3: Junction Arbitration
    if (player.x > scenarios.junction.x && !scenarios.junction.priority) {
        speed = 0; // Full stop
        alertText = "Junction: Waiting for Priority...";
    }

    // Render
    drawPlayer();
    drawScenarios();
    updateHUD();
    requestAnimationFrame(update);
}

function drawPlayer() {
    ctx.fillStyle = "#3498db";
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawScenarios() {
    // Speed Zone
    ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
    ctx.fillRect(scenarios.speedZone.x, 0, 100, canvas.height);

    // Junction
    ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
    ctx.fillRect(scenarios.junction.x, 0, 50, canvas.height);
}

function updateHUD() {
    document.getElementById('speed').textContent = speed;
    document.getElementById('alert').textContent = alertText;
}

// Controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && speed < 100) speed += 2;
    if (e.key === 'ArrowLeft' && speed > 0) speed -= 2;
    player.x += speed / 5; // Simulate movement
});

// Start game
update();
