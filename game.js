// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Canvas setup
canvas.width = 400;
canvas.height = 600;

// Game constants
const LANE_COUNT = 4;
const LANE_WIDTH = canvas.width / LANE_COUNT;
const CAR_WIDTH = 30;
const CAR_HEIGHT = 50;
const ROAD_SPEED = 2;
const MAX_SPEED = 70; // 70 km/h as max speed
const ACCELERATION = 0.2;
const DECELERATION = 0.3;
const NPC_SPAWN_RATE = 2000; // ms between spawns
const SPEED_ZONE_SPAWN_RATE = 5000; // ms between speed zone spawns
const JUNCTION_SPAWN_RATE = 15000; // ms between junction spawns

// Game state
let gameState = {
    playing: true,
    paused: false,
    score: 0,
    bonusPoints: 0,
    timeElapsed: 0
};

// Player car
let playerCar = {
    x: LANE_WIDTH * 1.5 - CAR_WIDTH / 2, // Center of second lane
    y: canvas.height - CAR_HEIGHT - 20,
    lane: 1,
    speed: 20, // Starting speed in km/h
    changingLane: false,
    targetLane: 1
};

// Game objects
let npcCars = [];
let speedZones = [];
let junctions = [];
let roadOffset = 0;

// Controls
const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    space: false
};

// Event listeners
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
restartButton.addEventListener('click', restartGame);

function handleKeyDown(e) {
    switch(e.key) {
        case 'ArrowUp':
            keys.up = true;
            if (!playerCar.changingLane && playerCar.lane > 0) {
                playerCar.changingLane = true;
                playerCar.targetLane = playerCar.lane - 1;
            }
            break;
        case 'ArrowDown':
            keys.down = true;
            if (!playerCar.changingLane && playerCar.lane < LANE_COUNT - 1) {
                playerCar.changingLane = true;
                playerCar.targetLane = playerCar.lane + 1;
            }
            break;
        case 'ArrowLeft':
            keys.left = true; // Decelerate
            break;
        case 'ArrowRight':
            keys.right = true; // Accelerate
            break;
        case ' ':
            keys.space = true;
            togglePause();
            break;
    }
}

function handleKeyUp(e) {
    switch(e.key) {
        case 'ArrowUp':
            keys.up = false;
            break;
        case 'ArrowDown':
            keys.down = false;
            break;
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowRight':
            keys.right = false;
            break;
        case ' ':
            keys.space = false;
            break;
    }
}

function togglePause() {
    gameState.paused = !gameState.paused;
}

// Game initialization
function init() {
    // Reset game objects
    npcCars = [];
    speedZones = [];
    junctions = [];
    
    // Reset player
    playerCar = {
        x: LANE_WIDTH * 1.5 - CAR_WIDTH / 2,
        y: canvas.height - CAR_HEIGHT - 20,
        lane: 1,
        speed: 20,
        changingLane: false,
        targetLane: 1
    };
    
    // Reset game state
    gameState = {
        playing: true,
        paused: false,
        score: 0,
        bonusPoints: 0,
        timeElapsed: 0
    };
    
    // Hide game over screen
    gameOverScreen.classList.add('hidden');
    
    // Set up spawning intervals
    setInterval(spawnNPC, NPC_SPAWN_RATE);
    setInterval(spawnSpeedZone, SPEED_ZONE_SPAWN_RATE);
    setInterval(spawnJunction, JUNCTION_SPAWN_RATE);
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Game loop
function gameLoop(timestamp) {
    if (!gameState.playing) return;
    
    if (!gameState.paused) {
        update();
        checkCollisions();
        updateScore();
    }
    
    render();
    
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Update road position
    roadOffset = (roadOffset + ROAD_SPEED) % (LANE_WIDTH / 2);
    
    // Handle lane changing
    if (playerCar.changingLane) {
        const targetX = playerCar.targetLane * LANE_WIDTH + (LANE_WIDTH / 2) - (CAR_WIDTH / 2);
        const difference = targetX - playerCar.x;
        
        if (Math.abs(difference) < 2) {
            playerCar.x = targetX;
            playerCar.lane = playerCar.targetLane;
            playerCar.changingLane = false;
        } else {
            playerCar.x += difference * 0.1;
        }
    }
    
    // Handle acceleration/deceleration
    if (keys.right && playerCar.speed < MAX_SPEED) {
        playerCar.speed += ACCELERATION;
    }
    
    if (keys.left && playerCar.speed > 0) {
        playerCar.speed -= DECELERATION;
        if (playerCar.speed < 0) playerCar.speed = 0;
    }
    
    // Cap player speed to MAX_SPEED
    playerCar.speed = Math.min(playerCar.speed, MAX_SPEED);
    
    // Update NPCs
    for (let i = npcCars.length - 1; i >= 0; i--) {
        const npc = npcCars[i];
        npc.y += (npc.speed / 10) - (playerCar.speed / 10);
        
        // Remove NPCs that are off screen
        if (npc.y > canvas.height) {
            npcCars.splice(i, 1);
        }
    }
    
    // Update speed zones
    for (let i = speedZones.length - 1; i >= 0; i--) {
        const zone = speedZones[i];
        zone.y += ROAD_SPEED;
        
        // Check if player is in speed zone
        if (zone.y <= playerCar.y + CAR_HEIGHT && 
            zone.y + zone.height >= playerCar.y) {
            
            // Check if player is speeding
            if (playerCar.speed > zone.speedLimit) {
                gameOver("You were speeding in a speed zone!");
                return;
            }
        }
        
        // Remove zones that are off screen
        if (zone.y > canvas.height) {
            speedZones.splice(i, 1);
        }
    }
    
    // Update junctions
    for (let i = junctions.length - 1; i >= 0; i--) {
        const junction = junctions[i];
        junction.y += ROAD_SPEED;
        
        // Check if player is at junction stop line
        if (Math.abs(junction.y - playerCar.y) < 5) {
            // Player must come to a full stop at junction
            if (!junction.playerStopped && playerCar.speed > 0) {
                gameOver("You didn't stop at the junction!");
                return;
            } else if (playerCar.speed === 0) {
                junction.playerStopped = true;
                
                // Grant priority after stopping
                setTimeout(() => {
                    junction.playerHasPriority = true;
                }, 1000);
            }
        }
        
        // Check if player is crossing junction without priority
        if (junction.y <= playerCar.y + CAR_HEIGHT && 
            junction.y + junction.height >= playerCar.y && 
            !junction.playerHasPriority && playerCar.speed > 0) {
            gameOver("You crossed a junction without priority!");
            return;
        }
        
        // Remove junctions that are off screen
        if (junction.y > canvas.height) {
            junctions.splice(i, 1);
        }
    }
    
    // Check for close NPC cars in the same lane
    for (const npc of npcCars) {
        if (npc.lane === playerCar.lane) {
            const distance = Math.abs(npc.y - playerCar.y);
            
            // If too close, force slow down
            if (distance < 60 && npc.y < playerCar.y) {
                playerCar.speed = Math.max(playerCar.speed - 1, npc.speed - 10);
                
                // If extremely close, game over
                if (distance < 10) {
                    gameOver("You rear-ended another car!");
                    return;
                }
            }
            
            // Bonus points opportunity
            if (distance < 100 && distance > 50 && !npc.bonusGiven) {
                // Player can get bonus by changing lanes before getting too close
                npc.bonusOpportunity = true;
            }
            
            // Award bonus if player changes lanes proactively
            if (npc.bonusOpportunity && playerCar.lane !== npc.lane && !npc.bonusGiven) {
                gameState.bonusPoints += 10;
                npc.bonusGiven = true;
            }
        }
    }
}

// Check collisions
function checkCollisions() {
    // Check collision with NPC cars
    for (const npc of npcCars) {
        if (npc.lane === playerCar.lane && 
            Math.abs(npc.y - playerCar.y) < (CAR_HEIGHT * 0.8)) {
            gameOver("You collided with another car!");
            return;
        }
    }
}

// Update score
function updateScore() {
    gameState.timeElapsed++;
    if (gameState.timeElapsed % 60 === 0) { // Roughly once per second
        gameState.score++;
    }
    
    scoreDisplay.textContent = `Score: ${gameState.score + gameState.bonusPoints}`;
}

// Spawning functions
function spawnNPC() {
    if (!gameState.playing || gameState.paused) return;
    
    // Determine which lane to spawn in
    // Ensure there's always at least one free lane
    const busyLanes = new Set(npcCars.map(car => car.lane));
    
    // If already 3+ lanes with cars, don't spawn more
    if (busyLanes.size >= LANE_COUNT - 1) return;
    
    // Find available lanes
    const availableLanes = [];
    for (let i = 0; i < LANE_COUNT; i++) {
        // Check if lane is free or if there's no NPC close to the top of the screen in this lane
        const laneIsClear = !npcCars.some(car => car.lane === i && car.y < 100);
        if (laneIsClear) {
            availableLanes.push(i);
        }
    }
    
    if (availableLanes.length === 0) return;
    
    // Randomly select lane from available lanes
    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    npcCars.push({
        x: lane * LANE_WIDTH + (LANE_WIDTH / 2) - (CAR_WIDTH / 2),
        y: -CAR_HEIGHT,
        lane: lane,
        speed: 10 + Math.random() * 40, // Random speed between 10 and 50
        color: `hsl(${Math.random() * 360}, 100%, 60%)`,
        bonusOpportunity: false,
        bonusGiven: false
    });
}

function spawnSpeedZone() {
    if (!gameState.playing || gameState.paused) return;
    
    const speedLimit = 20 + Math.floor(Math.random() * 3) * 10; // 20, 30, or 40 km/h
    
    speedZones.push({
        y: -100,
        height: 100,
        speedLimit: speedLimit,
        color: speedLimit <= 30 ? '#ff0000' : '#ffaa00'
    });
}

function spawnJunction() {
    if (!gameState.playing || gameState.paused) return;
    
    junctions.push({
        y: -200,
        height: 200,
        playerStopped: false,
        playerHasPriority: false
    });
}

// Rendering
function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw road
    drawRoad();
    
    // Draw speed zones
    for (const zone of speedZones) {
        ctx.fillStyle = zone.color + '33'; // Semi-transparent
        ctx.fillRect(0, zone.y, canvas.width, zone.height);
        
        // Draw speed limit sign
        ctx.fillStyle = zone.color;
        ctx.fillRect(canvas.width - 40, zone.y + 10, 30, 30);
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(zone.speedLimit, canvas.width - 25, zone.y + 30);
    }
    
    // Draw junctions
    for (const junction of junctions) {
        // Draw junction background
        ctx.fillStyle = '#333';
        ctx.fillRect(0, junction.y, canvas.width, junction.height);
        
        // Draw crossing lines
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(0, junction.y + i * 20, canvas.width, 10);
        }
        
        // Draw stop line a bit before junction
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, junction.y - 5, canvas.width, 5);
        
        // Draw traffic light
        const lightColor = junction.playerHasPriority ? '#00ff00' : '#ff0000';
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width - 30, junction.y - 50, 20, 60);
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.arc(canvas.width - 20, junction.y - 20, 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw NPC cars
    for (const npc of npcCars) {
        ctx.fillStyle = npc.color;
        ctx.fillRect(npc.x, npc.y, CAR_WIDTH, CAR_HEIGHT);
    }
    
    // Draw player car
    ctx.fillStyle = '#000';
    ctx.fillRect(playerCar.x, playerCar.y, CAR_WIDTH, CAR_HEIGHT);
    
    // Draw car details
    ctx.fillStyle = '#0ff';
    // Headlights
    ctx.fillRect(playerCar.x + 5, playerCar.y, 5, 3);
    ctx.fillRect(playerCar.x + 20, playerCar.y, 5, 3);
    // Taillights
    ctx.fillStyle = '#f00';
    ctx.fillRect(playerCar.x + 5, playerCar.y + CAR_HEIGHT - 3, 5, 3);
    ctx.fillRect(playerCar.x + 20, playerCar.y + CAR_HEIGHT - 3, 5, 3);
    
    // Draw HUD
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Speed: ${Math.round(playerCar.speed)} km/h`, 10, 20);
}

function drawRoad() {
    // Draw road lanes
    for (let i = 1; i < LANE_COUNT; i++) {
        const x = i * LANE_WIDTH;
        
        // Dashed lane lines
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let y = -roadOffset; y < canvas.height; y += 20) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 10);
        }
        
        ctx.stroke();
    }
    
    // Draw side guardrails
    ctx.fillStyle = '#0ff';
    ctx.fillRect(0, 0, 5, canvas.height);
    ctx.fillRect(canvas.width - 5, 0, 5, canvas.height);
}

function gameOver(reason) {
    gameState.playing = false;
    finalScoreDisplay.textContent = `Final Score: ${gameState.score + gameState.bonusPoints}`;
    gameOverScreen.classList.remove('hidden');
    
    // Add reason for game over
    const reasonElement = document.createElement('p');
    reasonElement.textContent = reason;
    gameOverScreen.insertBefore(reasonElement, restartButton);
}

function restartGame() {
    // Remove any added reason element
    const reasonElement = gameOverScreen.querySelector('p:not(#finalScore)');
    if (reasonElement) {
        gameOverScreen.removeChild(reasonElement);
    }
    
    init();
}

// Start the game
init();
