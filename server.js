const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ===== 环境变量检查 =====
const DB_URL = process.env.TURSO_DATABASE_URL;
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DB_URL || !DB_TOKEN) {
  console.error('❌ 缺少环境变量：TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN');
  console.error('   请在 Pxxl 环境变量设置中配置这两个变量');
  process.exit(1);
}

// ===== 创建 Turso 客户端 =====
let client;
try {
  client = createClient({
    url: DB_URL,
    authToken: DB_TOKEN,
  });
  console.log('✅ Turso 客户端创建成功');
} catch (err) {
  console.error('❌ Turso 客户端创建失败:', err.message);
  process.exit(1);
}

// ===== 数据库初始化 =====
let dbReady = false;

async function initDb() {
  try {
    // 检查 blessings 表是否存在
    const tableCheck = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='blessings'"
    );

    if (tableCheck.rows.length === 0) {
      await client.execute(`
        CREATE TABLE blessings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          author_name TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ 数据库表创建成功');
    } else {
      try {
        await client.execute('SELECT author_name, message FROM blessings LIMIT 1');
        console.log('✅ 数据库表结构正确，数据已保留');
      } catch (colErr) {
        console.log('🔄 检测到旧表结构，正在迁移数据...');
        await client.execute('ALTER TABLE blessings RENAME TO blessings_old');
        await client.execute(`
          CREATE TABLE blessings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_name TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        try {
          await client.execute(`
            INSERT INTO blessings (id, author_name, message, created_at)
            SELECT id, name, content, created_at FROM blessings_old
          `);
          const count = await client.execute('SELECT COUNT(*) as cnt FROM blessings');
          console.log('✅ 数据迁移成功，共迁移 ' + count.rows[0].cnt + ' 条祝福');
        } catch (migrateErr) {
          console.log('⚠️ 自动迁移失败:', migrateErr.message);
        }
        try {
          await client.execute('DROP TABLE blessings_old');
        } catch (e) { /* 忽略 */ }
      }
    }
    dbReady = true;
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
  }
}

initDb();

// ===== 健康检查端点 =====
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    dbReady: dbReady,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ===== API: 获取所有祝福 =====
app.get('/api/blessings', async (req, res) => {
  if (!dbReady || !client) {
    return res.status(503).json({ success: false, error: '数据库尚未就绪' });
  }
  try {
    const result = await client.execute('SELECT * FROM blessings ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    console.error('获取祝福失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== API: 发送祝福 =====
app.post('/api/blessings', async (req, res) => {
  if (!dbReady || !client) {
    return res.status(503).json({ success: false, error: '数据库尚未就绪' });
  }

  const { author_name, message } = req.body;
  if (!author_name || !message) {
    return res.status(400).json({ success: false, error: '姓名和祝福内容不能为空' });
  }
  if (author_name.length > 20 || message.length > 200) {
    return res.status(400).json({ success: false, error: '姓名不超过20字，祝福不超过200字' });
  }

  try {
    await client.execute({
      sql: 'INSERT INTO blessings (author_name, message) VALUES (?, ?)',
      args: [author_name.trim(), message.trim()]
    });
    res.json({ success: true, message: '祝福发送成功！' });
  } catch (err) {
    console.error('发送祝福失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== 启动服务器 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎉 大同二中校庆网站运行在 http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/health`);
});
