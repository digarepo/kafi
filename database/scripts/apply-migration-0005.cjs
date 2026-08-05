require('dotenv/config');

const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    console.log('connected');
    let sql = fs.readFileSync(
      'database/migrations/0005_superb_slayback.sql',
      'utf8',
    );
    sql = sql.replace(/CREATE TABLE `/g, 'CREATE TABLE IF NOT EXISTS `');
    const statements = sql
      .split(/\n?--> statement-breakpoint\n?/)
      .map((s) => s.trim())
      .filter(Boolean);
    console.log('statements:', statements.length);

    for (let i = 0; i < statements.length; i++) {
      const s = statements[i];
      if (!s) continue;
      console.log('running', i + 1, s.split('\n')[0].slice(0, 50));
      await c.query(s);
      console.log('ok');
    }

    const current0004 = crypto
      .createHash('sha256')
      .update(
        fs.readFileSync('database/migrations/0004_chubby_bishop.sql', 'utf8'),
      )
      .digest('hex');
    const current0005 = crypto
      .createHash('sha256')
      .update(
        fs.readFileSync('database/migrations/0005_superb_slayback.sql', 'utf8'),
      )
      .digest('hex');

    await c.query('UPDATE __drizzle_migrations SET hash = ? WHERE id = 5', [
      current0004,
    ]);
    await c.query(
      'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      [current0005, Date.now()],
    );
    console.log('journal updated');
  } catch (e) {
    console.error('Error:', e);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
