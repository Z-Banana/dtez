const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 智能初始化数据库 — 不丢数据
async function initDb() {
  try {
    // 1. 检查 blessings 表是否存在
    const tableCheck = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='blessings'"
    );

    if (tableCheck.rows.length === 0) {
      // 表不存在，创建新表
      await client.execute(`
        CREATE TABLE blessings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          author_name TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ 数据库表创建成功');
      return;
    }

    // 2. 表已存在，检查列名是否正确（新版用 author_name / message）
    try {
      await client.execute('SELECT author_name, message FROM blessings LIMIT 1');
      console.log('✅ 数据库表结构正确，数据已保留');
    } catch (colErr) {
      // 检测到旧版结构（name / content），自动迁移数据
      console.log('🔄 检测到旧表结构，正在迁移数据...');

      // 把旧表改名备份
      await client.execute('ALTER TABLE blessings RENAME TO blessings_old');

      // 创建新表
      await client.execute(`
        CREATE TABLE blessings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          author_name TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 把旧数据迁移过来
      try {
        await client.execute(`
          INSERT INTO blessings (id, author_name, message, created_at)
          SELECT id, name, content, created_at FROM blessings_old
        `);
        console.log('✅ 数据迁移成功，共迁移 ' + 
          (await client.execute('SELECT COUNT(*) as cnt FROM blessings')).rows[0].cnt + ' 条祝福');
      } catch (migrateErr) {
        console.log('⚠️ 自动迁移失败，旧数据保留在 blessings_old 表中');
      }

      // 删除旧表（可选，如果迁移成功可以删掉；失败则保留供手动恢复）
      try {
        await client.execute('DROP TABLE blessings_old');
      } catch (e) { /* 忽略 */ }
    }
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
  }
}
initDb();

// API: 获取所有祝福
app.get('/api/blessings', async (req, res) => {
  try {
    const result = await client.execute('SELECT * FROM blessings ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: 发送祝福
app.post('/api/blessings', async (req, res) => {
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
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎉 大同二中校庆网站运行在 http://localhost:${PORT}`);
});
