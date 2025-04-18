// DOSTH Road Survival - Main Game File
// A simulation demonstrating smart road safety automation

// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const LANE_WIDTH = 100;
const CAR_LENGTH = 50;
const CAR_WIDTH = 40;
const ZONE_SPEEDS = {
  RED: 30,
  YELLOW: 50,
  GREEN: 70
};
const SAFE_DISTANCE = 5; // meters

// Game state
let gameState = {
  playerCar: {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 100,
    lane: 2, // 0-3 for 4 lanes
    speed: 50,
    targetSpeed: 50,
    points: 0
  },
  npcCars: [], // Will store NPC car objects
  currentZone: "YELLOW", // Default starting zone
  isPaused: false,
  junctionApproaching: false,
  junctionStatus: "RED", // RED = wait, GREEN = go
  timeSinceStart: 0
};

// Initialize canvas and context
let canvas, ctx;

function initGame() {
  canvas = document.getElementById('gameCanvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  ctx = canvas.getContext('2d');
  
  // Set up event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  // Start simulation
  spawnInitialNPCs();
  startGameLoop();
}

function startGameLoop() {
  setInterval(gameLoop, 1000 / 60); // 60 FPS
}

function gameLoop() {
  if (gameState.isPaused) return;
  
  gameState.timeSinceStart += 1/60; // Add time in seconds
  
  // Update game state
  updatePlayerCar();
  updateNPCCars();
  checkZoneChanges();
  handleJunctions();
  updateScore();
  
  // Render everything
  render();
}

function updatePlayerCar() {
  // DOSTH auto-adjusts speed to match zone
  let maxZoneSpeed = ZONE_SPEEDS[gameState.currentZone];
  
  // Gradually adjust to target speed (auto-braking simulation)
  if (gameState.playerCar.speed > gameState.playerCar.targetSpeed) {
    gameState.playerCar.speed = Math.max(
      gameState.playerCar.speed - 1, 
      gameState.playerCar.targetSpeed
    );
  } else if (gameState.playerCar.speed < gameState.playerCar.targetSpeed) {
    gameState.playerCar.speed = Math.min(
      gameState.playerCar.speed + 0.5, 
      gameState.playerCar.targetSpeed
    );
  }
  
  // Enforce zone speed limit (DOSTH auto-intervention)
  if (gameState.playerCar.speed > maxZoneSpeed) {
    gameState.playerCar.speed = maxZoneSpeed;
    gameState.playerCar.targetSpeed = maxZoneSpeed;
  }
  
  // Smart following - check for cars ahead and adjust speed
  const carAhead = findCarAhead();
  if (carAhead && distanceTo(carAhead) < SAFE_DISTANCE * 10) {
    // Smoothly adjust speed to maintain safe distance
    gameState.playerCar.targetSpeed = Math.min(
      gameState.playerCar.speed,
      carAhead.speed * 0.9 // Slightly slower than car ahead
    );
  } else if (!gameState.junctionApproaching || gameState.junctionStatus === "GREEN") {
    // If no obstacles ahead, try to reach zone speed
    gameState.playerCar.targetSpeed = maxZoneSpeed;
  }
  
  // At junction with red signal, come to a stop
  if (gameState.junctionApproaching && gameState.junctionStatus === "RED") {
    gameState.playerCar.targetSpeed = 0;
  }
  
  // Update position based on speed
  gameState.playerCar.y -= gameState.playerCar.speed / 20; // Simulate forward motion
  
  // Reset position if reached top (loop the road)
  if (gameState.playerCar.y < 0) {
    gameState.playerCar.y = CANVAS_HEIGHT;
  }
}

function findCarAhead() {
  // Find the closest NPC car in the same lane ahead of player
  let closestCar = null;
  let minDistance = Infinity;
  
  for (const car of gameState.npcCars) {
    if (car.lane === gameState.playerCar.lane && car.y < gameState.playerCar.y) {
      const distance = gameState.playerCar.y - car.y;
      if (distance < minDistance) {
        minDistance = distance;
        closestCar = car;
      }
    }
  }
  
  return closestCar;
}

function distanceTo(car) {
  // Calculate distance in meters
  return Math.abs(gameState.playerCar.y - car.y) / 10;
}

function updateNPCCars() {
  // Move NPC cars based on their speeds
  gameState.npcCars.forEach(car => {
    car.y += car.speed / 20;
    
    // Remove cars that go off-screen
    if (car.y > CANVAS_HEIGHT + 100) {
      removeNPC(car);
      spawnNewNPC();
    }
  });
  
  // Ensure we always have enough NPCs
  while (gameState.npcCars.length < 8) {
    spawnNewNPC();
  }
}

function spawnInitialNPCs() {
  // Create initial NPC cars
  for (let i = 0; i < 8; i++) {
    spawnNewNPC();
  }
}

function spawnNewNPC() {
  // Ensure at least one lane is always free
  let availableLanes = [0, 1, 2, 3];
  let freeLaneIndex = Math.floor(Math.random() * 4); // Random lane to keep free
  availableLanes.splice(freeLaneIndex, 1);
  
  // Choose a random lane from the available ones
  let lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
  
  // Randomize position and speed
  let newCar = {
    x: lane * LANE_WIDTH + LANE_WIDTH/2,
    y: -CAR_LENGTH - Math.random() * 500, // Start above the screen
    lane: lane,
    speed: ZONE_SPEEDS.YELLOW * (0.7 + Math.random() * 0.3), // Vary speeds
    color: getRandomColor()
  };
  
  gameState.npcCars.push(newCar);
}

function removeNPC(car) {
  const index = gameState.npcCars.indexOf(car);
  if (index > -1) {
    gameState.npcCars.splice(index, 1);
  }
}

function getRandomColor() {
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function checkZoneChanges() {
  // Simulate entering different speed zones based on time or position
  const zoneChangeInterval = 5; // seconds
  const zoneIndex = Math.floor(gameState.timeSinceStart / zoneChangeInterval) % 3;
  
  const zones = ["RED", "YELLOW", "GREEN"];
  const newZone = zones[zoneIndex];
  
  if (newZone !== gameState.currentZone) {
    gameState.currentZone = newZone;
    // Auto-adjust target speed for new zone
    gameState.playerCar.targetSpeed = ZONE_SPEEDS[newZone];
  }
}

function handleJunctions() {
  // Periodically create junction scenarios
  const junctionInterval = 10; // seconds
  const junctionDuration = 3; // seconds
  
  const currentCycle = Math.floor(gameState.timeSinceStart / junctionInterval);
  const timeInCycle = gameState.timeSinceStart % junctionInterval;
  
  // Determine if we're approaching a junction
  gameState.junctionApproaching = timeInCycle > (junctionInterval - junctionDuration);
  
  if (gameState.junctionApproaching) {
    // Alternate junction signals based on cycles
    gameState.junctionStatus = currentCycle % 2 === 0 ? "RED" : "GREEN";
  }
}

function updateScore() {
  // Base points for staying active
  gameState.playerCar.points += 1/60; // 1 point per second
  
  // Bonus for maintaining optimal speed
  if (Math.abs(gameState.playerCar.speed - ZONE_SPEEDS[gameState.currentZone]) < 5) {
    gameState.playerCar.points += 5/60; // 5 points per second
  }
  
  // Junction handling and lane change bonuses are added in their respective functions
}

function handleKeyPress(e) {
  // Handle user input
  if (gameState.isPaused && e.key !== ' ') return;
  
  switch (e.key) {
    case 'ArrowUp':
      // User tries to accelerate (but DOSTH will limit if needed)
      gameState.playerCar.targetSpeed = Math.min(
        gameState.playerCar.targetSpeed + 5,
        ZONE_SPEEDS[gameState.currentZone]
      );
      break;
    case 'ArrowDown':
      // User decelerates
      gameState.playerCar.targetSpeed = Math.max(0, gameState.playerCar.targetSpeed - 5);
      break;
    case 'ArrowLeft':
      // Change lane left if possible
      if (gameState.playerCar.lane > 0) {
        gameState.playerCar.lane -= 1;
        checkForAnticipationBonus();
      }
      break;
    case 'ArrowRight':
      // Change lane right if possible
      if (gameState.playerCar.lane < 3) {
        gameState.playerCar.lane += 1;
        checkForAnticipationBonus();
      }
      break;
    case ' ':
      // Toggle pause
      gameState.isPaused = !gameState.isPaused;
      break;
  }
}

function checkForAnticipationBonus() {
  // Check if lane change was strategic (anticipating slowdown)
  const carInFormerLane = gameState.npcCars.find(car => 
    car.lane === gameState.playerCar.lane && 
    Math.abs(car.y - gameState.playerCar.y) < 200
  );
  
  if (carInFormerLane) {
    // Award anticipation bonus
    gameState.playerCar.points += 20;
    showBonus("+20 Anticipation");
  }
}

function showBonus(text) {
  // Display bonus notification (implementation depends on UI framework)
  console.log(text);
  // In a real implementation, this would create a visual popup
}

function render() {
  // Clear canvas
  ctx.fillStyle = '#101020';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw road lanes
  drawRoad();
  
  // Draw zone indicators
  drawZoneIndicator();
  
  // Draw junction if approaching
  if (gameState.junctionApproaching) {
    drawJunction();
  }
  
  // Draw NPC cars
  gameState.npcCars.forEach(drawNPCCar);
  
  // Draw player car
  drawPlayerCar();
  
  // Draw HUD (speed, score, etc.)
  drawHUD();
}

function drawRoad() {
  // Draw road background
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw lane markings
  ctx.strokeStyle = '#FFF';
  ctx.setLineDash([20, 20]); // Dashed lines
  
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * LANE_WIDTH, 0);
    ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();
  }
  
  // Reset line style
  ctx.setLineDash([]);
}

function drawZoneIndicator() {
  // Draw glowing border based on current zone
  let zoneColor;
  switch (gameState.currentZone) {
    case "RED":
      zoneColor = '#FF3333';
      break;
    case "YELLOW":
      zoneColor = '#FFCC33';
      break;
    case "GREEN":
      zoneColor = '#33FF33';
      break;
  }
  
  // Draw glow effect
  ctx.strokeStyle = zoneColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);
  
  // Draw zone text
  ctx.fillStyle = zoneColor;
  ctx.font = '24px Arial';
  ctx.fillText(`${gameState.currentZone} ZONE: ${ZONE_SPEEDS[gameState.currentZone]} km/h`, 20, 40);
}

function drawJunction() {
  // Draw junction area
  ctx.fillStyle = 'rgba(50, 50, 70, 0.5)';
  ctx.fillRect(0, 100, CANVAS_WIDTH, 100);
  
  // Draw junction signal
  const signalColor = gameState.junctionStatus === "GREEN" ? '#33FF33' : '#FF3333';
  
  // Draw arrow
  ctx.fillStyle = signalColor;
  ctx.beginPath();
  if (gameState.junctionStatus === "GREEN") {
    // Up arrow
    ctx.moveTo(CANVAS_WIDTH - 50, 140);
    ctx.lineTo(CANVAS_WIDTH - 30, 120);
    ctx.lineTo(CANVAS_WIDTH - 10, 140);
  } else {
    // Stop hand
    ctx.arc(CANVAS_WIDTH - 30, 130, 15, 0, 2 * Math.PI);
  }
  ctx.fill();
}

function drawPlayerCar() {
  // Calculate x position based on lane
  const targetX = gameState.playerCar.lane * LANE_WIDTH + LANE_WIDTH/2;
  
  // Smoothly move to target lane
  gameState.playerCar.x += (targetX - gameState.playerCar.x) * 0.1;
  
  // Draw car body
  ctx.fillStyle = '#000';
  ctx.fillRect(
    gameState.playerCar.x - CAR_WIDTH/2, 
    gameState.playerCar.y - CAR_LENGTH/2,
    CAR_WIDTH, 
    CAR_LENGTH
  );
  
  // Draw glow effect
  ctx.strokeStyle = '#33CCFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    gameState.playerCar.x - CAR_WIDTH/2, 
    gameState.playerCar.y - CAR_LENGTH/2,
    CAR_WIDTH, 
    CAR_LENGTH
  );
}

function drawNPCCar(car) {
  // Draw NPC car
  ctx.fillStyle = car.color;
  ctx.fillRect(
    car.x - CAR_WIDTH/2, 
    car.y - CAR_LENGTH/2,
    CAR_WIDTH, 
    CAR_LENGTH
  );
}

function drawHUD() {
  // Draw speed indicator
  ctx.fillStyle = '#FFF';
  ctx.font = '18px Arial';
  ctx.fillText(`Speed: ${Math.round(gameState.playerCar.speed)} km/h`, 20, CANVAS_HEIGHT - 60);
  
  // Draw score
  ctx.fillText(`Safety Score: ${Math.floor(gameState.playerCar.points)}`, 20, CANVAS_HEIGHT - 30);
  
  // Draw DOSTH status
  let statusText = "DOSTH: ";
  if (gameState.playerCar.speed < gameState.playerCar.targetSpeed) {
    statusText += "Accelerating";
  } else if (gameState.playerCar.speed > gameState.playerCar.targetSpeed) {
    statusText += "Auto-braking";
  } else {
    statusText += "Maintaining";
  }
  
  ctx.fillText(statusText, CANVAS_WIDTH - 200, CANVAS_HEIGHT - 30);
}

// Initialize when page loads
window.onload = initGame;
