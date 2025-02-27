const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const BASE_WIDTH = 800, BASE_HEIGHT = 600;
let scaleFactor = 1;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById("scoreboardDisplay").offsetHeight;
  scaleFactor = Math.min(canvas.width / BASE_WIDTH, canvas.height / BASE_HEIGHT);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const scoreboardDisplay = document.getElementById("scoreboardDisplay");
let lastTime = 0, score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let gameState = "menu";
let currentLevel = 1;
let enemyDirection = 1;
let enemySpeed = 20;
let enemyMoveDown = 10;
let enemyFireInterval = 2000;
let enemyShootTimer = enemyFireInterval;
let shooting = false;
let playerBullets = [], enemyBullets = [], enemies = [], powerUps = [], particles = [];

function updateScoreDisplay() {
  scoreboardDisplay.innerText = "Score: " + score + " | High Score: " + highScore;
}
updateScoreDisplay();

const keys = {};
document.addEventListener("keydown", (e) => {
  if (gameState === "playing") { keys[e.key] = true; }
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });
let dragging = false;
canvas.addEventListener("mousedown", function (e) {
  if (gameState === "playing") {
    dragging = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    player.x = x - player.width / 2;
  }
});
canvas.addEventListener("mousemove", function (e) {
  if (dragging && gameState === "playing") {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    player.x = x - player.width / 2;
  }
});
canvas.addEventListener("mouseup", () => { dragging = false; });
canvas.addEventListener("mouseleave", () => { dragging = false; });
canvas.addEventListener("touchstart", function (e) {
  if (gameState === "playing") {
    e.preventDefault();
    dragging = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    player.x = x - player.width / 2;
  }
}, { passive: false });
canvas.addEventListener("touchmove", function (e) {
  if (dragging && gameState === "playing") {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    player.x = x - player.width / 2;
  }
}, { passive: false });
canvas.addEventListener("touchend", function (e) { dragging = false; }, { passive: false });
const shootButton = document.getElementById("shootButton");
shootButton.addEventListener("mousedown", () => { shooting = true; });
shootButton.addEventListener("mouseup", () => { shooting = false; });
shootButton.addEventListener("mouseleave", () => { shooting = false; });
shootButton.addEventListener("touchstart", (e) => {
  e.preventDefault();
  shooting = true;
}, { passive: false });
shootButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  shooting = false;
}, { passive: false });

class Player {
  constructor() {
    this.width = 40 * scaleFactor;
    this.height = 20 * scaleFactor;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - this.height - (50 * scaleFactor);
    this.speed = 300 * scaleFactor;
    this.shootCooldown = 0;
    this.cooldownTime = 0.3;
    this.powerUpLevel = 0;
    this.powerUpTimer = 0;
  }
  update(dt) {
    if (keys["ArrowLeft"] || keys["a"]) { this.x -= this.speed * dt; }
    if (keys["ArrowRight"] || keys["d"]) { this.x += this.speed * dt; }
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.shootCooldown -= dt;
    if ((keys[" "] || keys["Spacebar"] || shooting) && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.cooldownTime;
    }
    if (this.powerUpLevel > 0) {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        this.powerUpLevel = 0;
      }
    }
  }
  shoot() {
    const bulletCount = this.powerUpLevel + 1;
    if (bulletCount === 1) {
      playerBullets.push(new Bullet(
        this.x + this.width / 2,
        this.y,
        -400
      ));
    } else {
      const startX = this.x;
      const endX = this.x + this.width;
      const step = (endX - startX) / (bulletCount - 1);
      for (let i = 0; i < bulletCount; i++) {
        playerBullets.push(new Bullet(
          startX + (i * step),
          this.y,
          -400
        ));
      }
    }
  }
  draw() {
    ctx.fillStyle = "#0f0";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();
  }
}

class Bullet {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.radius = 4 * scaleFactor;
    this.speed = speed;
  }
  update(dt) { this.y += this.speed * dt; }
  draw() {
    ctx.fillStyle = "#ff0";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Enemy {
  constructor(x, y, type = 0, width = 30, height = 20) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
  }
  draw() {
    ctx.fillStyle = this.type === 0 ? "#f00" : "#f80";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.radius = 10 * scaleFactor;
    this.speed = 5 * scaleFactor;
    this.type = type;
  }
  update(dt) { this.y += this.speed * dt; }
  draw() {
    ctx.fillStyle = this.type === "double" ? "#0ff" : "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 200;
    this.vy = (Math.random() - 0.5) * 200;
    this.life = 0.5;
    this.alpha = 1;
  }
  update(dt) {
    this.life -= dt;
    this.alpha = this.life / 0.5;
    this.x += this.vx * dt;
    this.y += this.vy * dt; for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      p.update(dt);
      const distX = p.x - (player.x + player.width / 2);
      const distY = p.y - (player.y + player.height / 2);
      const distance = Math.sqrt(distX * distX + distY * distY);
      if (distance < p.radius + Math.max(player.width, player.height) / 2) {
        if (p.type === "double") {
          player.powerUpLevel += 1;
          player.powerUpTimer = 5;
        }
        powerUps.splice(i, 1);
      }
    }
  }
  draw() {
    ctx.fillStyle = "rgba(255,165,0," + this.alpha + ")";
    ctx.fillRect(this.x, this.y, 3, 3);
  }
}

const player = new Player();

function spawnEnemies(level) {
  enemies = [];
  const enemyCols = 10;
  const enemyRows = Math.min(6, 3 + level);
  const enemyPadding = 20 * scaleFactor;
  const startX = 50 * scaleFactor;
  const startY = 50 * scaleFactor;
  const enemyWidth = 30 * scaleFactor;
  const enemyHeight = 20 * scaleFactor;
  for (let row = 0; row < enemyRows; row++) {
    for (let col = 0; col < enemyCols; col++) {
      const x = startX + col * (enemyWidth + enemyPadding);
      const y = startY + row * (enemyHeight + enemyPadding);
      const type = row % 2 === 0 ? 0 : 1;
      enemies.push(new Enemy(x, y, type, enemyWidth, enemyHeight));
    }
  }
}

function initLevel() {
  playerBullets = [];
  enemyBullets = [];
  powerUps = [];
  particles = [];
  player.width = 40 * scaleFactor;
  player.height = 20 * scaleFactor;
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - (50 * scaleFactor);
  player.speed = 300 * scaleFactor;
  enemySpeed = (20 + (currentLevel - 1) * 10) * scaleFactor;
  enemyMoveDown = 10 * scaleFactor;
  enemyFireInterval = Math.max(500, 2000 - (currentLevel - 1) * 200);
  enemyShootTimer = enemyFireInterval;
  spawnEnemies(currentLevel);
  player.powerUpLevel = 0;
}

function updateLocalScoreboard() {
  let scores = JSON.parse(localStorage.getItem("scoreboardScores") || "[]");
  scores.push(score);
  scores.sort((a, b) => b - a);
  if (scores.length > 10) scores = scores.slice(0, 10);
  localStorage.setItem("scoreboardScores", JSON.stringify(scores));
}

function updateScoreboardOverlay() {
  let scores = JSON.parse(localStorage.getItem("scoreboardScores") || "[]");
  const scoreList = document.getElementById("scoreList");
  if (scores.length === 0) {
    scoreList.innerHTML = "<p>No scores yet.</p>";
  } else {
    let html = "<ol>";
    scores.forEach(s => { html += "<li>" + s + "</li>"; });
    html += "</ol>";
    scoreList.innerHTML = html;
  }
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (gameState === "playing") { update(dt); }
  draw();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  player.update(dt);
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    playerBullets[i].update(dt);
    if (playerBullets[i].y < 0) { playerBullets.splice(i, 1); }
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].update(dt);
    if (enemyBullets[i].y > canvas.height) { enemyBullets.splice(i, 1); }
  }
  const moveX = enemyDirection * enemySpeed * dt;
  let shouldReverse = false;
  enemies.forEach(enemy => {
    enemy.x += moveX;
    if (enemy.x + enemy.width >= canvas.width || enemy.x <= 0) { shouldReverse = true; }
  });
  if (shouldReverse) {
    enemyDirection *= -1;
    enemies.forEach(enemy => enemy.y += enemyMoveDown);
  }
  enemyShootTimer -= dt * 1000;
  if (enemyShootTimer <= 0 && enemies.length > 0) {
    const shooter = enemies[Math.floor(Math.random() * enemies.length)];
    enemyBullets.push(new Bullet(shooter.x + shooter.width / 2, shooter.y + shooter.height, 200));
    enemyShootTimer = enemyFireInterval;
  }
  for (let b = playerBullets.length - 1; b >= 0; b--) {
    const bullet = playerBullets[b];
    for (let e = enemies.length - 1; e >= 0; e--) {
      const enemy = enemies[e];
      if (
        bullet.x > enemy.x &&
        bullet.x < enemy.x + enemy.width &&
        bullet.y > enemy.y &&
        bullet.y < enemy.y + enemy.height
      ) {
        playerBullets.splice(b, 1);
        enemies.splice(e, 1);
        score += 10;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("highScore", highScore);
        }
        updateScoreDisplay();
        for (let i = 0; i < 20; i++) {
          particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
        }
        if (Math.random() < 0.2) {
          powerUps.push(new PowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "double"));
        }
        break;
      }
    }
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    if (
      bullet.x > player.x &&
      bullet.x < player.x + player.width &&
      bullet.y > player.y &&
      bullet.y < player.y + player.height
    ) {
      enemyBullets.splice(i, 1);
      gameState = "gameover";
      showGameOverScreen();
    }
  }
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.update(dt);
    const distX = p.x - (player.x + player.width / 2);
    const distY = p.y - (player.y + player.height / 2);
    const distance = Math.sqrt(distX * distX + distY * distY);
    if (distance < p.radius + Math.max(player.width, player.height) / 2) {
      if (p.type === "double") {
        player.poweredUp = true;
        player.powerUpTimer = 5;
      }
      powerUps.splice(i, 1);
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) { particles.splice(i, 1); }
  }
  enemies.forEach(enemy => {
    if (enemy.y + enemy.height >= player.y) {
      gameState = "gameover";
      showGameOverScreen();
    }
  });
  if (enemies.length === 0) {
    gameState = "levelComplete";
    showLevelCompleteScreen();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  player.draw();
  playerBullets.forEach(bullet => bullet.draw());
  enemyBullets.forEach(bullet => bullet.draw());
  enemies.forEach(enemy => enemy.draw());
  powerUps.forEach(p => p.draw());
  particles.forEach(p => p.draw());
}

function showMenu() {
  document.getElementById("menu").style.display = "flex";
}
function hideMenu() {
  document.getElementById("menu").style.display = "none";
}
function showGameOverScreen() {
  updateLocalScoreboard();
  document.getElementById("gameOverScreen").style.display = "flex";
}
function hideGameOverScreen() {
  document.getElementById("gameOverScreen").style.display = "none";
}
function showLevelCompleteScreen() {
  document.getElementById("levelCompleteScreen").style.display = "flex";
}
function hideLevelCompleteScreen() {
  document.getElementById("levelCompleteScreen").style.display = "none";
}
function showScoreboardOverlay() {
  updateScoreboardOverlay();
  document.getElementById("scoreboardOverlay").style.display = "flex";
}
function hideScoreboardOverlay() {
  document.getElementById("scoreboardOverlay").style.display = "none";
}

document.getElementById("startButton").addEventListener("click", () => {
  hideMenu();
  currentLevel = 1;
  score = 0;
  updateScoreDisplay();
  initLevel();
  gameState = "playing";
});
document.getElementById("restartButton").addEventListener("click", () => {
  hideGameOverScreen();
  currentLevel = 1;
  score = 0;
  updateScoreDisplay();
  initLevel();
  gameState = "playing";
});
document.getElementById("nextLevelButton").addEventListener("click", () => {
  hideLevelCompleteScreen();
  currentLevel++;
  initLevel();
  gameState = "playing";
});
document.getElementById("scoreboardButton").addEventListener("click", () => {
  showScoreboardOverlay();
});
document.getElementById("closeScoreboardButton").addEventListener("click", () => {
  hideScoreboardOverlay();
});

requestAnimationFrame(gameLoop);