/**
 * タスク管理ツール（SQLite直接アクセス版 - better-sqlite3使用）
 *
 * Testacticsプロジェクトのデータベースに直接アクセスしてタスク管理を行う
 * データベースパス: projects/testactics.db
 *
 * 階層構造: プロジェクト > タスク > TODO
 * - タスクは親子関係（parent_task_id: string）を持てる
 *   ※ parent_task_idは親タスクのtask_id文字列を格納
 * - タスク間の依存関係（dependencies）を設定可能
 * - task_level: 階層レベル（0=メイン, 1=サブ, 2=サブサブ...）
 */
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
interface Task {
    id?: number;
    project_id: string;
    task_id: string;
    name: string;
    description?: string;
    status?: TaskStatus;
    parent_task_id?: string;
    task_level?: number;
    sort_order?: number;
    dependencies?: string;
    priority?: number;
    estimated_start?: string;
    estimated_end?: string;
    actual_start?: string;
    actual_end?: string;
    estimated_hours?: number;
    actual_hours?: number;
    progress?: number;
    assigned_agent_id?: string;
    created_at?: string;
    updated_at?: string;
    completed_at?: string;
}
interface CreateTaskParams {
    project_id: string;
    task_id?: string;
    name: string;
    description?: string;
    parent_task_id?: string;
    dependencies?: string[];
    priority?: number;
    estimated_start?: string;
    estimated_end?: string;
    estimated_hours?: number;
    assigned_agent_id?: string;
}
interface UpdateTaskParams {
    id?: number;
    task_id?: string;
    name?: string;
    description?: string;
    status?: TaskStatus;
    parent_task_id?: string;
    dependencies?: string[];
    priority?: number;
    estimated_start?: string;
    estimated_end?: string;
    actual_start?: string;
    actual_end?: string;
    estimated_hours?: number;
    actual_hours?: number;
    progress?: number;
    assigned_agent_id?: string;
}
interface GetTasksParams {
    project_id?: string;
    status?: TaskStatus;
    parent_task_id?: string;
    assigned_agent_id?: string;
    limit?: number;
}
interface CompleteTaskParams {
    id?: number;
    task_id?: string;
}
interface DeleteTaskParams {
    id?: number;
    task_id?: string;
}
/**
 * タスク新規作成
 */
export declare function createTask(params: CreateTaskParams): Promise<{
    success: boolean;
    message: string;
    id: number;
    task_id: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
    id?: undefined;
    task_id?: undefined;
}>;
/**
 * タスク更新
 */
export declare function updateTask(params: UpdateTaskParams): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
}>;
/**
 * タスク一覧取得
 */
export declare function getTasks(params?: GetTasksParams): Promise<{
    success: boolean;
    message: string;
    tasks: Task[];
    count: number;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
    tasks: never[];
    count: number;
}>;
/**
 * タスク完了
 */
export declare function completeTask(params: CompleteTaskParams): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
}>;
/**
 * タスク削除
 */
export declare function deleteTask(params: DeleteTaskParams): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
}>;
/**
 * サブタスク一覧取得
 */
export declare function getSubTasks(parentTaskId: string): Promise<{
    success: boolean;
    message: string;
    tasks: Task[];
    count: number;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
    tasks: never[];
    count: number;
}>;
/**
 * 依存タスクの状態チェック
 */
export declare function checkDependencies(taskIdOrId: string | number): Promise<{
    success: boolean;
    message: string;
    canStart: boolean;
    dependencies?: undefined;
    blockers?: undefined;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    canStart: boolean;
    dependencies: never[];
    blockers?: undefined;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    canStart: boolean;
    dependencies: {
        task_id: string;
        name: string;
        status: string;
    }[];
    blockers: string[];
    error?: undefined;
} | {
    success: boolean;
    message: string;
    canStart: boolean;
    error: any;
    dependencies?: undefined;
    blockers?: undefined;
}>;
export {};
//# sourceMappingURL=taskManager.d.ts.map