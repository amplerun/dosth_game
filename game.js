const ZONES = {
  RED: { speed: 30, color: 'red' },
  YELLOW: { speed: 50, color: 'yellow' },
  GREEN: { speed: 70, color: 'green' }
};

const lanes = [0, 1, 2, 3];
const laneWidth = window.innerWidth / 4;

let currentZone = ZONES.GREEN;
let playerLane = 1;
let playerY = window.innerHeight - 100;
let paused = false;
let score = 0;
let npcs = [];

const player = document.getElementById('player');
const overlay = document.getElementById('overlay');
const zoneName = document.getElementById('zone-name');
const speedText = document.getElementById('speed');
const scoreText = document.getElementById('score');

function updateZone(zone) {
  currentZone = zone;
  overlay.style.backgroundColor = zone.color;
  zoneName.textContent = Object.keys(ZONES).find(k => ZONES[k] === zone);
  speedText.textContent = zone.speed;
}

function placePlayer() {
  player.style.left = `${laneWidth * playerLane + laneWidth / 2 - 20}px`;
  player.style.top = `${playerY}px`;
}

function spawnNPCs() {
  const npcLaneSet = new Set();
  while (npcLaneSet.size < 3) {
    npcLaneSet.add(Math.floor(Math.random() * lanes.length));
  }

  npcLaneSet.forEach(lane => {
    const npc = document.createElement('div');
    npc.className = 'npc';
    npc.style.left = `${lane * laneWidth + laneWidth / 2 - 20}px`;
    npc.style.top = `-60px`;
    document.getElementById('game').appendChild(npc);
    npcs.push({ element: npc, lane, y: -60 });
  });
}

function moveNPCs() {
  npcs.forEach(npc => {
    npc.y += 3;
    npc.element.style.top = `${npc.y}px`;
  });

  // Clean up off-screen
  npcs = npcs.filter(npc => npc.y < window.innerHeight);
}

function gameLoop() {
  if (paused) return;

  // Update visuals
  placePlayer();
  moveNPCs();

  // Auto zone change every few seconds (demo purposes)
  const t = Date.now() / 1000;
  if (Math.floor(t) % 10 === 0) {
    const zones = Object.values(ZONES);
    updateZone(zones[Math.floor(Math.random() * zones.length)]);
  }

  // Score
  score += 1;
  scoreText.textContent = score;

  // Occasionally spawn NPCs
  if (Math.random() < 0.05) spawnNPCs();

  requestAnimationFrame(gameLoop);
}

function handleInput(e) {
  if (e.key === ' ') {
    paused = !paused;
    return;
  }

  if (paused) return;

  if (e.key === 'ArrowLeft') {
    playerLane = Math.max(0, playerLane - 1);
    score += 20;
  } else if (e.key === 'ArrowRight') {
    playerLane = Math.min(3, playerLane + 1);
    score += 20;
  }
}

window.addEventListener('keydown', handleInput);
updateZone(ZONES.GREEN);
placePlayer();
gameLoop();
