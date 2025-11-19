const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'mini_hub.db');
const db = new Database(DB_PATH);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pkt_id TEXT NOT NULL UNIQUE,
    owner TEXT NOT NULL,
    src TEXT NOT NULL,
    dst TEXT NOT NULL,
    payload TEXT NOT NULL,
    signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reply TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS timeline_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    packet_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (packet_id) REFERENCES packets(id) ON DELETE CASCADE
  );
`);

const createUser = (username, passwordHash) => {
  const stmt = db.prepare(
    `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
  );
  const result = stmt.run(username, passwordHash);
  return result.lastInsertRowid;
};

const findUserByUsername = (username) => {
  return db
    .prepare(`SELECT id, username, password_hash FROM users WHERE username = ?`)
    .get(username);
};

const insertPacket = (packet) => {
  const stmt = db.prepare(
    `INSERT INTO packets (pkt_id, owner, src, dst, payload, signature)
     VALUES (@pkt_id, @owner, @src, @dst, @payload, @signature)`,
  );
  const result = stmt.run(packet);
  return result.lastInsertRowid;
};

const updatePacketReply = (pktId, reply, status = 'delivered') => {
  db.prepare(
    `UPDATE packets
     SET reply = ?, status = ?, updated_at = datetime('now')
     WHERE pkt_id = ?`,
  ).run(reply, status, pktId);
};

const updatePacketStatus = (pktId, status) => {
  db.prepare(
    `UPDATE packets
     SET status = ?, updated_at = datetime('now')
     WHERE pkt_id = ?`,
  ).run(status, pktId);
};

const replaceTimelineEntries = (packetId, messages = []) => {
  const deleteStmt = db.prepare(
    `DELETE FROM timeline_entries WHERE packet_id = ?`,
  );
  deleteStmt.run(packetId);

  if (!messages.length) {
    return;
  }

  const insertStmt = db.prepare(
    `INSERT INTO timeline_entries (packet_id, position, message)
     VALUES (?, ?, ?)`,
  );
  const insertMany = db.transaction((entries) => {
    entries.forEach((message, index) => {
      insertStmt.run(packetId, index, message);
    });
  });
  insertMany(messages);
};

const getTimelineForPacket = (pktId) => {
  const data = db
    .prepare(
      `SELECT te.message
       FROM timeline_entries te
       INNER JOIN packets p ON p.id = te.packet_id
       WHERE p.pkt_id = ?
       ORDER BY te.position ASC`,
    )
    .all(pktId);
  return data.map((row) => row.message);
};

const getRecentPackets = (owner, limit = 10) => {
  return db
    .prepare(
      `SELECT pkt_id, dst, status, reply, created_at, updated_at
       FROM packets
       WHERE owner = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(owner, limit);
};

const getPacketStats = (owner) => {
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM packets
       WHERE owner = ?`,
    )
    .get(owner);
  return totals || { total: 0, delivered: 0, pending: 0, failed: 0 };
};

const packetExists = (pktId) => {
  const result = db
    .prepare(`SELECT 1 FROM packets WHERE pkt_id = ?`)
    .get(pktId);
  return Boolean(result);
};

module.exports = {
  db,
  createUser,
  findUserByUsername,
  insertPacket,
  updatePacketReply,
  updatePacketStatus,
  replaceTimelineEntries,
  getTimelineForPacket,
  getRecentPackets,
  getPacketStats,
  packetExists,
};

