/**
 * データベースユーティリティ（better-sqlite3版）
 *
 * WALモードとbusy_timeoutを設定し、Tauriアプリとの同時アクセスを安全に処理
 */
import Database from 'better-sqlite3';
/**
 * 環境変数からデータベースパスを取得
 */
export declare function getDatabasePath(): string;
/**
 * データベース接続を取得（WALモード + busy_timeout設定済み）
 *
 * better-sqlite3は同期的なAPIなので、接続を再利用可能
 */
export declare function getDatabase(): Database.Database;
/**
 * データベース接続を閉じる（通常は呼ぶ必要なし）
 */
export declare function closeDatabase(): void;
/**
 * Tauriアプリにデータベース更新を通知
 */
export declare function notifyDatabaseUpdate(table?: string): void;
/**
 * 現在のローカル日時を取得（SQLite形式）
 */
export declare function getLocalDateTime(): string;
//# sourceMappingURL=database.d.ts.map