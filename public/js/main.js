// ===== 配置 =====
const ANNIVERSARY_DATE = new Date('2026-10-01T00:00:00').getTime();

// 客户端唯一标识（用于在线人数统计）
let clientToken = localStorage.getItem('clientToken');
if (!clientToken) {
  clientToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('clientToken', clientToken);
}

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
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.6 + 0.1;
      const colors = ['232, 185, 75', '255, 107, 107', '78, 205, 196', '255, 255, 255'];
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
    ['days','hours','minutes','seconds'].forEach(id => document.getElementById(id).textContent = '00');
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
    if (!s || isNaN(s) || s === Infinity) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function togglePlay() {
    const hasSource = audio.querySelector('source') || (audio.src && audio.src !== window.location.href);
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
      audio.play().catch(() => showToast('音频播放失败', '⚠️'));
      isPlaying = true;
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      vinyl.classList.add('playing');
      waves.classList.add('playing');
    }
  }

  btnPlay.addEventListener('click', togglePlay);

  audio.addEventListener('timeupdate', () => {
    if (isDragging || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = pct + '%';
    progressHandle.style.left = pct + '%';
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  // 总时长获取
  function updateDuration() {
    const d = audio.duration;
    if (d && d !== Infinity && !isNaN(d)) {
      totalTimeEl.textContent = formatTime(d);
      return true;
    }
    return false;
  }

  ['loadedmetadata', 'durationchange', 'canplay', 'canplaythrough'].forEach(evt => {
    audio.addEventListener(evt, () => updateDuration());
  });

  if (audio.readyState >= 1) updateDuration();

  let checkCount = 0;
  const checkInterval = setInterval(() => {
    if (updateDuration() || ++checkCount > 30) clearInterval(checkInterval);
  }, 100);

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

  // ===== 进度条拖动（修复版）=====
  function seekTo(clientX) {
    const rect = progressBar.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = pct * audio.duration;
      progressFill.style.width = (pct * 100) + '%';
      progressHandle.style.left = (pct * 100) + '%';
    }
  }

  progressBar.addEventListener('click', (e) => {
    seekTo(e.clientX);
  });

  // 鼠标拖动
  progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    seekTo(e.clientX);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    seekTo(e.clientX);
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // 触摸拖动（移动端）
  progressBar.addEventListener('touchstart', (e) => {
    isDragging = true;
    seekTo(e.touches[0].clientX);
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    seekTo(e.touches[0].clientX);
  }, { passive: false });

  document.addEventListener('touchend', () => {
    isDragging = false;
  });

  document.getElementById('btn-prev').addEventListener('click', () => showToast('当前只有一首校歌', 'ℹ️'));
  document.getElementById('btn-next').addEventListener('click', () => showToast('当前只有一首校歌', 'ℹ️'));
})();

// ===== 时区转换工具 =====
function toChinaTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  // 转为北京时间 (UTC+8)
  return new Date(date.getTime() + (8 * 60 * 60 * 1000));
}

function formatChinaTime(isoString) {
  const d = toChinaTime(isoString);
  return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatChinaDateShort(isoString) {
  const d = toChinaTime(isoString);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

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
      blessingsList.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><p>还没有祝福，来做第一个留言的人吧！</p></div>';
      return;
    }
    blessingsList.innerHTML = '';
    data.data.forEach((item, index) => {
      const timeStr = formatChinaTime(item.created_at);
      const div = document.createElement('div');
      div.className = 'blessing-item';
      div.style.animationDelay = (index * 0.05) + 's';
      div.innerHTML = `<div class="blessing-header"><span class="blessing-name">${escapeHtml(item.author_name)}</span><span class="blessing-time">${timeStr}</span></div><p class="blessing-content">${escapeHtml(item.message)}</p>`;
      blessingsList.appendChild(div);
    });
  } catch (err) {
    blessingsList.innerHTML = '<div class="empty-state"><p>加载失败，请检查网络连接</p></div>';
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

  if (!author_name || !message) { showToast('请填写姓名和祝福内容', '⚠️'); return; }

  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'block';

  try {
    const res = await fetch('/api/blessings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
  loadBlessings().then(() => setTimeout(() => refreshBtn.classList.remove('spinning'), 500));
});

document.getElementById('b-content').addEventListener('input', function() {
  document.getElementById('char-count').textContent = this.value.length;
});

loadBlessings();

// ===== 提交建议 =====
const suggestForm = document.getElementById('suggest-form');
if (suggestForm) {
  suggestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const author_name = document.getElementById('s-name').value.trim();
    const contact = document.getElementById('s-contact').value.trim();
    const content = document.getElementById('s-content').value.trim();
    const btn = document.getElementById('s-submit-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    if (!author_name || !content) { showToast('请填写姓名和建议内容', '⚠️'); return; }

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_name, contact, content })
      });
      const data = await res.json();
      if (data.success) {
        showToast('建议提交成功！感谢您的反馈', '✅');
        suggestForm.reset();
        document.getElementById('s-char-count').textContent = '0';
        closeSuggest();
      } else {
        showToast(data.error || '提交失败', '❌');
      }
    } catch (err) {
      showToast('网络错误，请稍后重试', '❌');
    } finally {
      btn.disabled = false;
      btnText.style.display = 'block';
      btnLoader.style.display = 'none';
    }
  });

  document.getElementById('s-content').addEventListener('input', function() {
    document.getElementById('s-char-count').textContent = this.value.length;
  });
}

// ===== 模态框管理 =====
const modalOverlay = document.getElementById('modal-overlay');
const suggestOverlay = document.getElementById('suggest-overlay');
const changelogOverlay = document.getElementById('changelog-overlay');
const adminLoginOverlay = document.getElementById('admin-login-overlay');
const adminPanelOverlay = document.getElementById('admin-panel-overlay');

function openModal(el) { if(el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; } }
function closeModal(el) { if(el) { el.classList.remove('active'); document.body.style.overflow = ''; } }

// 更多
const moreBtn = document.getElementById('more-btn');
const navMore = document.getElementById('nav-more');
if (moreBtn) moreBtn.addEventListener('click', () => openModal(modalOverlay));
if (navMore) navMore.addEventListener('click', (e) => { e.preventDefault(); openModal(modalOverlay); });
document.getElementById('modal-close').addEventListener('click', () => closeModal(modalOverlay));
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(modalOverlay); });

// 提交建议
const btnSuggest = document.getElementById('btn-suggest');
if (btnSuggest) btnSuggest.addEventListener('click', () => { closeModal(modalOverlay); openModal(suggestOverlay); });
document.getElementById('suggest-close').addEventListener('click', () => closeModal(suggestOverlay));
suggestOverlay.addEventListener('click', (e) => { if (e.target === suggestOverlay) closeModal(suggestOverlay); });

function closeSuggest() { closeModal(suggestOverlay); }

// 更新日志
const btnChangelog = document.getElementById('btn-changelog');
if (btnChangelog) btnChangelog.addEventListener('click', () => { closeModal(modalOverlay); openModal(changelogOverlay); });
document.getElementById('changelog-close').addEventListener('click', () => closeModal(changelogOverlay));
changelogOverlay.addEventListener('click', (e) => { if (e.target === changelogOverlay) closeModal(changelogOverlay); });

// 后台登录
const btnAdmin = document.getElementById('btn-admin');
if (btnAdmin) btnAdmin.addEventListener('click', () => { closeModal(modalOverlay); openModal(adminLoginOverlay); });
document.getElementById('admin-login-close').addEventListener('click', () => closeModal(adminLoginOverlay));
adminLoginOverlay.addEventListener('click', (e) => { if (e.target === adminLoginOverlay) closeModal(adminLoginOverlay); });

// 后台面板
document.getElementById('admin-panel-close').addEventListener('click', () => closeModal(adminPanelOverlay));
adminPanelOverlay.addEventListener('click', (e) => { if (e.target === adminPanelOverlay) closeModal(adminPanelOverlay); });

// 登录表单
const adminLoginForm = document.getElementById('admin-login-form');
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-user').value.trim();
    const password = document.getElementById('admin-pass').value;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        closeModal(adminLoginOverlay);
        openModal(adminPanelOverlay);
        loadAdminData();
        startOnlinePolling();
      } else {
        showToast(data.error || '登录失败', '❌');
      }
    } catch (err) {
      showToast('网络错误', '❌');
    }
  });
}

// ===== 后台管理 =====
let adminToken = localStorage.getItem('adminToken') || '';

async function loadAdminData() {
  if (!adminToken) return;
  try {
    const bRes = await fetch('/api/admin/blessings', { headers: { 'x-admin-token': adminToken } });
    const bData = await bRes.json();
    const bBody = document.getElementById('admin-blessings-body');
    if (bData.success && bData.data.length > 0) {
      document.getElementById('stat-blessings').textContent = bData.data.length;
      bBody.innerHTML = bData.data.map(item => {
        const time = formatChinaDateShort(item.created_at);
        return `<tr><td>${item.id}</td><td>${escapeHtml(item.author_name)}</td><td>${escapeHtml(item.message)}</td><td>${time}</td><td><button class="admin-del-btn" data-id="${item.id}" data-type="blessings">删除</button></td></tr>`;
      }).join('');
      bBody.querySelectorAll('.admin-del-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(btn.dataset.id, btn.dataset.type));
      });
    } else {
      bBody.innerHTML = '<tr><td colspan="5" class="admin-empty">暂无祝福</td></tr>';
    }

    const sRes = await fetch('/api/admin/suggestions', { headers: { 'x-admin-token': adminToken } });
    const sData = await sRes.json();
    const sBody = document.getElementById('admin-suggestions-body');
    if (sData.success && sData.data.length > 0) {
      document.getElementById('stat-suggestions').textContent = sData.data.length;
      sBody.innerHTML = sData.data.map(item => {
        const time = formatChinaDateShort(item.created_at);
        return `<tr><td>${item.id}</td><td>${escapeHtml(item.author_name)}</td><td>${escapeHtml(item.contact || '-')}</td><td>${escapeHtml(item.content)}</td><td>${time}</td><td><button class="admin-del-btn" data-id="${item.id}" data-type="suggestions">删除</button></td></tr>`;
      }).join('');
      sBody.querySelectorAll('.admin-del-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(btn.dataset.id, btn.dataset.type));
      });
    } else {
      sBody.innerHTML = '<tr><td colspan="6" class="admin-empty">暂无建议</td></tr>';
    }
  } catch (err) {
    showToast('加载管理数据失败', '❌');
  }
}

async function deleteItem(id, type) {
  if (!confirm('确定要删除吗？')) return;
  try {
    const res = await fetch(`/api/admin/${type}/${id}`, {
      method: 'DELETE', headers: { 'x-admin-token': adminToken }
    });
    const data = await res.json();
    if (data.success) {
      showToast('删除成功', '✅');
      loadAdminData();
      loadBlessings();
    } else {
      showToast(data.error || '删除失败', '❌');
    }
  } catch (err) {
    showToast('删除失败', '❌');
  }
}

document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ===== 在线人数 =====
async function updateOnline() {
  try {
    const res = await fetch('/api/online');
    const data = await res.json();
    const el = document.getElementById('stat-online');
    if (el) el.textContent = data.count;
  } catch (e) {}
}

function startOnlinePolling() {
  updateOnline();
  setInterval(updateOnline, 10000);
}

// 前台定期 ping（带 clientToken）
async function sendPing() {
  try {
    await fetch('/api/ping', {
      method: 'POST',
      headers: { 'x-client-token': clientToken }
    });
  } catch (e) {}
}
sendPing();
setInterval(sendPing, 15000);

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
if (navToggle) {
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
}

navMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navMenu.classList.remove('active');
    navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = '1'; });
  });
});

// ===== 滚动显示动画 =====
const revealElements = document.querySelectorAll('.section-header, .player-card, .blessing-form-card, .blessings-list-card, .history-card');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } });
}, { threshold: 0.1 });
revealElements.forEach(el => { el.classList.add('reveal'); revealObserver.observe(el); });

// ===== 导航栏滚动效果 =====
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
});
