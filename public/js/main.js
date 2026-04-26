// ===== 配置 =====
const ANNIVERSARY_DATE = new Date('2026-10-01T00:00:00').getTime(); // 请修改为你的校庆日期

// ===== 粒子背景 =====
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.6 + 0.1;
      // 金色 + 少量彩色粒子
      const colors = [
        '232, 185, 75',   // 金
        '255, 107, 107',  // 红
        '78, 205, 196',   // 青
        '255, 255, 255'   // 白
      ];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

// ===== 倒计时 =====
function updateCountdown() {
  const now = Date.now();
  const diff = ANNIVERSARY_DATE - now;

  if (diff <= 0) {
    document.getElementById('days').textContent = '00';
    document.getElementById('hours').textContent = '00';
    document.getElementById('minutes').textContent = '00';
    document.getElementById('seconds').textContent = '00';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = String(days).padStart(2, '0');
  document.getElementById('hours').textContent = String(hours).padStart(2, '0');
  document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

// ===== 音乐播放器 =====
(function initPlayer() {
  const audio = document.getElementById('audio-player');
  const btnPlay = document.getElementById('btn-play');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const vinyl = document.getElementById('vinyl');
  const waves = document.getElementById('sound-waves');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressHandle = document.getElementById('progress-handle');
  const currentTimeEl = document.getElementById('current-time');
  const totalTimeEl = document.getElementById('total-time');

  if (!audio) return;

  let isPlaying = false;
  let isDragging = false;

  function formatTime(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function togglePlay() {
    // 检查是否有音频源（通过source标签或src属性）
    const hasSource = audio.querySelector('source') || audio.src;
    if (!hasSource) {
      showToast('请先上传校歌音频文件（anthem.mp3）', '⚠️');
      return;
    }
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      vinyl.classList.remove('playing');
      waves.classList.remove('playing');
    } else {
      audio.play().catch(() => {
        showToast('音频播放失败，请检查文件是否存在', '⚠️');
      });
      isPlaying = true;
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      vinyl.classList.add('playing');
      waves.classList.add('playing');
    }
  }

  btnPlay.addEventListener('click', togglePlay);

  audio.addEventListener('timeupdate', () => {
    if (isDragging) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = pct + '%';
    progressHandle.style.left = pct + '%';
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => {
    isPlaying = false;
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
    vinyl.classList.remove('playing');
    waves.classList.remove('playing');
    progressFill.style.width = '0%';
    progressHandle.style.left = '0%';
    currentTimeEl.textContent = '0:00';
  });

  // 进度条拖动
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (audio.duration) {
      audio.currentTime = pct * audio.duration;
    }
  });

  // 上一首/下一首提示
  document.getElementById('btn-prev').addEventListener('click', () => {
    showToast('当前只有一首校歌', 'ℹ️');
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    showToast('当前只有一首校歌', 'ℹ️');
  });
})();

// ===== 祝福墙 =====
const blessingsList = document.getElementById('blessings-list');
const blessingForm = document.getElementById('blessing-form');
const refreshBtn = document.getElementById('refresh-btn');

async function loadBlessings() {
  try {
    blessingsList.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>正在加载祝福...</p></div>';
    const res = await fetch('/api/blessings');
    const data = await res.json();

    if (!data.success || !data.data || data.data.length === 0) {
      blessingsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <p>还没有祝福，来做第一个留言的人吧！</p>
        </div>`;
      return;
    }

    blessingsList.innerHTML = '';
    data.data.forEach((item, index) => {
      const date = new Date(item.created_at);
      const timeStr = `${date.getMonth()+1}月${date.getDate()}日 ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
      const div = document.createElement('div');
      div.className = 'blessing-item';
      div.style.animationDelay = (index * 0.05) + 's';
      div.innerHTML = `
        <div class="blessing-header">
          <span class="blessing-name">${escapeHtml(item.author_name)}</span>
          <span class="blessing-time">${timeStr}</span>
        </div>
        <p class="blessing-content">${escapeHtml(item.message)}</p>
      `;
      blessingsList.appendChild(div);
    });
  } catch (err) {
    blessingsList.innerHTML = `
      <div class="empty-state">
        <p>加载失败，请检查网络连接</p>
      </div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

blessingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const author_name = document.getElementById('b-name').value.trim();
  const message = document.getElementById('b-content').value.trim();
  const btn = document.getElementById('submit-btn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');

  if (!author_name || !message) {
    showToast('请填写姓名和祝福内容', '⚠️');
    return;
  }

  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'block';

  try {
    const res = await fetch('/api/blessings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name, message })
    });
    const data = await res.json();

    if (data.success) {
      showToast('祝福发送成功！', '✅');
      blessingForm.reset();
      document.getElementById('char-count').textContent = '0';
      loadBlessings();
    } else {
      showToast(data.error || '发送失败', '❌');
    }
  } catch (err) {
    showToast('网络错误，请稍后重试', '❌');
  } finally {
    btn.disabled = false;
    btnText.style.display = 'block';
    btnLoader.style.display = 'none';
  }
});

refreshBtn.addEventListener('click', () => {
  refreshBtn.classList.add('spinning');
  loadBlessings().then(() => {
    setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
  });
});

// 字符计数
document.getElementById('b-content').addEventListener('input', function() {
  document.getElementById('char-count').textContent = this.value.length;
});

// 初始加载
loadBlessings();

// ===== 模态框 =====
const moreBtn = document.getElementById('more-btn');
const navMore = document.getElementById('nav-more');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');

function openModal() {
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

moreBtn.addEventListener('click', openModal);
navMore.addEventListener('click', (e) => {
  e.preventDefault();
  openModal();
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ===== Toast =====
function showToast(msg, icon = '✅') {
  const toast = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== 移动端菜单 =====
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
  const spans = navToggle.querySelectorAll('span');
  if (navMenu.classList.contains('active')) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '1';
    spans[2].style.transform = '';
  }
});

// 点击菜单项后关闭
navMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navMenu.classList.remove('active');
    navToggle.querySelectorAll('span').forEach(s => {
      s.style.transform = '';
      s.style.opacity = '1';
    });
  });
});

// ===== 滚动显示动画 =====
const revealElements = document.querySelectorAll('.section-header, .player-card, .blessing-form-card, .blessings-list-card, .history-card');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

revealElements.forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// ===== 导航栏滚动效果 =====
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  const currentScroll = window.pageYOffset;
  if (currentScroll > 50) {
    navbar.style.background = 'rgba(255, 255, 255, 0.95)';
    navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
  } else {
    navbar.style.background = 'rgba(255, 255, 255, 0.85)';
    navbar.style.boxShadow = 'none';
  }
  lastScroll = currentScroll;
});
