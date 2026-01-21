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

import { getDatabase, notifyDatabaseUpdate, getLocalDateTime } from './database.js';

// タスクのステータス型
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
 * tasksテーブルに必要なカラムを追加（マイグレーション）
 */
function ensureTaskColumns(): void {
  try {
    const db = getDatabase();
    const columns = db.pragma('table_info(tasks)') as { name: string }[];
    const columnNames = columns.map(c => c.name);

    const newColumns: { name: string; type: string; default?: string }[] = [
      { name: 'parent_task_id', type: 'TEXT' },
      { name: 'task_level', type: 'INTEGER', default: '0' },
      { name: 'sort_order', type: 'INTEGER', default: '0' },
      { name: 'dependencies', type: 'TEXT' },
      { name: 'priority', type: 'INTEGER', default: '3' },
      { name: 'estimated_start', type: 'DATETIME' },
      { name: 'estimated_end', type: 'DATETIME' },
      { name: 'actual_start', type: 'DATETIME' },
      { name: 'actual_end', type: 'DATETIME' },
      { name: 'estimated_hours', type: 'REAL' },
      { name: 'actual_hours', type: 'REAL' },
      { name: 'progress', type: 'INTEGER', default: '0' },
      { name: 'assigned_agent_id', type: 'TEXT' },
      { name: 'completed_at', type: 'DATETIME' },
    ];

    for (const col of newColumns) {
      if (!columnNames.includes(col.name)) {
        const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
        db.exec(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}${defaultClause}`);
        console.error(`[MCP Task] Added column: ${col.name}`);
      }
    }
  } catch (error: any) {
    console.error(`[MCP Task] Column migration warning: ${error.message}`);
  }
}

/**
 * UUIDを生成
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 親タスクのtask_levelを取得
 */
function getParentTaskLevel(parentTaskId: string): number {
  const db = getDatabase();
  const row = db.prepare('SELECT task_level FROM tasks WHERE task_id = ?').get(parentTaskId) as { task_level: number } | undefined;
  return row?.task_level ?? -1;
}

/**
 * 次のsort_orderを取得
 */
function getNextSortOrder(projectId: string, parentTaskId: string | null): number {
  const db = getDatabase();
  let row: { max_order: number | null } | undefined;

  if (parentTaskId) {
    row = db.prepare('SELECT MAX(sort_order) as max_order FROM tasks WHERE project_id = ? AND parent_task_id = ?')
      .get(projectId, parentTaskId) as { max_order: number | null } | undefined;
  } else {
    row = db.prepare('SELECT MAX(sort_order) as max_order FROM tasks WHERE project_id = ? AND (parent_task_id IS NULL OR parent_task_id = "")')
      .get(projectId) as { max_order: number | null } | undefined;
  }

  return (row?.max_order ?? -1) + 1;
}

/**
 * タスク新規作成
 */
export async function createTask(params: CreateTaskParams) {
  console.error(`[MCP Task] Creating task: ${params.name}`);

  try {
    const db = getDatabase();
    ensureTaskColumns();

    const taskId = params.task_id || generateTaskId();
    const dependenciesJson = params.dependencies?.length
      ? JSON.stringify(params.dependencies)
      : null;

    const now = getLocalDateTime();

    let taskLevel = 0;
    if (params.parent_task_id) {
      const parentLevel = getParentTaskLevel(params.parent_task_id);
      taskLevel = parentLevel + 1;
      console.error(`[MCP Task] Parent task_id: ${params.parent_task_id}, parent_level: ${parentLevel}, new task_level: ${taskLevel}`);
    }

    const sortOrder = getNextSortOrder(params.project_id, params.parent_task_id || null);

    const stmt = db.prepare(`
      INSERT INTO tasks (
        project_id, task_id, name, description, status,
        parent_task_id, task_level, sort_order,
        dependencies, priority,
        estimated_start, estimated_end, estimated_hours,
        assigned_agent_id, progress, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const result = stmt.run(
      params.project_id,
      taskId,
      params.name,
      params.description || null,
      params.parent_task_id || null,
      taskLevel,
      sortOrder,
      dependenciesJson,
      params.priority ?? 3,
      params.estimated_start || null,
      params.estimated_end || null,
      params.estimated_hours || null,
      params.assigned_agent_id || null,
      now,
      now
    );

    const id = result.lastInsertRowid as number;

    notifyDatabaseUpdate('tasks');

    let message = `✅ Task Created\n\n`;
    message += `ID: ${id}\n`;
    message += `Task ID: ${taskId}\n`;
    message += `Name: ${params.name}\n`;
    message += `Project: ${params.project_id}`;
    if (params.description) message += `\nDescription: ${params.description}`;
    if (params.parent_task_id) message += `\nParent Task ID: ${params.parent_task_id} (level: ${taskLevel})`;
    if (params.assigned_agent_id) message += `\nAssigned Agent: ${params.assigned_agent_id}`;
    if (params.priority) message += `\nPriority: ${params.priority}`;
    if (params.estimated_hours) message += `\nEstimated: ${params.estimated_hours}h`;
    if (params.estimated_start || params.estimated_end) {
      message += `\nSchedule: ${params.estimated_start || '-'} ~ ${params.estimated_end || '-'}`;
    }
    if (params.dependencies?.length) {
      message += `\nDependencies: ${params.dependencies.join(', ')}`;
    }

    return {
      success: true,
      message,
      id,
      task_id: taskId,
    };
  } catch (error: any) {
    console.error(`[MCP Task] Failed to create task:`, error);
    return {
      success: false,
      message: `❌ Task Creation Error: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * タスク更新
 */
export async function updateTask(params: UpdateTaskParams) {
  if (!params.id && !params.task_id) {
    return {
      success: false,
      message: '❌ Either id or task_id is required',
    };
  }

  console.error(`[MCP Task] Updating task: ${params.id || params.task_id}`);

  try {
    const db = getDatabase();

    const updates: string[] = [];
    const values: any[] = [];

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
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
    if (params.parent_task_id !== undefined) {
      updates.push('parent_task_id = ?');
      values.push(params.parent_task_id || null);
    }
    if (params.dependencies !== undefined) {
      updates.push('dependencies = ?');
      values.push(params.dependencies?.length ? JSON.stringify(params.dependencies) : null);
    }
    if (params.priority !== undefined) {
      updates.push('priority = ?');
      values.push(params.priority);
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
    if (params.progress !== undefined) {
      updates.push('progress = ?');
      values.push(params.progress);
    }
    if (params.assigned_agent_id !== undefined) {
      updates.push('assigned_agent_id = ?');
      values.push(params.assigned_agent_id || null);
    }

    updates.push('updated_at = ?');
    values.push(getLocalDateTime());

    if (updates.length === 1) {
      return {
        success: false,
        message: '❌ No fields to update',
      };
    }

    let whereClause: string;
    if (params.id) {
      whereClause = 'id = ?';
      values.push(params.id);
    } else {
      whereClause = 'task_id = ?';
      values.push(params.task_id);
    }

    const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE ${whereClause}`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return {
        success: false,
        message: `❌ Task not found: ${params.id || params.task_id}`,
      };
    }

    notifyDatabaseUpdate('tasks');

    let message = `✅ Task Updated\n\n`;
    message += `Identifier: ${params.id || params.task_id}`;
    if (params.name) message += `\nName: ${params.name}`;
    if (params.status) message += `\nStatus: ${params.status}`;
    if (params.assigned_agent_id !== undefined) message += `\nAssigned: ${params.assigned_agent_id || '(unassigned)'}`;
    if (params.parent_task_id !== undefined) message += `\nParent Task ID: ${params.parent_task_id || '(none)'}`;
    if (params.progress !== undefined) message += `\nProgress: ${params.progress}%`;
    if (params.priority !== undefined) message += `\nPriority: ${params.priority}`;

    return {
      success: true,
      message,
    };
  } catch (error: any) {
    console.error(`[MCP Task] Failed to update task:`, error);
    return {
      success: false,
      message: `❌ Task Update Error: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * タスク一覧取得
 */
export async function getTasks(params: GetTasksParams = {}) {
  console.error(`[MCP Task] Getting tasks (project_id: ${params.project_id || 'all'}, status: ${params.status || 'all'})`);

  try {
    const db = getDatabase();
    ensureTaskColumns();

    const conditions: string[] = [];
    const values: any[] = [];

    if (params.project_id) {
      conditions.push('project_id = ?');
      values.push(params.project_id);
    }
    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.parent_task_id !== undefined) {
      if (params.parent_task_id === null || params.parent_task_id === '' || params.parent_task_id === 'null') {
        conditions.push('(parent_task_id IS NULL OR parent_task_id = "")');
      } else {
        conditions.push('parent_task_id = ?');
        values.push(params.parent_task_id);
      }
    }
    if (params.assigned_agent_id) {
      conditions.push('assigned_agent_id = ?');
      values.push(params.assigned_agent_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = params.limit ? `LIMIT ${params.limit}` : '';

    const query = `
      SELECT *
      FROM tasks
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      ${limitClause}
    `;

    const tasks = db.prepare(query).all(...values) as Task[];

    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        message: '📋 No tasks found',
        tasks: [],
        count: 0,
      };
    }

    let message = `📋 Task List (${tasks.length} items)\n\n`;

    tasks.forEach((task, index) => {
      const statusEmoji = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        cancelled: '❌',
      }[task.status || 'pending'];

      message += `${index + 1}. [${statusEmoji} ${task.status}] ${task.name}\n`;
      message += `   ID: ${task.id} | Task ID: ${task.task_id}`;
      if (task.priority) message += ` | Priority: ${task.priority}`;
      if (task.assigned_agent_id) message += `\n   Assigned: ${task.assigned_agent_id}`;
      if (task.progress !== undefined && task.progress !== null) message += ` | Progress: ${task.progress}%`;
      if (task.parent_task_id) message += `\n   Parent: ${task.parent_task_id} (level: ${task.task_level ?? 0})`;
      if (task.dependencies) {
        try {
          const deps = JSON.parse(task.dependencies);
          if (deps.length > 0) message += `\n   Dependencies: ${deps.join(', ')}`;
        } catch (e) { /* ignore */ }
      }
      if (task.description) message += `\n   Description: ${task.description}`;
      message += '\n\n';
    });

    return {
      success: true,
      message,
      tasks,
      count: tasks.length,
    };
  } catch (error: any) {
    console.error(`[MCP Task] Failed to get tasks:`, error);
    return {
      success: false,
      message: `❌ Task Fetch Error: ${error.message}`,
      error: error.message,
      tasks: [],
      count: 0,
    };
  }
}

/**
 * タスク完了
 */
export async function completeTask(params: CompleteTaskParams) {
  if (!params.id && !params.task_id) {
    return {
      success: false,
      message: '❌ Either id or task_id is required',
    };
  }

  console.error(`[MCP Task] Completing task: ${params.id || params.task_id}`);

  try {
    const db = getDatabase();
    const now = getLocalDateTime();

    let whereClause: string;
    const values = [now, now];

    if (params.id) {
      whereClause = 'id = ?';
      values.push(params.id as any);
    } else {
      whereClause = 'task_id = ?';
      values.push(params.task_id as any);
    }

    const stmt = db.prepare(`
      UPDATE tasks
      SET status = 'completed',
          completed_at = ?,
          progress = 100,
          updated_at = ?
      WHERE ${whereClause}
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return {
        success: false,
        message: `❌ Task not found: ${params.id || params.task_id}`,
      };
    }

    notifyDatabaseUpdate('tasks');

    return {
      success: true,
      message: `✅ Task Marked Complete\n\nIdentifier: ${params.id || params.task_id}`,
    };
  } catch (error: any) {
    console.error(`[MCP Task] Failed to complete task:`, error);
    return {
      success: false,
      message: `❌ Task Complete Error: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * タスク削除
 */
export async function deleteTask(params: DeleteTaskParams) {
  if (!params.id && !params.task_id) {
    return {
      success: false,
      message: '❌ Either id or task_id is required',
    };
  }

  console.error(`[MCP Task] Deleting task: ${params.id || params.task_id}`);

  try {
    const db = getDatabase();

    let whereClause: string;
    const values: any[] = [];

    if (params.id) {
      whereClause = 'id = ?';
      values.push(params.id);
    } else {
      whereClause = 'task_id = ?';
      values.push(params.task_id);
    }

    const stmt = db.prepare(`DELETE FROM tasks WHERE ${whereClause}`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return {
        success: false,
        message: `❌ Task not found: ${params.id || params.task_id}`,
      };
    }

    notifyDatabaseUpdate('tasks');

    return {
      success: true,
      message: `✅ Task Deleted\n\nIdentifier: ${params.id || params.task_id}`,
    };
  } catch (error: any) {
    console.error(`[MCP Task] Failed to delete task:`, error);
    return {
      success: false,
      message: `❌ Task Delete Error: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * サブタスク一覧取得
 */
export async function getSubTasks(parentTaskId: string) {
  console.error(`[MCP Task] Getting subtasks for parent: ${parentTaskId}`);
  return getTasks({ parent_task_id: parentTaskId });
}

/**
 * 依存タスクの状態チェック
 */
export async function checkDependencies(taskIdOrId: string | number) {
  console.error(`[MCP Task] Checking dependencies for: ${taskIdOrId}`);

  try {
    const db = getDatabase();

    let task: Task | undefined;
    if (typeof taskIdOrId === 'number') {
      task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskIdOrId) as Task | undefined;
    } else {
      task = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskIdOrId) as Task | undefined;
    }

    if (!task) {
      return {
        success: false,
        message: `❌ Task not found: ${taskIdOrId}`,
        canStart: false,
      };
    }

    if (!task.dependencies) {
      return {
        success: true,
        message: '✅ No dependencies - task can start',
        canStart: true,
        dependencies: [],
      };
    }

    const depTaskIds = JSON.parse(task.dependencies) as string[];
    const placeholders = depTaskIds.map(() => '?').join(',');
    const depTasks = db.prepare(
      `SELECT task_id, name, status FROM tasks WHERE task_id IN (${placeholders})`
    ).all(...depTaskIds) as { task_id: string; name: string; status: string }[];

    const blockers = depTasks.filter(t => t.status !== 'completed');
    const canStart = blockers.length === 0;

    let message = canStart
      ? '✅ All dependencies completed - task can start\n\n'
      : '⚠️ Blocked by incomplete dependencies\n\n';

    message += 'Dependencies:\n';
    depTasks.forEach(t => {
      const emoji = t.status === 'completed' ? '✅' : '🚫';
      message += `  ${emoji} ${t.task_id}: ${t.name} (${t.status})\n`;
    });

    return {
      success: true,
      message,
      canStart,
      dependencies: depTasks,
      blockers: blockers.map(t => t.task_id),
    };
  } catch (error: any) {
    console.error(`[MCP Task] Failed to check dependencies:`, error);
    return {
      success: false,
      message: `❌ Dependency Check Error: ${error.message}`,
      canStart: false,
      error: error.message,
    };
  }
}
