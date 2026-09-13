/**
 * 数据库连接管理
 * 使用 sqlite3 (异步 SQLite 绑定)
 */

import sqlite3, { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { schema } from './schema';

let db: Database | null = null;

/**
 * 数据目录解析优先级：
 * 1. DATABASE_PATH —— 完整数据库文件路径
 * 2. DATA_DIR —— 数据目录（Docker 部署约定）
 * 3. <cwd>/data —— 本地开发默认
 */
export function resolveDataDir(): string {
  if (process.env.DATABASE_PATH) {
    return path.dirname(process.env.DATABASE_PATH);
  }
  return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

const DB_PATH =
  process.env.DATABASE_PATH ||
  (process.env.NODE_ENV === 'test'
    ? path.join(resolveDataDir(), `test-${process.pid}-${Date.now()}.db`)
    : path.join(resolveDataDir(), 'book-of-ages.db'));

/**
 * 事务互斥锁：SQLite 单连接上并发的 BEGIN/COMMIT 会交错，
 * 用 Promise 链保证同一时刻只有一个事务在执行。
 */
let transactionChain: Promise<unknown> = Promise.resolve();

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
    // 如果已有连接，先关闭
    if (db) {
      db.close();
      db = null;
    }

    // 确保数据目录存在
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 删除旧的测试数据库文件（如果存在）
    if (process.env.NODE_ENV === 'test' && fs.existsSync(DB_PATH)) {
      try {
        fs.unlinkSync(DB_PATH);
        if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
        if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');
      } catch (unlinkErr) {
        console.warn('Failed to delete old test database:', unlinkErr);
      }
    }

    // 打开数据库连接
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to open database:', err);
        reject(err);
        return;
      }

      console.info(`Database initialized at: ${DB_PATH}`);

      // 启用外键约束、WAL 模式与 busy_timeout（提高并发性能与稳定性）
      db!.run('PRAGMA foreign_keys = ON');
      db!.run('PRAGMA journal_mode = WAL');
      db!.run('PRAGMA busy_timeout = 5000');

      // 执行 Schema 创建表
      db!.exec(schema, (err) => {
        if (err) {
          console.error('Failed to create schema:', err);
          reject(err);
          return;
        }

        // 增量字段迁移兼容
        db!.run('ALTER TABLE materials ADD COLUMN snapshot_html_path TEXT', () => {});
        db!.run('ALTER TABLE materials ADD COLUMN file_hash TEXT', () => {});
        db!.run('ALTER TABLE materials ADD COLUMN file_size INTEGER', () => {});
        // AI 辅助体系（2026-09-13）：钥匙权限分级与内容溯源
        // 存量钥匙经 DEFAULT 'admin' 保持能力不缩水；新钥匙由创建方显式指定
        db!.run("ALTER TABLE api_keys ADD COLUMN scopes TEXT NOT NULL DEFAULT 'admin'", () => {});
        db!.run('ALTER TABLE events ADD COLUMN created_by TEXT', () => {});

        // 播种管理员引导行：ADMIN_API_KEY 环境变量鉴权成功后以 'admin' 身份
        // 记录审计日志，需要该行满足 operation_logs 的外键约束
        db!.run(
          `INSERT OR IGNORE INTO api_keys (id, name, key_hash, created_at, updated_at)
           VALUES ('admin', 'ADMIN_BOOTSTRAP (ADMIN_API_KEY)', 'not-a-real-key-hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        );

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
      const dbPath = DB_PATH;
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        db = null;
        console.info('Database connection closed');

        // 在测试环境中删除临时数据库文件
        if (process.env.NODE_ENV === 'test' && fs.existsSync(dbPath)) {
          try {
            fs.unlinkSync(dbPath);
            // 同时删除可能存在的 -wal 和 -shm 文件
            if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
            if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
          } catch (unlinkErr) {
            console.warn('Failed to delete test database file:', unlinkErr);
          }
        }

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
    database.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        changes: this.changes,
        lastInsertRowid: this.lastID ?? 0,
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
    database.get<T>(sql, params, (err: Error | null, row: T) => {
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
    database.all<T>(sql, params, (err: Error | null, rows: T[]) => {
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
 * 通过互斥链保证同一连接上事务不会交错执行。
 * @param queries 要执行的 SQL 查询数组，每个查询包含 sql 和 params
 * @returns 所有查询的结果数组
 */
export async function transaction(
  queries: Array<{ sql: string; params?: unknown[] }>
): Promise<Array<{ changes: number }>> {
  const execute = () =>
    new Promise<Array<{ changes: number }>>((resolve, reject) => {
      const database = getDatabase();

      // 开始事务
      database.run('BEGIN TRANSACTION', (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        const results: Array<{ changes: number }> = [];

        const executeNext = (index: number) => {
          if (index >= queries.length) {
            // 所有查询完成，提交事务
            database.run('COMMIT', (commitErr: Error | null) => {
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
          database.run(sql, params, function (this: sqlite3.RunResult, runErr: Error | null) {
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

  // 排队等待前序事务完成后执行
  const result = transactionChain.then(execute, execute);
  // 链条吞掉失败，保证后续事务不受前序失败影响
  transactionChain = result.catch(() => {});
  return result;
}
