// game.js
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('scoreValue');
        this.speedElement = document.getElementById('speedValue');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartButton = document.getElementById('restartButton');
        
        // Set canvas dimensions
        this.canvas.width = 800;
        this.canvas.height = 400;
        
        // Game state
        this.isGameOver = false;
        this.score = 0;
        this.frameCount = 0;
        
        // Player car
        this.car = {
            x: 100,
            y: this.canvas.height / 2,
            width: 32,
            height: 16,
            speed: 0,
            maxSpeed: 120,
            acceleration: 10,
            deceleration: 20
        };
        
        // Road properties
        this.road = {
            y: 200,
            width: this.canvas.width,
            laneWidth: 50,
            stripeWidth: 30,
            stripeGap: 50,
            stripes: []
        };
        
        // Initialize road stripes
        for (let x = 0; x < this.canvas.width; x += this.road.stripeWidth + this.road.stripeGap) {
            this.road.stripes.push({ x });
        }
        
        // Game obstacles
        this.obstacles = [];
        this.lastObstacleTime = 0;
        this.obstacleInterval = 2000; // ms
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.restart = this.restart.bind(this);
        
        // Input handling
        this.keys = {};
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.restartButton.addEventListener('click', this.restart);
        
        // Start game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    handleKeyDown(e) {
        this.keys[e.key] = true;
    }
    
    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
    
    restart() {
        // Reset game state
        this.isGameOver = false;
        this.score = 0;
        this.car.speed = 0;
        this.car.y = this.canvas.height / 2;
        this.obstacles = [];
        this.lastObstacleTime = 0;
        this.gameOverElement.classList.add('hidden');
        
        // Restart game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    generateObstacle() {
        const types = ['speedZone', 'vehicle', 'junction'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let obstacle = {
            x: this.canvas.width,
            y: this.road.y - 20,
            width: 60,
            height: 40,
            type
        };
        
        switch (type) {
            case 'speedZone':
                obstacle.limit = 30 + Math.floor(Math.random() * 70); // 30-100 km/h
                obstacle.color = '#f00';
                obstacle.width = 100 + Math.floor(Math.random() * 200); // Variable length
                break;
            case 'vehicle':
                obstacle.speed = 20 + Math.floor(Math.random() * 40); // 20-60 km/h
                obstacle.color = '#ff0';
                obstacle.width = 40;
                break;
            case 'junction':
                obstacle.priority = Math.random() > 0.5; // Random priority
                obstacle.color = obstacle.priority ? '#0f0' : '#f00';
                obstacle.width = 30;
                break;
        }
        
        this.obstacles.push(obstacle);
    }
    
    update(deltaTime) {
        if (this.isGameOver) return;
        
        // Update score (1 point per second)
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.score++;
            this.scoreElement.textContent = this.score;
        }
        
        // Handle player input
        if (this.keys['ArrowUp']) {
            this.car.speed = Math.min(this.car.speed + this.car.acceleration * deltaTime, this.car.maxSpeed);
        } else if (this.keys['ArrowDown']) {
            this.car.speed = Math.max(this.car.speed - this.car.deceleration * deltaTime, 0);
        } else {
            // Gradual deceleration
            this.car.speed = Math.max(this.car.speed - (this.car.deceleration / 2) * deltaTime, 0);
        }
        
        // Check for speed zones
        for (const obstacle of this.obstacles) {
            if (obstacle.type === 'speedZone' && 
                this.car.x + this.car.width > obstacle.x && 
                this.car.x < obstacle.x + obstacle.width) {
                if (this.car.speed > obstacle.limit) {
                    this.car.speed = obstacle.limit;
                }
            }
        }
        
        // Update speed display
        this.speedElement.textContent = Math.floor(this.car.speed);
        
        // Update road stripes
        const scrollSpeed = this.car.speed / 20;
        for (const stripe of this.road.stripes) {
            stripe.x -= scrollSpeed;
            if (stripe.x + this.road.stripeWidth < 0) {
                stripe.x = this.canvas.width;
            }
        }
        
        // Generate obstacles
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleTime > this.obstacleInterval) {
            this.generateObstacle();
            this.lastObstacleTime = currentTime;
            
            // Reduce interval as score increases (increased difficulty)
            this.obstacleInterval = Math.max(500, 2000 - this.score * 10);
        }
        
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Move obstacle
            obstacle.x -= scrollSpeed;
            
            // Remove obstacles that are off-screen
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (this.car.x + this.car.width > obstacle.x && 
                this.car.x < obstacle.x + obstacle.width && 
                this.car.y + this.car.height > obstacle.y && 
                this.car.y < obstacle.y + obstacle.height) {
                
                let collision = false;
                
                switch (obstacle.type) {
                    case 'vehicle':
                        collision = true;
                        break;
                    case 'junction':
                        if (!obstacle.priority && this.car.speed > 5) {
                            collision = true;
                        }
                        break;
                }
                
                if (collision) {
                    this.gameOver();
                }
            }
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.classList.remove('hidden');
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw road
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, this.road.y, this.canvas.width, 50);
        
        // Draw road stripes
        this.ctx.fillStyle = '#0f0';
        for (const stripe of this.road.stripes) {
            this.ctx.fillRect(stripe.x, this.road.y + 20, this.road.stripeWidth, 5);
        }
        
        // Draw obstacles
        for (const obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Draw obstacle label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px Arial';
            let label = '';
            
            switch (obstacle.type) {
                case 'speedZone':
                    label = `${obstacle.limit} km/h`;
                    break;
                case 'vehicle':
                    label = 'CAR';
                    break;
                case 'junction':
                    label = obstacle.priority ? 'PRIORITY' : 'STOP';
                    break;
            }
            
            this.ctx.fillText(label, obstacle.x + obstacle.width / 2 - 15, obstacle.y + obstacle.height / 2);
        }
        
        // Draw player car
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.car.x, this.car.y, this.car.width, this.car.height);
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Update and draw game
        this.update(deltaTime);
        this.draw();
        
        // Continue game loop
        if (!this.isGameOver) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});
