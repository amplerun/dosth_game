// game.js  
const canvas = document.getElementById('gameCanvas');  
const ctx = canvas.getContext('2d');  
let score = 0;  
let gameSpeed = 3; // Increases over time  

class PlayerCar {  
  constructor() {  
    this.x = 100;  
    this.y = 300;  
    this.speed = 50; // Default: 50 km/h  
    this.image = loadImage('assets/car.png');  
  }  
  update() {  
    // Auto-scroll road (illusion of movement)  
    this.x += this.speed / 10;  
  }  
}  

class Obstacle {  
  constructor(type) {  
    this.type = type; // 'speed_zone', 'vehicle', 'junction'  
    this.width = 50;  
    this.x = canvas.width;  
    this.y = 300;  
  }  
  draw() {  
    // Render hazard based on type (e.g., red zone, car sprite, stop sign)  
  }  
}  

// Core DOSTH Logic  
function enforceSpeedLimit() {  
  if (player.speed > currentZoneLimit) {  
    endGame(); // Crash for overspeeding  
  }  
}  

function maintainSafeDistance() {  
  obstacles.forEach(obs => {  
    if (obs.type === 'vehicle' && distance(player, obs) < 50) {  
      score -= 10; // Penalty for tailgating  
    }  
  });  
}  

function handleJunction() {  
  if (activeJunction && player.speed > 0) {  
    endGame(); // Crash for ignoring stop  
  }  
}  

// Game Loop  
function update() {  
  player.update();  
  spawnObstacles();  
  enforceSpeedLimit();  
  maintainSafeDistance();  
  handleJunction();  
  score++;  
  requestAnimationFrame(update);  
}  

// Event Listeners  
document.addEventListener('keydown', (e) => {  
  if (e.key === 'ArrowUp') player.speed = Math.min(player.speed + 10, 100);  
  if (e.key === 'ArrowDown') player.speed = Math.max(player.speed - 10, 0);  
});  
