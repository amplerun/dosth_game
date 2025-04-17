// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const LANE_COUNT = 4;
const LANE_WIDTH = 50;
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH;
const ROAD_OFFSET = (CANVAS_WIDTH - ROAD_WIDTH) / 2;
const CAR_WIDTH = 30;
const CAR_HEIGHT = 50;
const MAX_SPEED = 70; // km/h
const MAX_ACCELERATION = 10;
const DECELERATION = 15;
const NATURAL_DECELERATION = 5;
const COLLISION_DISTANCE = 5; // meters

// Game variables
let canvas, ctx;
let gameRunning = false;
let gamePaused = false;
let score = 0;
let speedBonus = 0;
let animationId;
let lastTimestamp = 0;
let deltaTime = 0;

// Player car
const player = {
    x: 0,
    y: CANVAS_HEIGHT - 100,
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    lane: 1,
    speed: 0, // km/h
    targetSpeed: 0,
    laneChangeSpeed: 2
};

// Game elements
let roadSegments = [];
let trafficCars = [];
let speedZones = [];
let junctions = [];
let currentSpeedLimit = MAX_SPEED;
let distanceTraveled = 0;
let nextJunctionDistance = 1500; // Distance to first junction

// Game state
let currentJunction = null;
let priorityGroup = 0;
let playerGroup = 0;

// Initialize the game
window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Event listeners for game controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', startGame);
    
    // Load assets
    loadAssets().then(() => {
        // Show menu
        document.getElementById('gameMenu').classList.remove('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        
        // Draw initial screen
        drawMenuBackground();
    });
};

// Asset loading
function loadAssets() {
    return new Promise((resolve) => {
        // In a full implementation, load actual assets here
        resolve();
    });
}

// Game initialization
function startGame() {
    // Hide menus
    document.getElementById('gameMenu').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    
    // Reset game state
    score = 0;
    speedBonus = 0;
    distanceTraveled = 0;
    nextJunctionDistance = 1500;
    player.speed = 0;
    player.lane = 1;
    player.x = ROAD_OFFSET + player.lane * LANE_WIDTH + (LANE_WIDTH - player.width) / 2;
    player.y = CANVAS_HEIGHT - 100;
    
    roadSegments = [];
    trafficCars = [];
    speedZones = [];
    junctions = [];
    currentSpeedLimit = MAX_SPEED;
    
    // Generate initial road
    generateInitialRoad();
    
    // Start game loop
    gameRunning = true;
    gamePaused = false;
    lastTimestamp = performance.now();
    requestAnimationFrame(gameLoop);
}

// Generate initial road segments and elements
function generateInitialRoad() {
    // Create initial speed zone
    speedZones.push({
        start: 0,
        end: 500,
        limit: 50
    });
    
    // Add initial traffic cars (one per lane except player's lane)
    for (let i = 0; i < LANE_COUNT; i++) {
        if (i !== player.lane) {
            const distance = Math.random() * 300 + 200;
            trafficCars.push({
                lane: i,
                distance: distance,
                speed: Math.random() * 20 + 30, // 30-50 km/h
                x: 0, // Will be calculated in update
                y: 0  // Will be calculated in update
            });
        }
    }
}

// Main game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;
    if (gamePaused) {
        lastTimestamp = timestamp;
        animationId = requestAnimationFrame(gameLoop);
        return;
    }
    
    // Calculate delta time in seconds
    deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    
    // Cap delta time to prevent jumps after tab switch
    if (deltaTime > 0.1) deltaTime = 0.1;
    
    update(deltaTime);
    render();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Handle game updates
function update(deltaTime) {
    // Update score
    score += Math.floor(deltaTime);
    
    // Update player's lane position (smooth lane changing)
    const targetX = ROAD_OFFSET + player.lane * LANE_WIDTH + (LANE_WIDTH - player.width) / 2;
    if (player.x < targetX) {
        player.x += player.laneChangeSpeed * player.speed * deltaTime;
        if (player.x > targetX) player.x = targetX;
    } else if (player.x > targetX) {
        player.x -= player.laneChangeSpeed * player.speed * deltaTime;
        if (player.x < targetX) player.x = targetX;
    }
    
    // Apply natural deceleration
    if (player.speed > player.targetSpeed) {
        player.speed -= NATURAL_DECELERATION * deltaTime;
        if (player.speed < player.targetSpeed) player.speed = player.targetSpeed;
    }
    
    // Update distance traveled based on current speed
    const distanceDelta = (player.speed / 3.6) * deltaTime; // Convert km/h to m/s
    distanceTraveled += distanceDelta;
    
    // Check for current speed zone
    currentSpeedLimit = MAX_SPEED;
    for (const zone of speedZones) {
        if (distanceTraveled >= zone.start && distanceTraveled <= zone.end) {
            currentSpeedLimit = zone.limit;
            break;
        }
    }
    
    // Cap player speed to current limit
    if (player.speed > currentSpeedLimit) {
        player.speed = currentSpeedLimit;
        player.targetSpeed = currentSpeedLimit;
    }
    
    // Update traffic cars
    updateTrafficCars(deltaTime, distanceDelta);
    
    // Check for junction approach and handling
    updateJunctions(deltaTime);
    
    // Generate new road elements
    generateRoadElements();
    
    // Check for collisions
    checkCollisions();
    
    // Update HUD elements
    updateHUD();
}

// Update traffic cars position and behavior
function updateTrafficCars(deltaTime, playerDistanceDelta) {
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        
        // Update car's distance relative to player
        const relativeSpeed = player.speed - car.speed;
        car.distance -= (relativeSpeed / 3.6) * deltaTime;
        
        // Calculate screen position
        car.y = player.y - car.distance;
        car.x = ROAD_OFFSET + car.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
        
        // Remove cars that are far behind
        if (car.distance < -100) {
            trafficCars.splice(i, 1);
            continue;
        }
        
        // Slow down player if too close to car in front
        if (car.lane === player.lane && car.distance > 0 && car.distance < COLLISION_DISTANCE + (player.speed / 10)) {
            player.speed = Math.max(car.speed - 5, 0);
            player.targetSpeed = player.speed;
        }
    }
    
    // Add new cars ahead
    if (Math.random() < 0.02) {
        const availableLanes = [];
        for (let i = 0; i < LANE_COUNT; i++) {
            let laneOccupied = false;
            for (const car of trafficCars) {
                if (car.lane === i && car.distance > 300 && car.distance < 600) {
                    laneOccupied = true;
                    break;
                }
            }
            if (!laneOccupied) availableLanes.push(i);
        }
        
        if (availableLanes.length > 0) {
            const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            const distance = 500 + Math.random() * 200;
            
            trafficCars.push({
                lane: lane,
                distance: distance,
                speed: Math.random() * (currentSpeedLimit - 20) + 20,
                x: 0,
                y: 0
            });
        }
    }
}

// Update junction handling
function updateJunctions(deltaTime) {
    // Check if approaching a junction
    if (distanceTraveled > nextJunctionDistance - 200 && !currentJunction) {
        // Create a new junction
        currentJunction = {
            distance: nextJunctionDistance,
            priorityGroup: Math.floor(Math.random() * 4), // 0-3, representing traffic light groups
            timer: 10, // seconds per group
            active: false
        };
        
        // Player is always in group 0 (for simplicity)
        playerGroup = 0;
        
        document.getElementById('message').textContent = "Junction ahead! Prepare to stop.";
    }
    
    // Handle active junction
    if (currentJunction) {
        const distanceToJunction = currentJunction.distance - distanceTraveled;
        
        // Update junction status
        if (distanceToJunction <= 100 && !currentJunction.active) {
            currentJunction.active = true;
            document.getElementById('message').textContent = 
                playerGroup === currentJunction.priorityGroup ? 
                "You have priority! Proceed with caution." : 
                "Stop at the junction and wait for your turn.";
        }
        
        // When player is at the junction
        if (distanceToJunction <= 5 && distanceToJunction >= -10) {
            // Check if player has priority
            if (playerGroup !== currentJunction.priorityGroup) {
                // Force player to stop if not their turn
                if (player.speed > 5) {
                    player.speed = 0;
                    player.targetSpeed = 0;
                    document.getElementById('message').textContent = "RED LIGHT! You must stop.";
                }
            } else {
                document.getElementById('message').textContent = "GREEN LIGHT! You may proceed.";
            }
        }
        
        // Update junction timer and priority groups
        if (currentJunction.active) {
            currentJunction.timer -= deltaTime;
            if (currentJunction.timer <= 0) {
                currentJunction.timer = 10;
                currentJunction.priorityGroup = (currentJunction.priorityGroup + 1) % 4;
                
                // Update message if player is at junction
                if (distanceToJunction <= 5 && distanceToJunction >= -10) {
                    document.getElementById('message').textContent = 
                        playerGroup === currentJunction.priorityGroup ? 
                        "GREEN LIGHT! You may proceed." : 
                        "RED LIGHT! You must stop.";
                }
            }
        }
        
        // Clear junction when passed
        if (distanceToJunction < -50) {
            currentJunction = null;
            document.getElementById('message').textContent = "";
            nextJunctionDistance = distanceTraveled + 1000 + Math.random() * 1000;
        }
    }
}

// Generate new road elements based on player's progress
function generateRoadElements() {
    // Generate new speed zones
    if (speedZones.length < 3) {
        const lastZone = speedZones[speedZones.length - 1];
        const newZoneStart = lastZone.end + Math.random() * 300 + 100;
        const newZoneLength = Math.random() * 300 + 200;
        
        // Randomize speed limits (30, 50, 70)
        const speedLimits = [30, 50, 70];
        const newLimit = speedLimits[Math.floor(Math.random() * speedLimits.length)];
        
        speedZones.push({
            start: newZoneStart,
            end: newZoneStart + newZoneLength,
            limit: newLimit
        });
    }
    
    // Remove old speed zones
    while (speedZones.length > 0 && speedZones[0].end < distanceTraveled - 100) {
        speedZones.shift();
    }
}

// Check for collisions with other cars
function checkCollisions() {
    for (const car of trafficCars) {
        if (car.lane === player.lane && 
            car.distance > -CAR_HEIGHT && 
            car.distance < CAR_HEIGHT) {
            
            // Game over on collision
            gameOver();
            return;
        }
    }
}

// Update HUD information
function updateHUD() {
    document.getElementById('score').textContent = `Score: ${score + speedBonus}`;
    document.getElementById('speed').textContent = `Speed: ${Math.floor(player.speed)} km/h`;
    document.getElementById('speedLimit').textContent = `Speed Limit: ${currentSpeedLimit} km/h`;
}

// Game over handling
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    document.getElementById('finalScore').textContent = `Final Score: ${score + speedBonus}`;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Draw game elements
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw road background
    drawRoad();
    
    // Draw speed zones
    drawSpeedZones();
    
    // Draw junction
    if (currentJunction) {
        drawJunction();
    }
    
    // Draw traffic cars
    drawTrafficCars();
    
    // Draw player car
    drawPlayerCar();
}

// Draw the road
function drawRoad() {
    // Draw road background
    ctx.fillStyle = '#222222';
    ctx.fillRect(ROAD_OFFSET, 0, ROAD_WIDTH, CANVAS_HEIGHT);
    
    // Draw lane markers
    ctx.strokeStyle = '#ffff00';
    ctx.setLineDash([20, 20]); // Dashed line
    
    for (let i = 1; i < LANE_COUNT; i++) {
        const x = ROAD_OFFSET + i * LANE_WIDTH;
        
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // Draw solid side lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    // Left boundary
    ctx.beginPath();
    ctx.moveTo(ROAD_OFFSET, 0);
    ctx.lineTo(ROAD_OFFSET, CANVAS_HEIGHT);
    ctx.stroke();
    
    // Right boundary
    ctx.beginPath();
    ctx.moveTo(ROAD_OFFSET + ROAD_WIDTH, 0);
    ctx.lineTo(ROAD_OFFSET + ROAD_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();
}

// Draw speed zones
function drawSpeedZones() {
    for (const zone of speedZones) {
        if (distanceTraveled < zone.start - 100 || distanceTraveled > zone.end + 100) continue;
        
        // Calculate position on screen
        const zoneTop = player.y - (zone.end - distanceTraveled);
        const zoneBottom = player.y - (zone.start - distanceTraveled);
        
        // Select color based on speed limit
        let color;
        switch (zone.limit) {
            case 30: color = 'rgba(255, 0, 0, 0.2)'; break;
            case 50: color = 'rgba(255, 255, 0, 0.2)'; break;
            case 70: color = 'rgba(0, 255, 0, 0.2)'; break;
            default: color = 'rgba(0, 0, 255, 0.2)';
        }
        
        // Draw zone
        ctx.fillStyle = color;
        ctx.fillRect(ROAD_OFFSET, zoneTop, ROAD_WIDTH, zoneBottom - zoneTop);
        
        // Draw speed limit sign at the start of the zone
        if (zoneTop < CANVAS_HEIGHT && zoneTop > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.arc(ROAD_OFFSET - 20, zoneTop + 20, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.limit, ROAD_OFFSET - 20, zoneTop + 20);
        }
    }
}

// Draw junction
function drawJunction() {
    if (!currentJunction) return;
    
    const distanceToJunction = currentJunction.distance - distanceTraveled;
    
    // Only draw if junction is visible
    if (distanceToJunction > 300 || distanceToJunction < -100) return;
    
    const junctionY = player.y - distanceToJunction;
    
    // Draw junction background
    ctx.fillStyle = '#444444';
    ctx.fillRect(ROAD_OFFSET - 100, junctionY - 50, ROAD_WIDTH + 200, 100);
    
    // Draw crossing roads
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, junctionY - 25, CANVAS_WIDTH, 50);
    
    // Draw traffic lights
    const lightSize = 10;
    const lightSpacing = 5;
    const lightY = junctionY - 40;
    
    for (let i = 0; i < 4; i++) {
        const isGreen = i === currentJunction.priorityGroup;
        
        // Draw traffic light background
        ctx.fillStyle = '#000000';
        ctx.fillRect(
            ROAD_OFFSET - 30, 
            lightY + i * (lightSize + lightSpacing), 
            20, 
            lightSize
        );
        
        // Draw traffic light indicator
        ctx.fillStyle = isGreen ? '#00ff00' : '#ff0000';
        ctx.fillRect(
            ROAD_OFFSET - 25, 
            lightY + i * (lightSize + lightSpacing), 
            10, 
            lightSize
        );
    }
}

// Draw traffic cars
function drawTrafficCars() {
    for (const car of trafficCars) {
        // Only draw if on screen
        if (car.y < -CAR_HEIGHT || car.y > CANVAS_HEIGHT) continue;
        
        // Draw car body
        ctx.fillStyle = getRandomColor(car.lane + car.distance);
        ctx.fillRect(car.x, car.y - CAR_HEIGHT, CAR_WIDTH, CAR_HEIGHT);
        
        // Draw windows
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(car.x + 5, car.y - CAR_HEIGHT + 10, CAR_WIDTH - 10, 15);
        
        // Draw lights
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(car.x + 5, car.y - 5, 5, 5);
        ctx.fillRect(car.x + CAR_WIDTH - 10, car.y - 5, 5, 5);
    }
}

// Draw player car
function drawPlayerCar() {
    // Draw car body
    ctx.fillStyle = '#000000';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(player.x + 5, player.y + 5, player.width - 10, 15);
    
    // Draw headlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 5, player.y, 5, 5);
    ctx.fillRect(player.x + player.width - 10, player.y, 5, 5);
}

// Draw menu background
function drawMenuBackground() {
    const menuCtx = canvas.getContext('2d');
    
    // Draw animated road
    menuCtx.fillStyle = '#222222';
    menuCtx.fillRect(ROAD_OFFSET, 0, ROAD_WIDTH, CANVAS_HEIGHT);
    
    // Draw lane markers
    menuCtx.strokeStyle = '#ffff00';
    menuCtx.setLineDash([20, 20]);
    
    for (let i = 1; i < LANE_COUNT; i++) {
        const x = ROAD_OFFSET + i * LANE_WIDTH;
        
        menuCtx.beginPath();
        menuCtx.moveTo(x, 0);
        menuCtx.lineTo(x, CANVAS_HEIGHT);
        menuCtx.stroke();
    }
    
    // Draw road boundaries
    menuCtx.strokeStyle = '#ffffff';
    menuCtx.lineWidth = 3;
    menuCtx.setLineDash([]);
    
    menuCtx.beginPath();
    menuCtx.moveTo(ROAD_OFFSET, 0);
    menuCtx.lineTo(ROAD_OFFSET, CANVAS_HEIGHT);
    menuCtx.stroke();
    
    menuCtx.beginPath();
    menuCtx.moveTo(ROAD_OFFSET + ROAD_WIDTH, 0);
    menuCtx.lineTo(ROAD_OFFSET + ROAD_WIDTH, CANVAS_HEIGHT);
    menuCtx.stroke();
    
    // Draw some decorative cars
    drawDecorativeCar(menuCtx, ROAD_OFFSET + LANE_WIDTH * 0.5, CANVAS_HEIGHT * 0.7, '#ff0000');
    drawDecorativeCar(menuCtx, ROAD_OFFSET + LANE_WIDTH * 2.5, CANVAS_HEIGHT * 0.3, '#00ff00');
    drawDecorativeCar(menuCtx, ROAD_OFFSET + LANE_WIDTH * 1.5, CANVAS_HEIGHT * 0.5, '#0000ff');
    
    // Draw title
    menuCtx.fillStyle = '#0ff';
    menuCtx.font = 'bold 40px Arial';
    menuCtx.textAlign = 'center';
    menuCtx.textBaseline = 'middle';
    menuCtx.fillText('ENDLESS DOSTH', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.2);
    menuCtx.fillText('ROAD SURVIVAL', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3);
}

// Draw decorative car for menu
function drawDecorativeCar(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - CAR_WIDTH / 2, y - CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
    
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x - CAR_WIDTH / 2 + 5, y - CAR_HEIGHT / 2 + 5, CAR_WIDTH - 10, 15);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - CAR_WIDTH / 2 + 5, y - CAR_HEIGHT / 2, 5, 5);
    ctx.fillRect(x + CAR_WIDTH / 2 - 10, y - CAR_HEIGHT / 2, 5, 5);
}

// Get deterministic random color based on seed
function getRandomColor(seed) {
    const colors = [
        '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
        '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
    ];
    
    const index = Math.abs(Math.floor(seed * 123456)) % colors.length;
    return colors[index];
}

// Input handling
function handleKeyDown(e) {
    if (!gameRunning) return;
    
    switch (e.key) {
        case 'ArrowUp':
            // Accelerate
            player.targetSpeed = Math.min(player.speed + MAX_ACCELERATION, currentSpeedLimit);
            break;
        case 'ArrowDown':
            // Decelerate
            player.targetSpeed = Math.max(player.speed - DECELERATION, 0);
            break;
        case 'ArrowLeft':
            // Change lane left
            if (player.lane > 0) player.lane--;
            break;
        case 'ArrowRight':
            // Change lane right
            if (player.lane < LANE_COUNT - 1) player.lane++;
            break;
        case ' ':
            // Toggle pause
            gamePaused = !gamePaused;
            break;
    }
}

function handleKeyUp(e) {
    // Add key release handling if needed
}
