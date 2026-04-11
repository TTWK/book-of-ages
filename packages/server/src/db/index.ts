/**
 * 数据库连接管理
 * 使用 sqlite3 (异步 SQLite 绑定)
 */

import sqlite3, { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { schema } from './schema';

let db: Database | null = null;
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'book-of-ages.db');

/**
 * 获取数据库实例（单例模式）
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * 初始化数据库（异步）
 */
export function initDatabase(): Promise<Database> {
  return new Promise((resolve, reject) => {
    // 确保数据目录存在
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 打开数据库连接
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to open database:', err);
        reject(err);
        return;
      }

      console.log(`Database initialized at: ${DB_PATH}`);

      // 启用外键约束（sqlite3 不支持回调）
      db!.run('PRAGMA foreign_keys = ON');

      // 执行 Schema 创建表
      db!.exec(schema, (err) => {
        if (err) {
          console.error('Failed to create schema:', err);
          reject(err);
          return;
        }

        resolve(db!);
      });
    });
  });
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        db = null;
        console.log('Database connection closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * 运行 SQL 语句（辅助函数）
 */
export function run(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; lastInsertRowid: number }> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        changes: this.changes,
        lastInsertRowid: 0, // sqlite3 不支持 lastInsertRowid
      });
    });
  });
}

/**
 * 获取单行数据
 */
export function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get<T>(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * 获取多行数据
 */
export function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all<T>(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * 运行事务（自动包装 BEGIN/COMMIT/ROLLBACK）
 * @param queries 要执行的 SQL 查询数组，每个查询包含 sql 和 params
 * @returns 所有查询的结果数组
 */
export async function transaction(
  queries: Array<{ sql: string; params?: unknown[] }>
): Promise<Array<{ changes: number }>> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();

    // 开始事务
    database.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        reject(err);
        return;
      }

      const results: Array<{ changes: number }> = [];
      let completed = 0;

      const executeNext = (index: number) => {
        if (index >= queries.length) {
          // 所有查询完成，提交事务
          database.run('COMMIT', (commitErr) => {
            if (commitErr) {
              // 提交失败，回滚
              database.run('ROLLBACK', () => {
                reject(commitErr);
              });
              return;
            }
            resolve(results);
          });
          return;
        }

        const { sql, params = [] } = queries[index];
        database.run(sql, params, function (runErr) {
          if (runErr) {
            // 查询失败，回滚
            database.run('ROLLBACK', () => {
              reject(runErr);
            });
            return;
          }
          results.push({ changes: this.changes });
          executeNext(index + 1);
        });
      };

      executeNext(0);
    });
  });
}
