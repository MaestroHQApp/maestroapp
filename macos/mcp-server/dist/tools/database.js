/**
 * データベースユーティリティ（better-sqlite3版）
 *
 * WALモードとbusy_timeoutを設定し、Tauriアプリとの同時アクセスを安全に処理
 */
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
// データベース接続のシングルトンキャッシュ
let cachedDb = null;
let cachedDbPath = null;
/**
 * 環境変数からデータベースパスを取得
 */
export function getDatabasePath() {
    let projectsDir;
    if (process.env.MCP_PROJECT_ROOT) {
        const projectRoot = process.env.MCP_PROJECT_ROOT;
        console.error(`[MCP DB] MCP_PROJECT_ROOT: ${projectRoot}`);
        projectsDir = path.dirname(projectRoot);
        console.error(`[MCP DB] Derived projects directory: ${projectsDir}`);
    }
    else {
        console.error('[MCP DB] MCP_PROJECT_ROOT not set, trying to derive from mcp-server location...');
        const mcpServerRoot = path.resolve(__dirname, '..', '..');
        const testacticsRoot = path.resolve(mcpServerRoot, '..');
        console.error(`[MCP DB] Testactics root: ${testacticsRoot}`);
        projectsDir = path.join(testacticsRoot, 'projects');
    }
    const dbPath = path.join(projectsDir, 'testactics.db');
    console.error(`[MCP DB] Looking for database at: ${dbPath}`);
    if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found: ${dbPath}\n` +
            `Projects directory: ${projectsDir}\n` +
            `Working directory: ${process.cwd()}\n` +
            `\nMake sure the database file exists at: {Testacticsルート}/projects/testactics.db`);
    }
    console.error(`[MCP DB] Using database: ${dbPath}`);
    return dbPath;
}
/**
 * データベース接続を取得（WALモード + busy_timeout設定済み）
 *
 * better-sqlite3は同期的なAPIなので、接続を再利用可能
 */
export function getDatabase() {
    const dbPath = getDatabasePath();
    // 同じパスのDBが既にキャッシュされている場合は再利用
    if (cachedDb && cachedDbPath === dbPath) {
        return cachedDb;
    }
    // 新しい接続を作成
    const db = new Database(dbPath);
    // WALモード: 複数プロセスからの同時読み書きを安全に処理
    db.pragma('journal_mode = WAL');
    // busy_timeout: ロック競合時に5秒待機（即座にエラーにしない）
    db.pragma('busy_timeout = 5000');
    // synchronous=NORMAL: WALモードでの推奨設定（パフォーマンスと安全性のバランス）
    db.pragma('synchronous = NORMAL');
    console.error('[MCP DB] Database opened with WAL mode, busy_timeout=5000ms');
    // キャッシュに保存
    cachedDb = db;
    cachedDbPath = dbPath;
    return db;
}
/**
 * データベース接続を閉じる（通常は呼ぶ必要なし）
 */
export function closeDatabase() {
    if (cachedDb) {
        cachedDb.close();
        cachedDb = null;
        cachedDbPath = null;
        console.error('[MCP DB] Database connection closed');
    }
}
/**
 * Tauriアプリにデータベース更新を通知
 */
export function notifyDatabaseUpdate(table = 'unknown') {
    try {
        let projectDir;
        if (process.env.MCP_PROJECT_ROOT) {
            projectDir = process.env.MCP_PROJECT_ROOT;
            console.error(`[MCP DB] Using MCP_PROJECT_ROOT for notification: ${projectDir}`);
        }
        else {
            console.error('[MCP DB] MCP_PROJECT_ROOT not set for notification, skipping...');
            return;
        }
        const eventsDir = path.join(projectDir, '.testactics', 'db-events');
        if (!fs.existsSync(eventsDir)) {
            fs.mkdirSync(eventsDir, { recursive: true });
        }
        const timestamp = Date.now();
        const notificationFile = path.join(eventsDir, `${table}-updated-${timestamp}.json`);
        const notificationData = {
            event: 'db-updated',
            source: 'mcp-server',
            timestamp: new Date().toISOString(),
            table
        };
        fs.writeFileSync(notificationFile, JSON.stringify(notificationData, null, 2));
        console.error(`[MCP DB] Notified Tauri app: ${notificationFile}`);
    }
    catch (error) {
        console.error('[MCP DB] Failed to notify database update:', error.message);
    }
}
/**
 * 現在のローカル日時を取得（SQLite形式）
 */
export function getLocalDateTime() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}
//# sourceMappingURL=database.js.map