// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Game state
let gameState = {
    score: 0,
    speed: 0,
    lanes: [150, 250, 350, 450],
    currentLane: 1,
    obstacles: [],
    lastSpawn: 0,
    isPaused: false,
    gameOver: false
};

// Constants
const PLAYER_CAR = {
    x: 100,
    width: 40,
    height: 60,
    color: '#000000',
    maxSpeed: 70,
    acceleration: 0.5,
    deceleration: 0.8
};

const NPC_CAR = {
    width: 40,
    height: 60,
    colors: ['#e74c3c', '#3498db', '#9b59b6'],
    speed: 3
};

const SPEED_ZONES = {
    types: [
        {limit: 30, color: '#e74c3c', length: 200},
        {limit: 50, color: '#f1c40f', length: 300},
        {limit: 70, color: '#2ecc71', length: 400}
    ]
};

// Input handling
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function spawnObstacle() {
    const type = Math.random();
    if (type < 0.3) { // Speed zone
        const zone = SPEED_ZONES.types[Math.floor(Math.random() * SPEED_ZONES.types.length)];
        gameState.obstacles.push({
            type: 'speedZone',
            ...zone,
            y: canvas.height,
            active: true
        });
    } else if (type < 0.6) { // NPC Car
        const availableLanes = gameState.lanes.filter((_, i) => i !== gameState.currentLane);
        const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        gameState.obstacles.push({
            type: 'npcCar',
            y: canvas.height,
            lane: gameState.lanes.indexOf(lane),
            color: NPC_CAR.colors[Math.floor(Math.random() * NPC_CAR.colors.length)],
            speed: NPC_CAR.speed
        });
    } else { // Junction
        gameState.obstacles.push({
            type: 'junction',
            y: canvas.height,
            active: false,
            timer: 0,
            priority: Math.random() < 0.5
        });
    }
}

function checkCollisions() {
    // Speed zone compliance
    gameState.obstacles.forEach(obstacle => {
        if (obstacle.type === 'speedZone' && 
            obstacle.y < PLAYER_CAR.x + PLAYER_CAR.height &&
            obstacle.y + obstacle.length > PLAYER_CAR.x) {
            if (gameState.speed > obstacle.limit) {
                gameState.gameOver = true;
            }
        }
    });

    // NPC collisions
    gameState.obstacles.forEach(obstacle => {
        if (obstacle.type === 'npcCar' && 
            obstacle.lane === gameState.currentLane &&
            Math.abs(obstacle.y - PLAYER_CAR.x) < 50) {
            gameState.gameOver = true;
        }
    });

    // Junction compliance
    gameState.obstacles.forEach(obstacle => {
        if (obstacle.type === 'junction' && 
            obstacle.y < PLAYER_CAR.x + PLAYER_CAR.height &&
            obstacle.y + 100 > PLAYER_CAR.x) {
            if (!obstacle.priority && gameState.speed > 0) {
                gameState.gameOver = true;
            }
        }
    });
}

function updateGame() {
    if (gameState.isPaused || gameState.gameOver) return;

    // Player controls
    if (keys['ArrowUp'] && gameState.speed < PLAYER_CAR.maxSpeed) {
        gameState.speed += PLAYER_CAR.acceleration;
    }
    if (keys['ArrowDown'] && gameState.speed > 0) {
        gameState.speed -= PLAYER_CAR.deceleration;
    }
    if (keys['ArrowLeft']) {
        gameState.currentLane = Math.max(0, gameState.currentLane - 1);
    }
    if (keys['ArrowRight']) {
        gameState.currentLane = Math.min(gameState.lanes.length - 1, gameState.currentLane + 1);
    }

    // Spawn obstacles
    if (Date.now() - gameState.lastSpawn > 2000) {
        spawnObstacle();
        gameState.lastSpawn = Date.now();
    }

    // Update obstacles
    gameState.obstacles = gameState.obstacles.filter(obstacle => {
        obstacle.y -= gameState.speed;
        return obstacle.y > -100;
    });

    // Update score
    gameState.score += gameState.speed / 100;
    document.getElementById('score').textContent = Math.floor(gameState.score);
    document.getElementById('speed').textContent = Math.floor(gameState.speed);

    checkCollisions();
}

function draw() {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road
    gameState.lanes.forEach(laneX => {
        ctx.strokeStyle = '#2ecc71';
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(laneX, 0);
        ctx.lineTo(laneX, canvas.height);
        ctx.stroke();
    });

    // Draw player car
    ctx.fillStyle = PLAYER_CAR.color;
    ctx.fillRect(
        gameState.lanes[gameState.currentLane] - PLAYER_CAR.width/2,
        canvas.height - 150,
        PLAYER_CAR.width,
        PLAYER_CAR.height
    );

    // Draw obstacles
    gameState.obstacles.forEach(obstacle => {
        if (obstacle.type === 'speedZone') {
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(0, obstacle.y, canvas.width, obstacle.length);
        } else if (obstacle.type === 'npcCar') {
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(
                gameState.lanes[obstacle.lane] - NPC_CAR.width/2,
                obstacle.y,
                NPC_CAR.width,
                NPC_CAR.height
            );
        } else if (obstacle.type === 'junction') {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(canvas.width/2, obstacle.y, 50, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    if (gameState.gameOver) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = '48px monospace';
        ctx.fillText('GAME OVER', canvas.width/2 - 120, canvas.height/2);
    }
}

function gameLoop() {
    if (!gameState.isPaused) {
        updateGame();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
