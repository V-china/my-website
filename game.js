const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const bestScoreElement = document.getElementById('best-score');
const finalScoreElement = document.getElementById('final-score');
const bestScoreText = document.getElementById('best-score-text');

let gameState = 'start';
let score = 0;
let bestScore = parseInt(localStorage.getItem('donkeyFishingBestScore')) || 0;
let timeLeft = 60;
let mouseX = 400;
let mouseY = 100;
let hook = null;
let fishes = [];
let particles = [];
let gameTimer = null;

const fishTypes = [
  { emoji: '🐟', points: 5, speed: 2, size: 30, weight: 30 },
  { emoji: '🐠', points: 10, speed: 2.5, size: 35, weight: 25 },
  { emoji: '🐡', points: 15, speed: 1.8, size: 40, weight: 20 },
  { emoji: '🦈', points: 25, speed: 3, size: 50, weight: 10 },
  { emoji: '🐙', points: 20, speed: 1.5, size: 45, weight: 15 },
  { emoji: '🗑️', points: -10, speed: 1.2, size: 35, weight: 20 },
  { emoji: '💣', points: -20, speed: 1.5, size: 30, weight: 10 }
];

class Hook {
  constructor() {
    this.x = mouseX;
    this.y = 80;
    this.targetY = 80;
    this.speed = 8;
    this.state = 'idle';
    this.caughtFish = null;
    this.ropeLength = 0;
  }

  update() {
    this.x = mouseX;

    if (this.state === 'dropping') {
      this.y += this.speed;
      this.ropeLength = this.y - 80;
      
      if (this.y >= canvas.height - 20) {
        this.state = 'retracting';
      }

      fishes.forEach((fish, index) => {
        if (this.checkCollision(fish) && !this.caughtFish) {
          this.caughtFish = fish;
          this.state = 'retracting';
          fishes.splice(index, 1);
        }
      });
    } else if (this.state === 'retracting') {
      this.y -= this.speed;
      this.ropeLength = this.y - 80;

      if (this.y <= 80) {
        this.y = 80;
        this.state = 'idle';
        this.ropeLength = 0;

        if (this.caughtFish) {
          updateScore(this.caughtFish.points);
          createParticles(this.x, this.y, this.caughtFish.points > 0);
          this.caughtFish = null;
        }
      }
    }
  }

  checkCollision(fish) {
    const dx = this.x - fish.x;
    const dy = this.y - fish.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (fish.size / 2 + 15);
  }

  draw() {
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, 80);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    if (this.caughtFish) {
      ctx.font = `${this.caughtFish.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.caughtFish.emoji, this.x, this.y + 25);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.x - 12, this.y);
      ctx.lineTo(this.x - 8, this.y - 5);
      ctx.lineTo(this.x - 8, this.y + 5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(this.x + 12, this.y);
      ctx.lineTo(this.x + 8, this.y - 5);
      ctx.lineTo(this.x + 8, this.y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  drop() {
    if (this.state === 'idle') {
      this.state = 'dropping';
    }
  }
}

class Fish {
  constructor() {
    const type = this.getRandomFishType();
    this.emoji = type.emoji;
    this.points = type.points;
    this.size = type.size;
    this.x = Math.random() < 0.5 ? -50 : canvas.width + 50;
    this.y = 150 + Math.random() * (canvas.height - 200);
    this.speedX = (this.x < 0 ? 1 : -1) * type.speed;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.rotation = 0;
  }

  getRandomFishType() {
    const totalWeight = fishTypes.reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const type of fishTypes) {
      random -= type.weight;
      if (random <= 0) {
        return type;
      }
    }
    return fishTypes[0];
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.y < 150) this.speedY = Math.abs(this.speedY);
    if (this.y > canvas.height - 50) this.speedY = -Math.abs(this.speedY);

    this.rotation += 0.02;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.speedX > 0) {
      ctx.scale(-1, 1);
    }
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  isOffScreen() {
    return (this.speedX > 0 && this.x > canvas.width + 100) ||
           (this.speedX < 0 && this.x < -100);
  }
}

class Particle {
  constructor(x, y, isPositive) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -Math.random() * 3 - 2;
    this.life = 1;
    this.color = isPositive ? '#4CAF50' : '#F44336';
    this.size = Math.random() * 4 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= 0.02;
  }

  draw() {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  isDead() {
    return this.life <= 0;
  }
}

function createParticles(x, y, isPositive) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, isPositive));
  }
}

function drawDonkey() {
  const donkeyX = mouseX;
  const donkeyY = 50;

  ctx.font = '60px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐴', donkeyX, donkeyY);

  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(donkeyX + 20, donkeyY);
  ctx.lineTo(donkeyX + 40, donkeyY - 10);
  ctx.stroke();
}

function drawWater() {
  const gradient = ctx.createLinearGradient(0, 120, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.5, '#4682B4');
  gradient.addColorStop(1, '#1E3A5F');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 120, canvas.width, canvas.height - 120);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = 120 + i * 30 + Math.sin(Date.now() / 500 + i) * 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.lineTo(x, y + Math.sin(x / 30 + Date.now() / 500) * 3);
    }
    ctx.stroke();
  }
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, 120);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(1, '#B0E0E6');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, 120);

  ctx.font = '30px Arial';
  for (let i = 0; i < 3; i++) {
    const x = 100 + i * 250 + Math.sin(Date.now() / 2000 + i) * 20;
    const y = 30 + Math.sin(Date.now() / 1500 + i * 2) * 10;
    ctx.fillText('☁️', x, y);
  }
}

function updateScore(points) {
  score += points;
  if (score < 0) score = 0;
  scoreElement.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = bestScore;
    localStorage.setItem('donkeyFishingBestScore', bestScore);
  }
}

function spawnFish() {
  if (gameState === 'playing' && fishes.length < 8) {
    fishes.push(new Fish());
  }
}

function updateTimer() {
  if (gameState === 'playing') {
    timeLeft--;
    timerElement.textContent = timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }
}

function startGame() {
  gameState = 'playing';
  score = 0;
  timeLeft = 60;
  fishes = [];
  particles = [];
  hook = new Hook();
  
  scoreElement.textContent = score;
  timerElement.textContent = timeLeft;
  bestScoreElement.textContent = bestScore;
  
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  gameTimer = setInterval(updateTimer, 1000);
  setInterval(spawnFish, 2000);
}

function endGame() {
  gameState = 'gameover';
  clearInterval(gameTimer);
  
  finalScoreElement.textContent = score;
  
  if (score >= bestScore) {
    bestScoreText.textContent = '🎉 新纪录！恭喜你！';
    bestScoreText.style.color = '#4CAF50';
  } else {
    bestScoreText.textContent = `最高分: ${bestScore}`;
    bestScoreText.style.color = '#666';
  }
  
  gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();
  drawWater();

  if (gameState === 'playing') {
    fishes.forEach((fish, index) => {
      fish.update();
      fish.draw();
      if (fish.isOffScreen()) {
        fishes.splice(index, 1);
      }
    });

    particles.forEach((particle, index) => {
      particle.update();
      particle.draw();
      if (particle.isDead()) {
        particles.splice(index, 1);
      }
    });

    if (hook) {
      hook.update();
      hook.draw();
    }

    drawDonkey();
  }

  requestAnimationFrame(gameLoop);
}

function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousemove', (e) => {
  const coords = getCanvasCoords(e.clientX, e.clientY);
  mouseX = coords.x;
  mouseY = coords.y;
});

canvas.addEventListener('click', () => {
  if (gameState === 'playing' && hook) {
    hook.drop();
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const coords = getCanvasCoords(touch.clientX, touch.clientY);
  mouseX = coords.x;
  mouseY = coords.y;
  if (gameState === 'playing' && hook) {
    hook.drop();
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const coords = getCanvasCoords(touch.clientX, touch.clientY);
  mouseX = coords.x;
  mouseY = coords.y;
}, { passive: false });

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

bestScoreElement.textContent = bestScore;
gameLoop();
