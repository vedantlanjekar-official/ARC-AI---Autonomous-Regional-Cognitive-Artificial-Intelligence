const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'main_hub.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pkt_id TEXT NOT NULL UNIQUE,
    src TEXT NOT NULL,
    dst TEXT NOT NULL,
    payload TEXT NOT NULL,
    signature TEXT,
    reply TEXT,
    status TEXT NOT NULL DEFAULT 'in_transit',
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

const upsertPacket = (packet) => {
  const existing = db
    .prepare(`SELECT id FROM packets WHERE pkt_id = ?`)
    .get(packet.pkt_id);

  if (existing) {
    db.prepare(
      `UPDATE packets
       SET src = @src,
           dst = @dst,
           payload = @payload,
           signature = @signature,
           updated_at = datetime('now')
       WHERE id = @id`,
    ).run({
      id: existing.id,
      ...packet,
    });
    return existing.id;
  }

  const insertStmt = db.prepare(
    `INSERT INTO packets (pkt_id, src, dst, payload, signature)
     VALUES (@pkt_id, @src, @dst, @payload, @signature)`,
  );
  const result = insertStmt.run(packet);
  return result.lastInsertRowid;
};

const updatePacketReply = (pktId, reply, status) => {
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
  db.prepare(`DELETE FROM timeline_entries WHERE packet_id = ?`).run(packetId);

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

module.exports = {
  upsertPacket,
  updatePacketReply,
  updatePacketStatus,
  replaceTimelineEntries,
};

