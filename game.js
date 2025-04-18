// --------- Game Constants ---------
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;
const ROAD_WIDTH = 240;
const LANE_WIDTH = ROAD_WIDTH / 4;
const LANE_POSITIONS = [
    CANVAS_WIDTH / 2 - ROAD_WIDTH / 2 + LANE_WIDTH / 2,
    CANVAS_WIDTH / 2 - ROAD_WIDTH / 2 + LANE_WIDTH * 1.5,
    CANVAS_WIDTH / 2 - ROAD_WIDTH / 2 + LANE_WIDTH * 2.5,
    CANVAS_WIDTH / 2 - ROAD_WIDTH / 2 + LANE_WIDTH * 3.5
];
const SPEED_ZONE_TYPES = {
    NORMAL: { color: '#fff', limit: 70 },
    SLOW: { color: '#f39c12', limit: 50 },
    VERY_SLOW: { color: '#e74c3c', limit: 30 }
};
const MAX_SPEED = 70;
const MIN_SPEED = 0;
const ACCELERATION_RATE = 0.5;
const DECELERATION_RATE = 0.3;
const TRAFFIC_FOLLOWING_DISTANCE = 60; // Minimum distance to car ahead
const JUNCTION_APPROACH_DISTANCE = 100; // Distance to start slowing for junction
const BONUS_POINTS_DISTANCE = 80; // Distance to earn bonus points by changing lanes
const GAME_TICK = 1000 / 60; // 60 FPS

// --------- Game Variables ---------
let canvas, ctx;
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameOver'
let lastTime = 0;
let deltaTime = 0;
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let scoreTimer = 0;
let lives = 3;
let soundEnabled = true;
let roadOffset = 0;
let roadSpeed = 3;
let lastLaneChangeTime = 0;
let bonusPointsEarned = false;

// --------- Game Objects ---------
const playerCar = {
    x: LANE_POSITIONS[1],
    y: CANVAS_HEIGHT - 100,
    width: 30,
    height: 50,
    lane: 1,
    targetLane: 1,
    speed: 0,
    targetSpeed: 0,
    acceleration: 0,
    isChangingLanes: false,
    laneChangeSpeed: 5,
    color: '#2ecc71'
};

// Arrays to store game elements
let npcCars = [];
let speedZones = [];
let junctions = [];

// --------- Event Listeners ---------
window.addEventListener('load', init);

function init() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    
    // Setup buttons
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('pauseButton').addEventListener('click', togglePause);
    document.getElementById('resumeButton').addEventListener('click', resumeGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('restartGameButton').addEventListener('click', restartGame);
    document.getElementById('homeButton').addEventListener('click', goToHome);
    document.getElementById('soundButton').addEventListener('click', toggleSound);
    document.getElementById('shareButton').addEventListener('click', shareScore);
    
    // Setup keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Load best score from localStorage
    updateBestScore();
    
    // Start animation loop
    requestAnimationFrame(gameLoop);
}

// --------- Game States ---------
function startGame() {
    gameState = 'playing';
    score = 0;
    lives = 3;
    roadOffset = 0;
    lastLaneChangeTime = 0;
    playerCar.lane = 1;
    playerCar.targetLane = 1;
    playerCar.x = LANE_POSITIONS[1];
    playerCar.speed = 0;
    playerCar.targetSpeed = 0;
    playerCar.isChangingLanes = false;
    
    // Reset game arrays
    npcCars = [];
    speedZones = [];
    junctions = [];
    
    // Initial spawns
    spawnSpeedZone();
    spawnJunction();
    
    // Update UI
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    updateScore();
    updateHearts();
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pauseScreen').style.display = 'flex';
    } else if (gameState === 'paused') {
        resumeGame();
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('pauseScreen').style.display = 'none';
    }
}

function restartGame() {
    startGame();
}

function gameOver() {
    gameState = 'gameOver';
    
    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        updateBestScore();
    }
    
    // Update UI
    document.getElementById('finalScore').textContent = score;
    document.getElementById('bestScore').textContent = bestScore;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

function goToHome() {
    gameState = 'start';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    // Would implement actual sound toggling here
}

function shareScore() {
    // Would implement sharing functionality here
    alert('Share your score: ' + score);
}

// --------- Input Handling ---------
function handleKeyDown(e) {
    if (gameState !== 'playing') return;
    
    switch (e.key) {
        case 'ArrowUp':
            if (playerCar.lane > 0 && !playerCar.isChangingLanes) {
                playerCar.targetLane = playerCar.lane - 1;
                playerCar.isChangingLanes = true;
                lastLaneChangeTime = Date.now();
                checkLaneChangeBonus();
            }
            break;
        case 'ArrowDown':
            if (playerCar.lane < 3 && !playerCar.isChangingLanes) {
                playerCar.targetLane = playerCar.lane + 1;
                playerCar.isChangingLanes = true;
                lastLaneChangeTime = Date.now();
                checkLaneChangeBonus();
            }
            break;
        case 'ArrowLeft':
            playerCar.targetSpeed = Math.max(playerCar.targetSpeed - ACCELERATION_RATE * 10, MIN_SPEED);
            break;
        case 'ArrowRight':
            playerCar.targetSpeed = Math.min(playerCar.targetSpeed + ACCELERATION_RATE * 10, MAX_SPEED);
            break;
        case ' ':
            togglePause();
            break;
    }
}

function handleKeyUp(e) {
    if (gameState !== 'playing') return;
    
    switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
            // playerCar.acceleration = 0;
            break;
    }
}

// --------- Game Logic ---------
function gameLoop(timestamp) {
    // Calculate delta time
    if (!lastTime) lastTime = timestamp;
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
        update(deltaTime);
        checkCollisions();
    }
    
    render();
    
    // Loop
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Increment score timer
    scoreTimer += deltaTime;
    if (scoreTimer >= 1000) {
        score++;
        scoreTimer = 0;
        updateScore();
    }
    
    // Update player car
    updatePlayerCar(deltaTime);
    
    // Update road offset for scrolling effect
    roadOffset += roadSpeed * (playerCar.speed / MAX_SPEED);
    if (roadOffset > 40) roadOffset = 0;
    
    // Update NPC cars
    updateNPCCars(deltaTime);
    
    // Update speed zones
    updateSpeedZones(deltaTime);
    
    // Update junctions
    updateJunctions(deltaTime);
    
    // Spawn new elements
    if (Math.random() < 0.01) {
        spawnNPCCar();
    }
    
    if (Math.random() < 0.005) {
        spawnSpeedZone();
    }
    
    if (Math.random() < 0.002) {
        spawnJunction();
    }
}

function updatePlayerCar(deltaTime) {
    // Handle lane changing
    if (playerCar.isChangingLanes) {
        const targetX = LANE_POSITIONS[playerCar.targetLane];
        const dx = targetX - playerCar.x;
        
        if (Math.abs(dx) < playerCar.laneChangeSpeed) {
            playerCar.x = targetX;
            playerCar.lane = playerCar.targetLane;
            playerCar.isChangingLanes = false;
        } else {
            playerCar.x += Math.sign(dx) * playerCar.laneChangeSpeed;
        }
    }
    
    // Handle acceleration/deceleration
    if (playerCar.speed < playerCar.targetSpeed) {
        playerCar.speed = Math.min(playerCar.speed + ACCELERATION_RATE, playerCar.targetSpeed);
    } else if (playerCar.speed > playerCar.targetSpeed) {
        playerCar.speed = Math.max(playerCar.speed - DECELERATION_RATE, playerCar.targetSpeed);
    }
    
    // Check if player is in a speed zone
    checkSpeedZones();
    
    // Check if player is approaching junction
    checkJunctionApproach();
    
    // Check if player is too close to NPC car
    checkTrafficFollowing();
    
    // Update speed display
    document.getElementById('speedValue').textContent = Math.round(playerCar.speed);
}

function updateNPCCars(deltaTime) {
    for (let i = npcCars.length - 1; i >= 0; i--) {
        const car = npcCars[i];
        
        // Move car forward
        car.y += (playerCar.speed - car.speed) * 0.5;
        
        // Remove cars that are off-screen
        if (car.y > CANVAS_HEIGHT + 100) {
            npcCars.splice(i, 1);
        }
    }
}

function updateSpeedZones(deltaTime) {
    for (let i = speedZones.length - 1; i >= 0; i--) {
        const zone = speedZones[i];
        
        // Move zone with road
        zone.y += playerCar.speed * 0.5;
        
        // Remove zones that are off-screen
        if (zone.y > CANVAS_HEIGHT + 200) {
            speedZones.splice(i, 1);
        }
    }
}

function updateJunctions(deltaTime) {
    for (let i = junctions.length - 1; i >= 0; i--) {
        const junction = junctions[i];
        
        // Move junction with road
        junction.y += playerCar.speed * 0.5;
        
        // Update junction state
        if (junction.active && junction.y >= playerCar.y - 50 && junction.y <= playerCar.y + 50) {
            // Check if player has stopped
            if (playerCar.speed === 0) {
                junction.crossed = true;
                junction.waitTimer = 3000; // Wait 3 seconds before allowing crossing
            } else if (!junction.priority && !junction.crossed) {
                // Game over if player doesn't stop at junction without priority
                loseLife('You failed to stop at the junction!');
            }
        }
        
        // Count down wait timer
        if (junction.waitTimer > 0) {
            junction.waitTimer -= deltaTime;
            if (junction.waitTimer <= 0) {
                junction.priority = true;
            }
        }
        
        // Remove junctions that are off-screen
        if (junction.y > CANVAS_HEIGHT + 200) {
            junctions.splice(i, 1);
        }
    }
}

function checkSpeedZones() {
    for (const zone of speedZones) {
        if (zone.y >= playerCar.y - 100 && zone.y <= playerCar.y + 100) {
            // Player is in speed zone
            if (playerCar.speed > zone.limit) {
                loseLife('You exceeded the speed limit in a speed zone!');
            } else {
                // Ensure player stays within speed limit
                playerCar.targetSpeed = Math.min(playerCar.targetSpeed, zone.limit);
            }
        }
    }
}

function checkJunctionApproach() {
    for (const junction of junctions) {
        const distance = junction.y - playerCar.y;
        if (distance > 0 && distance < JUNCTION_APPROACH_DISTANCE) {
            // Player is approaching junction
            if (!junction.priority) {
                // Reduce target speed as player approaches junction
                const factor = 1 - ((JUNCTION_APPROACH_DISTANCE - distance) / JUNCTION_APPROACH_DISTANCE);
                playerCar.targetSpeed = Math.min(playerCar.targetSpeed, MAX_SPEED * factor);
            }
        }
    }
}

function checkTrafficFollowing() {
    for (const car of npcCars) {
        if (car.lane === playerCar.lane) {
            const distance = car.y - playerCar.y;
            if (distance > 0 && distance < TRAFFIC_FOLLOWING_DISTANCE) {
                // Too close to car ahead
                const factor = distance / TRAFFIC_FOLLOWING_DISTANCE;
                playerCar.targetSpeed = Math.min(playerCar.targetSpeed, car.speed * factor);
            }
        }
    }
}

function checkLaneChangeBonus() {
    // Check if lane change was to avoid traffic
    for (const car of npcCars) {
        if (car.lane === playerCar.lane && !bonusPointsEarned) {
            const distance = car.y - playerCar.y;
            if (distance > 0 && distance < BONUS_POINTS_DISTANCE) {
                // Award bonus points for smart lane change
                score += 5;
                bonusPointsEarned = true;
                updateScore();
                // Reset bonus points timer
                setTimeout(() => {
                    bonusPointsEarned = false;
                }, 3000);
            }
        }
    }
}

function checkCollisions() {
    // Check for collisions with NPC cars
    for (const car of npcCars) {
        if (collision(playerCar, car)) {
            loseLife('You crashed into another vehicle!');
        }
    }
}

function collision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    );
}

function loseLife(reason) {
    lives--;
    updateHearts();
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Show reason why life was lost
        showNotification(reason);
        
        // Reset player speed
        playerCar.speed = 0;
        playerCar.targetSpeed = 0;
    }
}

function showNotification(message) {
    // Would implement notification display here
    console.log(message);
}

// --------- Spawning Functions ---------
    function spawnNPCCar() {
    // Determine occupied lanes near the top
    const occupiedLanes = npcCars
        .filter(car => car.y < 150)
        .map(car => car.lane);

    // Choose a random free lane
    const availableLanes = [0, 1, 2, 3].filter(lane => !occupiedLanes.includes(lane));
    if (availableLanes.length === 0) return;

    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

    const car = {
        x: LANE_POSITIONS[lane],
        y: -100,
        width: 30,
        height: 50,
        lane: lane,
        speed: Math.random() * (MAX_SPEED - 30) + 30,
        color: '#3498db'
    };

    npcCars.push(car);
}
