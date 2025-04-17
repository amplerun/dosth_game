// Game constants
const GAME_WIDTH = 600;
const GAME_HEIGHT = 700;
const LANE_WIDTH = 100;
const ROAD_SPEED = 5;
const NUM_LANES = 4;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 80;

// Game variables
let canvas, ctx;
let score = 0;
let animationId;
let gameRunning = false;
let gamePaused = false;

// Player variables
let player = {
    x: GAME_WIDTH / 2 - CAR_WIDTH / 2,
    y: GAME_HEIGHT - 150,
    lane: 2, // 0-indexed, middle lane
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    speed: 0,
    maxSpeed: 100,
    acceleration: 0.5,
    deceleration: 1,
    color: '#000000'
};

// Game objects
let trafficCars = [];
let speedZones = [];
let junctions = [];
let roadSegments = [];

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('resumeBtn').addEventListener('click', togglePause);
    
    // Initialize road
    initRoad();
    
    // Start game
    resetGame();
    gameLoop();
    gameRunning = true;
}

// Road initialization
function initRoad() {
    // Create initial road segments
    for (let i = 0; i < 10; i++) {
        createRoadSegment(-i * 200);
    }
}

// Create road segment (stretch of road with potential hazards)
function createRoadSegment(yPos) {
    const segment = {
        y: yPos,
        height: 200,
        speedZone: Math.random() < 0.3 ? createSpeedZone(yPos) : null,
        hasJunction: Math.random() < 0.2
    };
    
    if (segment.hasJunction) {
        segment.junction = createJunction(yPos + 100);
    }
    
    // Add traffic cars with some probability
    if (Math.random() < 0.4) {
        createTrafficCar(yPos + Math.random() * 150, Math.floor(Math.random() * NUM_LANES));
    }
    
    roadSegments.push(segment);
}

function createSpeedZone(yPos) {
    return {
        y: yPos,
        height: 200,
        speedLimit: 30 + Math.floor(Math.random() * 70), // 30-100 km/h
        color: getSpeedZoneColor(this.speedLimit)
    };
}

function getSpeedZoneColor(speedLimit) {
    if (speedLimit <= 30) return '#ff0000'; // Red for slow
    if (speedLimit <= 60) return '#ffff00'; // Yellow for medium
    return '#00ff00'; // Green for fast
}

function createJunction(yPos) {
    return {
        y: yPos,
        width: GAME_WIDTH,
        height: 100,
        priorityLanes: [Math.floor(Math.random() * NUM_LANES)], // Lane with priority
        waitTime: 3000, // ms before non-priority lanes can go
        active: true
    };
}

function createTrafficCar(yPos, lane) {
    const car = {
        x: lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2,
        y: yPos,
        lane: lane,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        speed: 2 + Math.random() * 3, // Random speed between 2-5
        color: getRandomCarColor()
    };
    trafficCars.push(car);
}

function getRandomCarColor() {
    const colors = ['#ff0000', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Game loop
function gameLoop() {
    if (!gamePaused) {
        update();
    }
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    // Update player
    updatePlayer();
    
    // Update road segments
    updateRoad();
    
    // Update traffic cars
    updateTrafficCars();
    
    // Check collisions
    checkCollisions();
    
    // Update score
    score += 0.1; // Approximately 1 point per second at 60fps
    document.getElementById('scoreValue').textContent = Math.floor(score);
    document.getElementById('speedValue').textContent = Math.floor(player.speed);
}

function updatePlayer() {
    // Apply speed limits from speed zones
    const currentSpeedZone = getCurrentSpeedZone();
    if (currentSpeedZone) {
        player.maxSpeed = currentSpeedZone.speedLimit;
    } else {
        player.maxSpeed = 100;
    }
    
    // Check if at junction and needs to stop
    const currentJunction = getCurrentJunction();
    if (currentJunction && !hasJunctionPriority(currentJunction)) {
        player.maxSpeed = 0;
    }
    
    // Clamp speed
    if (player.speed > player.maxSpeed) {
        player.speed = Math.max(player.speed - player.deceleration * 2, player.maxSpeed);
    }
    
    // Update player lane position
    const targetX = player.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    if (player.x < targetX) {
        player.x += 5;
        if (player.x > targetX) player.x = targetX;
    } else if (player.x > targetX) {
        player.x -= 5;
        if (player.x < targetX) player.x = targetX;
    }
}

function getCurrentSpeedZone() {
    for (const segment of roadSegments) {
        if (segment.speedZone && 
            player.y < segment.y + segment.height && 
            player.y + player.height > segment.y) {
            return segment.speedZone;
        }
    }
    return null;
}

function getCurrentJunction() {
    for (const segment of roadSegments) {
        if (segment.hasJunction && 
            player.y < segment.junction.y + segment.junction.height && 
            player.y + player.height > segment.junction.y) {
            return segment.junction;
        }
    }
    return null;
}

function hasJunctionPriority(junction) {
    return junction.priorityLanes.includes(player.lane);
}

function updateRoad() {
    // Move road segments down
    for (let i = roadSegments.length - 1; i >= 0; i--) {
        roadSegments[i].y += ROAD_SPEED + player.speed / 20;
        
        // Update junction position if exists
        if (roadSegments[i].hasJunction) {
            roadSegments[i].junction.y = roadSegments[i].y + 100;
        }
        
        // Remove segments that are off-screen
        if (roadSegments[i].y > GAME_HEIGHT) {
            roadSegments.splice(i, 1);
            
            // Create new segment at the top
            createRoadSegment(-200);
        }
    }
}

function updateTrafficCars() {
    // Move traffic cars
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        
        // Move car down at difference between player and car speed
        car.y += ROAD_SPEED + player.speed / 20 - car.speed;
        
        // Remove cars that are off-screen
        if (car.y > GAME_HEIGHT) {
            trafficCars.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Check collision with traffic cars
    for (const car of trafficCars) {
        if (isColliding(player, car)) {
            // Game over on collision
            gameOver();
            return;
        }
        
        // Check if player is following too closely
        if (player.lane === car.lane && 
            car.y > player.y && 
            car.y - (player.y + player.height) < 5) {
            // Slow down player
            player.speed = Math.max(0, player.speed - player.deceleration * 2);
        }
    }
}

function isColliding(objA, objB) {
    return objA.x < objB.x + objB.width &&
           objA.x + objA.width > objB.x &&
           objA.y < objB.y + objB.height &&
           objA.y + objA.height > objB.y;
}

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw road background
    drawRoad();
    
    // Draw road segments (speed zones, junctions)
    drawRoadSegments();
    
    // Draw traffic cars
    drawTrafficCars();
    
    // Draw player car
    drawCar(player);
}

function drawRoad() {
    // Draw road background
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw lane markings
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([20, 20]); // Dashed line
    
    for (let i = 1; i < NUM_LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, GAME_HEIGHT);
        ctx.stroke();
    }
    
    // Reset line dash
    ctx.setLineDash([]);
}

function drawRoadSegments() {
    // Draw speed zones
    for (const segment of roadSegments) {
        if (segment.speedZone) {
            // Draw speed zone background
            ctx.fillStyle = getSpeedZoneColor(segment.speedZone.speedLimit);
            ctx.globalAlpha = 0.2;
            ctx.fillRect(0, segment.y, GAME_WIDTH, segment.height);
            ctx.globalAlpha = 1.0;
            
            // Draw speed limit text
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${segment.speedZone.speedLimit} km/h`, GAME_WIDTH / 2, segment.y + 40);
        }
        
        // Draw junctions
        if (segment.hasJunction) {
            const junction = segment.junction;
            
            // Draw junction background
            ctx.fillStyle = '#555555';
            ctx.fillRect(0, junction.y, GAME_WIDTH, junction.height);
            
            // Draw junction crossing lines
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            
            // Horizontal lines
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, junction.y + i * (junction.height / 3));
                ctx.lineTo(GAME_WIDTH, junction.y + i * (junction.height / 3));
                ctx.stroke();
            }
            
            // Priority lane indicators
            for (const lane of junction.priorityLanes) {
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(
                    lane * LANE_WIDTH, 
                    junction.y, 
                    LANE_WIDTH, 
                    10
                );
            }
        }
    }
}

function drawTrafficCars() {
    for (const car of trafficCars) {
        drawCar(car);
    }
}

function drawCar(car) {
    // Draw car body
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.width, car.height);
    
    // Draw car details (windows, etc.)
    ctx.fillStyle = '#87CEEB'; // Windshield color
    ctx.fillRect(car.x + 5, car.y + 10, car.width - 10, 15);
    ctx.fillRect(car.x + 5, car.y + car.height - 25, car.width - 10, 15);
    
    // Draw headlights/taillights
    if (car === player) {
        // Taillights (red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(car.x + 5, car.y + car.height - 5, 8, 5);
        ctx.fillRect(car.x + car.width - 13, car.y + car.height - 5, 8, 5);
        
        // Headlights (white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(car.x + 5, car.y, 8, 5);
        ctx.fillRect(car.x + car.width - 13, car.y, 8, 5);
    } else {
        // Headlights for traffic cars (always visible as white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(car.x + 5, car.y, 8, 5);
        ctx.fillRect(car.x + car.width - 13, car.y, 8, 5);
    }
}

// Input handling
function handleKeyDown(e) {
    if (!gameRunning || gamePaused) {
        if (e.code === 'Space') {
            togglePause();
        }
        return;
    }
    
    switch(e.code) {
        case 'ArrowUp':
            player.speed = Math.min(player.maxSpeed, player.speed + player.acceleration);
            break;
        case 'ArrowDown':
            player.speed = Math.max(0, player.speed - player.deceleration);
            break;
        case 'ArrowLeft':
            if (player.lane > 0) {
                player.lane--;
            }
            break;
        case 'ArrowRight':
            if (player.lane < NUM_LANES - 1) {
                player.lane++;
            }
            break;
        case 'Space':
            togglePause();
            break;
    }
}

function handleKeyUp(e) {
    // Optional: Add key up handling if needed
}

// Game state management
function resetGame() {
    score = 0;
    player.speed = 0;
    player.lane = 2;
    player.x = player.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    
    // Clear all arrays
    trafficCars = [];
    roadSegments = [];
    
    // Initialize road
    initRoad();
    
    // Hide overlays
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    
    gameRunning = true;
    gamePaused = false;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('gameOver').style.display = 'block';
}

function togglePause() {
    gamePaused = !gamePaused;
    document.getElementById('pauseMenu').style.display = gamePaused ? 'block' : 'none';
}

function restartGame() {
    resetGame();
}

// Start the game when the window loads
window.onload = init;
