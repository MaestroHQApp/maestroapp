/**
 * TODO管理ツール（SQLite直接アクセス版 - better-sqlite3使用）
 *
 * Testacticsプロジェクトのデータベースに直接アクセスしてTODO管理を行う
 * データベースパス: projects/testactics.db
 */
interface Todo {
    id?: number;
    project_id?: string;
    task_id?: string;
    agent_id?: string;
    title: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: number;
    parent_id?: number;
    created_at?: string;
    updated_at?: string;
    completed_at?: string;
    progress?: number;
    estimated_start?: string;
    estimated_end?: string;
    actual_start?: string;
    actual_end?: string;
    estimated_hours?: number;
    actual_hours?: number;
    phase?: string;
    dependencies?: string;
}
interface CreateTodoParams {
    title: string;
    description?: string;
    agent_id?: string;
    priority?: number;
    parent_id?: number;
    project_id?: string;
    task_id?: string;
    progress?: number;
    estimated_start?: string;
    estimated_end?: string;
    estimated_hours?: number;
    phase?: string;
    dependencies?: number[];
}
interface UpdateTodoParams {
    id: number;
    title?: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: number;
    agent_id?: string;
    parent_id?: number;
    progress?: number;
    estimated_start?: string;
    estimated_end?: string;
    actual_start?: string;
    actual_end?: string;
    estimated_hours?: number;
    actual_hours?: number;
    phase?: string;
    dependencies?: number[];
}
interface GetTodosParams {
    agent_id?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    limit?: number;
    project_id?: string;
    task_id?: string;
}
interface CompleteTodoParams {
    id: number;
}
/**
 * TODO新規作成
 */
export declare function createTodo(params: CreateTodoParams): Promise<{
    success: boolean;
    message: string;
    todo_id: number;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
    todo_id?: undefined;
}>;
/**
 * TODO更新
 */
export declare function updateTodo(params: UpdateTodoParams): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
}>;
/**
 * TODO一覧取得
 */
export declare function getTodos(params?: GetTodosParams): Promise<{
    success: boolean;
    message: string;
    todos: Todo[];
    count: number;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
    todos: never[];
    count: number;
}>;
/**
 * TODO完了
 */
export declare function completeTodo(params: CompleteTodoParams): Promise<{
    success: boolean;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    error: any;
}>;
export {};
//# sourceMappingURL=todoManager.d.ts.map