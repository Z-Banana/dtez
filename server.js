const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DB_URL = process.env.TURSO_DATABASE_URL;
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DB_URL || !DB_TOKEN) {
  console.error('❌ 缺少环境变量：TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN');
  process.exit(1);
}

let client;
try {
  client = createClient({ url: DB_URL, authToken: DB_TOKEN });
  console.log('✅ Turso 客户端创建成功');
} catch (err) {
  console.error('❌ Turso 客户端创建失败:', err.message);
  process.exit(1);
}

let dbReady = false;

async function initDb() {
  try {
    const tableCheck = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='blessings'"
    );
    if (tableCheck.rows.length === 0) {
      await client.execute(`CREATE TABLE blessings (id INTEGER PRIMARY KEY AUTOINCREMENT, author_name TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    }
    const suggestionsCheck = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='suggestions'"
    );
    if (suggestionsCheck.rows.length === 0) {
      await client.execute(`CREATE TABLE suggestions (id INTEGER PRIMARY KEY AUTOINCREMENT, author_name TEXT NOT NULL, contact TEXT, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
      console.log('✅ suggestions 表创建成功');
    }
    dbReady = true;
    console.log('✅ 数据库初始化完成');
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
  }
}
initDb();

// ===== 在线人数统计（用 Set 去重，基于 IP） =====
const onlineIPs = new Map(); // ip -> lastPingTime
const ONLINE_TIMEOUT = 60000;

function cleanupOnline() {
  const now = Date.now();
  for (const [ip, lastPing] of onlineIPs) {
    if (now - lastPing > ONLINE_TIMEOUT) onlineIPs.delete(ip);
  }
}
setInterval(cleanupOnline, 30000);

app.get('/api/online', (req, res) => {
  cleanupOnline();
  res.json({ count: onlineIPs.size });
});

app.post('/api/ping', (req, res) => {
  // 用 IP 作为唯一标识，避免一个浏览器产生多个 token
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  onlineIPs.set(ip, Date.now());
  res.json({ ok: true });
});

// ===== 健康检查 =====
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', dbReady, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ===== 祝福墙 API（时区修复：用北京时间） =====
app.get('/api/blessings', async (req, res) => {
  if (!dbReady) return res.status(503).json({ success: false, error: '数据库尚未就绪' });
  try {
    const result = await client.execute('SELECT * FROM blessings ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/blessings', async (req, res) => {
  if (!dbReady) return res.status(503).json({ success: false, error: '数据库尚未就绪' });
  const { author_name, message } = req.body;
  if (!author_name || !message) return res.status(400).json({ success: false, error: '不能为空' });
  if (author_name.length > 20 || message.length > 200) return res.status(400).json({ success: false, error: '超限' });
  try {
    // 使用北京时间（UTC+8）
    const now = new Date();
    const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const timeStr = bjTime.toISOString().replace('T', ' ').slice(0, 19);
    await client.execute({
      sql: 'INSERT INTO blessings (author_name, message, created_at) VALUES (?, ?, ?)',
      args: [author_name.trim(), message.trim(), timeStr]
    });
    res.json({ success: true, message: '祝福发送成功！' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== 建议 API（时区修复） =====
app.get('/api/suggestions', async (req, res) => {
  if (!dbReady) return res.status(503).json({ success: false, error: '数据库尚未就绪' });
  try {
    const result = await client.execute('SELECT * FROM suggestions ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/suggestions', async (req, res) => {
  if (!dbReady) return res.status(503).json({ success: false, error: '数据库尚未就绪' });
  const { author_name, contact, content } = req.body;
  if (!author_name || !content) return res.status(400).json({ success: false, error: '姓名和建议内容不能为空' });
  if (author_name.length > 20 || content.length > 500) return res.status(400).json({ success: false, error: '姓名不超过20字，建议不超过500字' });
  try {
    const now = new Date();
    const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const timeStr = bjTime.toISOString().replace('T', ' ').slice(0, 19);
    await client.execute({
      sql: 'INSERT INTO suggestions (author_name, contact, content, created_at) VALUES (?, ?, ?, ?)',
      args: [author_name.trim(), (contact || '').trim(), content.trim(), timeStr]
    });
    res.json({ success: true, message: '建议提交成功！感谢您的反馈' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== 管理员 API =====
const ADMIN_USER = 'dtez';
const ADMIN_PASS = 'zhangzhao';

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: 'admin-dtez-2026' });
  } else {
    res.status(401).json({ success: false, error: '用户名或密码错误' });
  }
});

app.get('/api/admin/blessings', async (req, res) => {
  const auth = req.headers['x-admin-token'];
  if (auth !== 'admin-dtez-2026') return res.status(403).json({ success: false, error: '未授权' });
  try {
    const result = await client.execute('SELECT * FROM blessings ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/blessings/:id', async (req, res) => {
  const auth = req.headers['x-admin-token'];
  if (auth !== 'admin-dtez-2026') return res.status(403).json({ success: false, error: '未授权' });
  try {
    await client.execute({ sql: 'DELETE FROM blessings WHERE id = ?', args: [req.params.id] });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/suggestions', async (req, res) => {
  const auth = req.headers['x-admin-token'];
  if (auth !== 'admin-dtez-2026') return res.status(403).json({ success: false, error: '未授权' });
  try {
    const result = await client.execute('SELECT * FROM suggestions ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/suggestions/:id', async (req, res) => {
  const auth = req.headers['x-admin-token'];
  if (auth !== 'admin-dtez-2026') return res.status(403).json({ success: false, error: '未授权' });
  try {
    await client.execute({ sql: 'DELETE FROM suggestions WHERE id = ?', args: [req.params.id] });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎉 大同二中校庆网站运行在 http://localhost:${PORT}`);
});
