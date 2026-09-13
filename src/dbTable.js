const pool = require('./db.js');

// Generic helper for the simple, single-table queries that were getting
// hand-written the same way in every feature module (userStats.js,
// channelSettings.js, excavation.js, ...): find-by-equality, upsert,
// increment-on-conflict, plain update, delete. Anything needing a JOIN,
// aggregate, or non-equality WHERE (ranges, LIKE, ...) still goes straight
// through db.js's pool - this only covers the shapes that repeat.
//
// Usage: const duelStats = new Table('duel_stats');
//        await duelStats.findOne({ channel, username });
class Table {
  constructor(tableName) {
    this.tableName = tableName;
  }

  _whereClause(where = {}) {
    const keys = Object.keys(where);
    if (keys.length === 0) return { clause: '', params: [] };
    return {
      clause: 'WHERE ' + keys.map((key) => `${key} = ?`).join(' AND '),
      params: keys.map((key) => where[key]),
    };
  }

  async findOne(where = {}) {
    const { clause, params } = this._whereClause(where);
    const [rows] = await pool.query(`SELECT * FROM ${this.tableName} ${clause} LIMIT 1`, params);
    return rows[0] || null;
  }

  async findMany(where = {}, { orderBy, limit } = {}) {
    const { clause, params } = this._whereClause(where);
    let sql = `SELECT * FROM ${this.tableName} ${clause}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    if (limit) sql += ` LIMIT ${Number(limit)}`;
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async count(where = {}) {
    const { clause, params } = this._whereClause(where);
    const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${this.tableName} ${clause}`, params);
    return rows[0].count;
  }

  async sum(column, where = {}) {
    const { clause, params } = this._whereClause(where);
    const [rows] = await pool.query(`SELECT SUM(${column}) AS total FROM ${this.tableName} ${clause}`, params);
    return rows[0].total !== null ? Number(rows[0].total) : 0;
  }

  async insert(data) {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    await pool.query(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
      columns.map((col) => data[col])
    );
  }

  // Insert `data`, or on a unique/primary key conflict: add the row's own
  // value to any column named in `increment` (the "wins = wins + VALUES(wins)"
  // shape), and/or overwrite any column named in `overwrite` with the row's
  // value (the "username = VALUES(username)" shape). Columns in `data` that
  // are in neither list are only used for the initial insert.
  async upsert(data, { increment = [], overwrite = [] } = {}) {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const updateClauses = [
      ...increment.map((col) => `${col} = ${col} + VALUES(${col})`),
      ...overwrite.map((col) => `${col} = VALUES(${col})`),
    ];

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})` +
      (updateClauses.length ? ` ON DUPLICATE KEY UPDATE ${updateClauses.join(', ')}` : '');

    await pool.query(sql, columns.map((col) => data[col]));
  }

  async update(where, data) {
    const dataColumns = Object.keys(data);
    const setClause = dataColumns.map((col) => `${col} = ?`).join(', ');
    const { clause: whereClause, params: whereParams } = this._whereClause(where);

    await pool.query(
      `UPDATE ${this.tableName} SET ${setClause} ${whereClause}`,
      [...dataColumns.map((col) => data[col]), ...whereParams]
    );
  }

  async deleteWhere(where = {}) {
    const { clause, params } = this._whereClause(where);
    await pool.query(`DELETE FROM ${this.tableName} ${clause}`, params);
  }
}

module.exports = Table;
