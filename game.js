// File: app.js
const { useState, useEffect, useRef } = React;

// Game constants
const LANE_WIDTH = 100;
const LANE_COUNT = 4;
const ROAD_WIDTH = LANE_WIDTH * LANE_COUNT;
const ZONE_TYPES = {
  RED: { name: 'RED', color: 'var(--red-zone)', speedLimit: 30 },
  YELLOW: { name: 'YELLOW', color: 'var(--yellow-zone)', speedLimit: 50 },
  GREEN: { name: 'GREEN', color: 'var(--green-zone)', speedLimit: 70 }
};

// NPC Car colors
const NPC_COLORS = ['red', 'blue', 'purple', 'green'];

// Main Game Component
const Game = () => {
  // Game state
  const [score, setScore] = useState(0);
  const [activeTime, setActiveTime] = useState(0);
  const [optimalSpeedTime, setOptimalSpeedTime] = useState(0);
  const [smartLaneChanges, setSmartLaneChanges] = useState(0);

  // Player state
  const [playerLane, setPlayerLane] = useState(1);
  const [playerSpeed, setPlayerSpeed] = useState(0);
  const [targetSpeed, setTargetSpeed] = useState(0);
  
  // Environment state
  const [currentZone, setCurrentZone] = useState(ZONE_TYPES.GREEN);
  const [zoneChangeTime, setZoneChangeTime] = useState(0);
  const [npcCars, setNpcCars] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [message, setMessage] = useState({ visible: false, title: '', text: '' });
  
  // Refs for animation frame and timers
  const animationFrameRef = useRef(null);
  const gameTimeRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  
  // Initialize the game
  useEffect(() => {
    // Show welcome message
    showMessage(
      'Welcome to DOSTH Road Survival',
      'Experience the future of automated road safety. Your vehicle will automatically adjust to speed zones, maintain safe distances, and navigate junctions safely. Use arrow keys to change lanes strategically.'
    );
    
    // Start game loop
    lastUpdateTimeRef.current = performance.now();
    startGameLoop();
    
    // Initial NPC cars setup
    generateInitialNPCCars();
    
    // Set up keyboard listeners
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);
  
  // Game loop function
  const startGameLoop = () => {
    const gameLoop = (timestamp) => {
      if (!isPaused) {
        const deltaTime = (timestamp - lastUpdateTimeRef.current) / 1000;
        lastUpdateTimeRef.current = timestamp;
        
        // Update game time
        gameTimeRef.current += deltaTime;
        
        // Update game state
        updateGameState(deltaTime);
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };
  
  // Update game state based on time passed
  const updateGameState = (deltaTime) => {
    // Update active time score
    setActiveTime(prev => prev + deltaTime);
    setScore(prevScore => prevScore + deltaTime);
    
    // Check if speed is optimal
    if (Math.abs(playerSpeed - currentZone.speedLimit) < 5) {
      setOptimalSpeedTime(prev => prev + deltaTime);
      setScore(prevScore => prevScore + (5 * deltaTime));
    }
    
    // Smooth speed adjustment towards target speed
    setPlayerSpeed(speed => {
      const diff = targetSpeed - speed;
      return Math.abs(diff) < 0.5 ? targetSpeed : speed + (diff * deltaTime * 2);
    });
    
    // Periodically change zones
    if (gameTimeRef.current - zoneChangeTime > 15) {
      changeZone();
      setZoneChangeTime(gameTimeRef.current);
    }
    
    // Update NPC cars
    updateNPCCars(deltaTime);
    
    // Generate new junction periodically
    if (Math.random() < 0.002 && junctions.length < 1) {
      generateJunction();
    }
    
    // Update junctions
    updateJunctions(deltaTime);
  };
  
  // Change the current speed zone
  const changeZone = () => {
    const zoneTypes = Object.values(ZONE_TYPES);
    let newZone;
    
    do {
      newZone = zoneTypes[Math.floor(Math.random() * zoneTypes.length)];
    } while (newZone.name === currentZone.name);
    
    setCurrentZone(newZone);
    setTargetSpeed(newZone.speedLimit);
    
    showMessage(
      `Entering ${newZone.name} Zone`,
      `Speed limit is now ${newZone.speedLimit} km/h. DOSTH system is automatically adjusting your speed.`
    );
  };
  
  // Generate initial NPC cars
  const generateInitialNPCCars = () => {
    // Generate 5 initial NPC cars
    const initialCars = [];
    const usedLanes = new Set();
    
    // Ensure player's lane is free
    usedLanes.add(playerLane);
    
    // Generate random cars in available lanes
    for (let i = 0; i < 5; i++) {
      let lane;
      do {
        lane = Math.floor(Math.random() * LANE_COUNT);
      } while (usedLanes.has(lane));
      
      usedLanes.add(lane);
      
      initialCars.push({
        id: `npc-${Date.now()}-${i}`,
        lane,
        position: -300 - (i * 400),
        speed: 30 + Math.random() * 40,
        color: NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)]
      });
    }
    
    setNpcCars(initialCars);
  };
  
  // Update NPC cars positions
  const updateNPCCars = (deltaTime) => {
    setNpcCars(prevCars => {
      // Update existing cars
      let updatedCars = prevCars.map(car => ({
        ...car,
        position: car.position + (car.speed * deltaTime)
      })).filter(car => car.position < window.innerHeight + 200);
      
      // Generate new cars occasionally
      if (Math.random() < 0.02 && updatedCars.length < 8) {
        // Find available lanes (excluding player's lane)
        const occupiedLanes = new Set(updatedCars.map(car => car.lane));
        occupiedLanes.add(playerLane);
        
        const availableLanes = [];
        for (let i = 0; i < LANE_COUNT; i++) {
          if (!occupiedLanes.has(i)) {
            availableLanes.push(i);
          }
        }
        
        // Generate new car if there's an available lane
        if (availableLanes.length > 0) {
          const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
          updatedCars.push({
            id: `npc-${Date.now()}`,
            lane: newLane,
            position: -200,
            speed: 30 + Math.random() * 40,
            color: NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)]
          });
        }
      }
      
      return updatedCars;
    });
  };
  
  // Generate a new junction
  const generateJunction = () => {
    const newJunction = {
      id: `junction-${Date.now()}`,
      position: -300,
      canPass: Math.random() > 0.5
    };
    
    setJunctions(prev => [...prev, newJunction]);
    
    // Prepare to change junction state after a delay
    setTimeout(() => {
      setJunctions(prev => 
        prev.map(j => j.id === newJunction.id ? { ...j, canPass: !j.canPass } : j)
      );
    }, 3000);
  };
  
  // Update junctions positions
  const updateJunctions = (deltaTime) => {
    setJunctions(prev => 
      prev.map(junction => ({
        ...junction,
        position: junction.position + (playerSpeed * deltaTime)
      })).filter(junction => junction.position < window.innerHeight + 100)
    );
  };
  
  // Handle keyboard input
  const handleKeyDown = (event) => {
    if (event.key === ' ') {
      // Toggle pause
      setIsPaused(prev => !prev);
      return;
    }
    
    if (isPaused) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        changeLane(-1);
        break;
      case 'ArrowRight':
        changeLane(1);
        break;
      default:
        break;
    }
  };
  
  // Change lane with smart detection
  const changeLane = (direction) => {
    const newLane = Math.max(0, Math.min(LANE_COUNT - 1, playerLane + direction));
    
    if (newLane !== playerLane) {
      // Check if this is a smart lane change (anticipating NPC car ahead)
      const carAhead = npcCars.find(car => 
        car.lane === playerLane && 
        car.position > 0 && 
        car.position < 500
      );
      
      if (carAhead) {
        setSmartLaneChanges(prev => prev + 1);
        setScore(prev => prev + 20);
        showMessage(
          'Smart Lane Change!',
          'You anticipated traffic ahead. DOSTH rewards strategic driving decisions.'
        );
      }
      
      setPlayerLane(newLane);
    }
  };
  
  // Display a temporary message
  const showMessage = (title, text) => {
    setMessage({ visible: true, title, text });
    setTimeout(() => {
      setMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  };
  
  // Calculate player position on screen
  const playerXPosition = ((playerLane + 0.5) * LANE_WIDTH) - (ROAD_WIDTH / 2) + (window.innerWidth / 2);
  
  // Render game
  return (
    <div className="game-container">
      <div 
        className="zone-background" 
        style={{ backgroundColor: currentZone.color }}
      >
        <div className="road">
          <div className="grid"></div>
          
          {/* Draw lane markers */}
          {Array.from({ length: LANE_COUNT + 1 }).map((_, index) => {
            const xPos = ((index * LANE_WIDTH) - (ROAD_WIDTH / 2) + (window.innerWidth / 2));
            return (
              <div 
                key={`lane-${index}`} 
                className="lane" 
                style={{ left: `${xPos}px` }}
              ></div>
            );
          })}
          
          {/* Draw junctions */}
          {junctions.map(junction => (
            <div 
              key={junction.id}
              className="junction"
              style={{ top: `${junction.position}px` }}
            >
              <div className={`junction-signal ${junction.canPass ? 'go' : 'stop'}`}>
                {junction.canPass ? '↑' : '✋'}
              </div>
            </div>
          ))}
          
          {/* Draw NPC cars */}
          {npcCars.map(car => {
            const xPos = ((car.lane + 0.5) * LANE_WIDTH) - (ROAD_WIDTH / 2) + (window.innerWidth / 2) - 30;
            return (
              <div 
                key={car.id}
                className={`car npc-car ${car.color}`}
                style={{ 
                  left: `${xPos}px`,
                  top: `${car.position}px`
                }}
              >
                <div className="car-headlight left"></div>
                <div className="car-headlight right"></div>
                <div className="car-window"></div>
                <div className="car-taillight left"></div>
                <div className="car-taillight right"></div>
              </div>
            );
          })}
          
          {/* Draw player car */}
          <div 
            className="car player-car"
            style={{ 
              left: `${playerXPosition - 30}px`,
              bottom: '150px'
            }}
          >
            <div className="car-headlight left"></div>
            <div className="car-headlight right"></div>
            <div className="car-window"></div>
            <div className="car-taillight left"></div>
            <div className="car-taillight right"></div>
          </div>
        </div>
      </div>
      
      {/* Score display */}
      <div className="score-container">
        <div className="score-title">DOSTH Performance</div>
        <div className="score-item">
          <span>Total Score:</span>
          <span className="score-value">{Math.floor(score)}</span>
        </div>
        <div className="score-item">
          <span>Active Time:</span>
          <span className="score-value">{Math.floor(activeTime)}s</span>
        </div>
        <div className="score-item">
          <span>Optimal Speed Time:</span>
          <span className="score-value">{Math.floor(optimalSpeedTime)}s</span>
        </div>
        <div className="score-item">
          <span>Smart Lane Changes:</span>
          <span className="score-value">{smartLaneChanges}</span>
        </div>
      </div>
      
      {/* Info display */}
      <div className="info-container">
        <div className="info-title">DOSTH Road Survival</div>
        <div className="info-text">
          Experience how smart automation technology prevents accidents and enhances road safety.
        </div>
        <div className={`zone-indicator ${currentZone.name.toLowerCase()}`}>
          Current Zone: {currentZone.name} ({currentZone.speedLimit} km/h)
        </div>
      </div>
      
      {/* Speed indicator */}
      <div className="speed-indicator">
        <div className="speed-value">{Math.round(playerSpeed)} km/h</div>
        <div className="speed-max">DOSTH Max: {currentZone.speedLimit} km/h</div>
      </div>
      
      {/* Controls info */}
      <div className="controls-info">
        ← → Arrow Keys: Change lanes | Space: Pause/Resume
      </div>
      
      {/* Message overlay */}
      <div className={`message-overlay ${message.visible ? 'visible' : ''}`}>
        <div className="message-title">{message.title}</div>
        <div className="message-text">{message.text}</div>
      </div>
      
      {/* Pause overlay */}
      <div className={`pause-overlay ${isPaused ? 'visible' : ''}`}>
        <div className="pause-text">PAUSED</div>
      </div>
      
      {/* Footer */}
      <div className="footer">
        DOSTH Road Survival - Demonstrating the future of automated road safety
      </div>
    </div>
  );
};

// Render the game
ReactDOM.render(<Game />, document.getElementById('root'));
