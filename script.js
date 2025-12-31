const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");
const textCanvas = document.getElementById("textCanvas");
const tctx = textCanvas.getContext("2d");

const lixiContainer = document.getElementById("lixiContainer");
const popup = document.getElementById("popup");

const countdownBox = document.getElementById("countdownBox");
const countdownNumber = document.getElementById("countdownNumber");

const cardBox = document.getElementById("cardBox");

/**
 * FIX TRÀN MOBILE:
 * - Messenger/WebView hay làm innerWidth/innerHeight lệch
 * - Dùng documentElement.clientWidth/Height là an toàn hơn
 * - Không dùng DPR/transform để tránh lệch toạ độ khiến tụ chữ sai
 */
function resize() {
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;

    canvas.width = w;
    canvas.height = h;

    textCanvas.width = w;
    textCanvas.height = h;
}
resize();
addEventListener("resize", resize);

let selectedType = null;
let selectedEl = null;

let particles = [];
let phase = "idle"; // idle | explode | gather
let animRunning = false;

/* ================= UI FLOW ================= */
function chooseLixi(type) {
    cardBox.classList.add("hidden");
    countdownBox.classList.add("hidden");

    selectedType = type;
    selectedEl = lixiContainer.querySelector(`.lixi[data-type="${type}"]`);

    // Ẩn 2 bao còn lại
    [...lixiContainer.children].forEach(el => {
        el.style.display = (el === selectedEl) ? "block" : "none";
    });

    popup.classList.remove("hidden");
}

function confirmChoice(ok) {
    popup.classList.add("hidden");

    if (!ok) {
        [...lixiContainer.children].forEach(el => el.style.display = "block");
        selectedType = null;
        selectedEl = null;
        return;
    }

    // Đã chọn -> ẩn luôn bao lì xì
    lixiContainer.style.display = "none";

    if (selectedType === 1) {
        startCountdownThenFireworks();
    } else if (selectedType === 2) {
        showTicket();
    } else {
        showLuckyNextTime();
    }
}

/* ================= Cards ================= */
function showTicket() {
    cardBox.innerHTML = `
    <div class="title">🎫 VÉ ĐẶC BIỆT</div>
    <div>Bé được dùng <b>Anh Ti</b> thoải mái trong <b>1 ngày</b> 😆</div>
    <div class="small">(Chúc bé vui vẻ nha!)</div>
  `;
    cardBox.classList.remove("hidden");
}

function showLuckyNextTime() {
    cardBox.innerHTML = `
    <div class="title">🍀 ÔI KHÔNG</div>
    <div><b>Chúc bé may mắn lần sau!</b></div>
  `;
    cardBox.classList.remove("hidden");
}

/* ================= Countdown ================= */
function startCountdownThenFireworks() {
    let c = 3;
    countdownNumber.textContent = c;
    countdownBox.classList.remove("hidden");

    const timer = setInterval(() => {
        c--;
        if (c === 0) {
            clearInterval(timer);
            countdownBox.classList.add("hidden");
            startFireworkShow();
        } else {
            countdownNumber.textContent = c;
        }
    }, 1000);
}

/* ================= Particle ================= */
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.tx = null;
        this.ty = null;
        this.color = color;
        this.size = 2;
    }

    update() {
        if (phase === "explode") {
            this.vy += 0.04;
            this.x += this.vx;
            this.y += this.vy;
        } else if (phase === "gather") {
            this.x += (this.tx - this.x) * 0.08;
            this.y += (this.ty - this.y) * 0.08;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 18;
        ctx.shadowColor = this.color;
        ctx.fill();
    }
}

/* ================= Firework explode ================= */
function explode(x, y) {
    const hue = Math.random() * 360;
    for (let i = 0; i < 560; i++) { // bạn đã tăng và chạy ngon
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 6 + 2;
        particles.push(
            new Particle(
                x, y,
                Math.cos(a) * s,
                Math.sin(a) * s,
                `hsl(${hue},100%,60%)`
            )
        );
    }
}

/* ================= Text points (2 dòng) ================= */
function getTextPoints() {
    tctx.clearRect(0, 0, textCanvas.width, textCanvas.height);

    tctx.textAlign = "center";
    tctx.textBaseline = "middle";
    tctx.fillStyle = "#fff";

    const y1 = textCanvas.height / 2 - 45;
    const y2 = textCanvas.height / 2 + 45;

    // FIX MOBILE: font size phụ thuộc vào chiều rộng viewport thật
    const w = textCanvas.width;
    const isMobile = w < 520;

    // Trên mobile cho chữ nhỏ hơn để KHÔNG tràn
    const size = isMobile ?
        Math.max(26, Math.min(46, Math.floor(w / 10))) :
        Math.max(44, Math.min(84, Math.floor(w / 18)));

    tctx.font = `900 ${size}px Arial`;
    tctx.fillText("ANH TI ❤️ BÉ HOA", w / 2, y1);

    tctx.font = `900 ${Math.floor(size * (isMobile ? 0.85 : 1))}px Arial`;
    tctx.fillText("TIẾP 2026 NHÉ", w / 2, y2);

    const img = tctx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
    const points = [];
    const step = isMobile ? 7 : 6; // mobile nhẹ hơn chút cho mượt

    for (let y = 0; y < textCanvas.height; y += step) {
        for (let x = 0; x < textCanvas.width; x += step) {
            const i = (y * textCanvas.width + x) * 4;
            if (img[i + 3] > 160) points.push({ x, y });
        }
    }
    return points;
}

/* ================= Show flow ================= */
function startFireworkShow() {
    particles = [];
    phase = "explode";

    let boomCount = 0;

    const boomTimer = setInterval(() => {
        explode(
            Math.random() * canvas.width * 0.6 + canvas.width * 0.2,
            Math.random() * canvas.height * 0.35 + canvas.height * 0.18
        );
        boomCount++;

        if (boomCount >= 4) {
            clearInterval(boomTimer);
            setTimeout(gatherToText, 1100);
        }
    }, 600);

    if (!animRunning) {
        animRunning = true;
        animate();
    }
}

function gatherToText() {
    phase = "gather";
    const points = getTextPoints();

    particles.forEach((p, idx) => {
        const t = points[idx % points.length];
        p.tx = t.x;
        p.ty = t.y;
        p.vx = 0;
        p.vy = 0;
    });
}

/* ================= Animation loop ================= */
function animate() {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) p.update();

    requestAnimationFrame(animate);
}
