/**
 * TODO管理ツール（SQLite直接アクセス版 - better-sqlite3使用）
 *
 * Testacticsプロジェクトのデータベースに直接アクセスしてTODO管理を行う
 * データベースパス: projects/testactics.db
 */
import { getDatabase, notifyDatabaseUpdate, getLocalDateTime } from './database.js';
/**
 * project_idとtask_idを取得
 */
function getProjectAndTaskIds(paramProjectId, paramTaskId) {
    const projectId = paramProjectId || null;
    const taskId = paramTaskId || null;
    console.error(`[MCP TODO] Project ID: ${projectId || 'not provided'}`);
    console.error(`[MCP TODO] Task ID: ${taskId || 'not provided'}`);
    if (!projectId) {
        console.error(`[MCP TODO] Warning: project_id not provided.`);
    }
    if (!taskId) {
        console.error(`[MCP TODO] Warning: task_id not provided.`);
    }
    return { projectId, taskId };
}
/**
 * TODO新規作成
 */
export async function createTodo(params) {
    console.error(`[MCP TODO] Creating todo: ${params.title}`);
    try {
        const db = getDatabase();
        const { projectId, taskId } = getProjectAndTaskIds(params.project_id, params.task_id);
        const dependenciesJson = params.dependencies?.length
            ? JSON.stringify(params.dependencies)
            : null;
        const now = getLocalDateTime();
        const stmt = db.prepare(`
      INSERT INTO todos (
        project_id, task_id, agent_id, title, description, status, priority, parent_id,
        progress, estimated_start, estimated_end, estimated_hours, phase, dependencies,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(projectId, taskId, params.agent_id || null, params.title, params.description || null, params.priority ?? 3, params.parent_id || null, params.progress ?? 0, params.estimated_start || null, params.estimated_end || null, params.estimated_hours || null, params.phase || null, dependenciesJson, now, now);
        const todoId = result.lastInsertRowid;
        notifyDatabaseUpdate('todos');
        let message = `✅ TODO Created\n\nID: ${todoId}\nTitle: ${params.title}`;
        if (params.description)
            message += `\nDescription: ${params.description}`;
        if (params.agent_id)
            message += `\nAgent: ${params.agent_id}`;
        if (params.phase)
            message += `\nPhase: ${params.phase}`;
        if (params.estimated_hours)
            message += `\nEstimated: ${params.estimated_hours}h`;
        if (params.estimated_start || params.estimated_end) {
            message += `\nSchedule: ${params.estimated_start || '-'} ~ ${params.estimated_end || '-'}`;
        }
        if (params.dependencies?.length) {
            message += `\nDependencies: ${params.dependencies.map(id => `#${id}`).join(', ')}`;
        }
        return {
            success: true,
            message,
            todo_id: todoId,
        };
    }
    catch (error) {
        console.error(`[MCP TODO] Failed to create todo:`, error);
        return {
            success: false,
            message: `❌ TODO Creation Error: ${error.message}`,
            error: error.message,
        };
    }
}
/**
 * TODO更新
 */
export async function updateTodo(params) {
    console.error(`[MCP TODO] Updating todo #${params.id}`);
    try {
        const db = getDatabase();
        const updates = [];
        const values = [];
        if (params.title !== undefined) {
            updates.push('title = ?');
            values.push(params.title);
        }
        if (params.description !== undefined) {
            updates.push('description = ?');
            values.push(params.description);
        }
        if (params.status !== undefined) {
            updates.push('status = ?');
            values.push(params.status);
            if (params.status === 'completed') {
                updates.push('completed_at = ?');
                values.push(getLocalDateTime());
            }
            if (params.status === 'in_progress' && !params.actual_start) {
                updates.push('actual_start = COALESCE(actual_start, ?)');
                values.push(getLocalDateTime());
            }
        }
        if (params.priority !== undefined) {
            updates.push('priority = ?');
            values.push(params.priority);
        }
        if (params.agent_id !== undefined) {
            updates.push('agent_id = ?');
            values.push(params.agent_id || null);
        }
        if (params.parent_id !== undefined) {
            updates.push('parent_id = ?');
            values.push(params.parent_id || null);
        }
        // WBS/ガントチャート用フィールド
        if (params.progress !== undefined) {
            updates.push('progress = ?');
            values.push(params.progress);
        }
        if (params.estimated_start !== undefined) {
            updates.push('estimated_start = ?');
            values.push(params.estimated_start || null);
        }
        if (params.estimated_end !== undefined) {
            updates.push('estimated_end = ?');
            values.push(params.estimated_end || null);
        }
        if (params.actual_start !== undefined) {
            updates.push('actual_start = ?');
            values.push(params.actual_start || null);
        }
        if (params.actual_end !== undefined) {
            updates.push('actual_end = ?');
            values.push(params.actual_end || null);
        }
        if (params.estimated_hours !== undefined) {
            updates.push('estimated_hours = ?');
            values.push(params.estimated_hours || null);
        }
        if (params.actual_hours !== undefined) {
            updates.push('actual_hours = ?');
            values.push(params.actual_hours || null);
        }
        if (params.phase !== undefined) {
            updates.push('phase = ?');
            values.push(params.phase || null);
        }
        if (params.dependencies !== undefined) {
            updates.push('dependencies = ?');
            values.push(params.dependencies?.length ? JSON.stringify(params.dependencies) : null);
        }
        updates.push('updated_at = ?');
        values.push(getLocalDateTime());
        if (updates.length === 1) {
            return {
                success: false,
                message: `❌ No fields to update`,
            };
        }
        values.push(params.id);
        const stmt = db.prepare(`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`);
        const result = stmt.run(...values);
        if (result.changes === 0) {
            return {
                success: false,
                message: `❌ TODO with ID ${params.id} not found`,
            };
        }
        notifyDatabaseUpdate('todos');
        let message = `✅ TODO Updated\n\nID: ${params.id}`;
        if (params.title)
            message += `\nTitle: ${params.title}`;
        if (params.status)
            message += `\nStatus: ${params.status}`;
        if (params.agent_id !== undefined)
            message += `\nAssignee: ${params.agent_id || '(unassigned)'}`;
        if (params.parent_id !== undefined)
            message += `\nParent: ${params.parent_id || '(none)'}`;
        if (params.progress !== undefined)
            message += `\nProgress: ${params.progress}%`;
        if (params.phase)
            message += `\nPhase: ${params.phase}`;
        if (params.estimated_hours !== undefined)
            message += `\nEstimated: ${params.estimated_hours}h`;
        if (params.actual_hours !== undefined)
            message += `\nActual: ${params.actual_hours}h`;
        return {
            success: true,
            message,
        };
    }
    catch (error) {
        console.error(`[MCP TODO] Failed to update todo:`, error);
        return {
            success: false,
            message: `❌ TODO Update Error: ${error.message}`,
            error: error.message,
        };
    }
}
/**
 * TODO一覧取得
 */
export async function getTodos(params = {}) {
    console.error(`[MCP TODO] Getting todos (agent_id: ${params.agent_id || 'all'}, status: ${params.status || 'all'}, project_id: ${params.project_id || 'all'}, task_id: ${params.task_id || 'all'})`);
    try {
        const db = getDatabase();
        const conditions = [];
        const values = [];
        if (params.project_id) {
            conditions.push('project_id = ?');
            values.push(params.project_id);
        }
        if (params.task_id) {
            conditions.push('task_id = ?');
            values.push(params.task_id);
        }
        if (params.agent_id) {
            conditions.push('agent_id = ?');
            values.push(params.agent_id);
        }
        if (params.status) {
            conditions.push('status = ?');
            values.push(params.status);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = params.limit ? `LIMIT ${params.limit}` : '';
        const query = `
      SELECT *
      FROM todos
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      ${limitClause}
    `;
        const todos = db.prepare(query).all(...values);
        if (!todos || todos.length === 0) {
            return {
                success: true,
                message: '📋 No TODOs found',
                todos: [],
                count: 0,
            };
        }
        let message = `📋 TODO List (${todos.length} items)\n\n`;
        todos.forEach((todo, index) => {
            const statusEmoji = {
                pending: '⏳',
                in_progress: '🔄',
                completed: '✅',
                cancelled: '❌',
            }[todo.status || 'pending'];
            message += `${index + 1}. [${statusEmoji} ${todo.status}] ${todo.title}\n`;
            message += `   ID: ${todo.id}`;
            if (todo.agent_id)
                message += ` | Agent: ${todo.agent_id}`;
            if (todo.priority)
                message += ` | Priority: ${todo.priority}`;
            if (todo.description)
                message += `\n   Description: ${todo.description}`;
            message += '\n\n';
        });
        return {
            success: true,
            message,
            todos,
            count: todos.length,
        };
    }
    catch (error) {
        console.error(`[MCP TODO] Failed to get todos:`, error);
        return {
            success: false,
            message: `❌ TODO Fetch Error: ${error.message}`,
            error: error.message,
            todos: [],
            count: 0,
        };
    }
}
/**
 * TODO完了
 */
export async function completeTodo(params) {
    console.error(`[MCP TODO] Completing todo #${params.id}`);
    try {
        const db = getDatabase();
        const now = getLocalDateTime();
        const stmt = db.prepare(`
      UPDATE todos
      SET status = 'completed',
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `);
        const result = stmt.run(now, now, params.id);
        if (result.changes === 0) {
            return {
                success: false,
                message: `❌ TODO with ID ${params.id} not found`,
            };
        }
        notifyDatabaseUpdate('todos');
        return {
            success: true,
            message: `✅ TODO Marked Complete\n\nID: ${params.id}`,
        };
    }
    catch (error) {
        console.error(`[MCP TODO] Failed to complete todo:`, error);
        return {
            success: false,
            message: `❌ TODO Complete Error: ${error.message}`,
            error: error.message,
        };
    }
}
//# sourceMappingURL=todoManager.js.map