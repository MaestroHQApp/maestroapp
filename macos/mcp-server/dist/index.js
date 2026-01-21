#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { instructAgents } from "./tools/instructAgents.js";
import { getAgentStatus } from "./tools/getAgentStatus.js";
import { createTodo, updateTodo, getTodos, completeTodo } from "./tools/todoManager.js";
import { createTask, updateTask, getTasks, completeTask, deleteTask, checkDependencies } from "./tools/taskManager.js";
// 基本ツール定義（ファイルベース）
const BASE_TOOLS = [
    {
        name: "instruct_agents",
        description: "1つ以上のエージェントに作業指示を出す（単一・複数両対応）- ファイルベース実装",
        inputSchema: {
            type: "object",
            properties: {
                instructions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            agent_id: {
                                type: "string",
                                description: "エージェントのID（例: worker-001, reviewer-001）"
                            },
                            instruction: {
                                type: "string",
                                description: "具体的な作業指示内容"
                            },
                            priority: {
                                type: "string",
                                enum: ["high", "normal", "low"],
                                description: "優先度（デフォルト: normal）"
                            }
                        },
                        required: ["agent_id", "instruction"]
                    },
                    description: "指示のリスト（単一の場合も配列で指定）",
                    minItems: 1
                }
            },
            required: ["instructions"]
        }
    },
    {
        name: "get_agent_status",
        description: "指定したエージェントの現在の状態を取得する - ファイルベース実装",
        inputSchema: {
            type: "object",
            properties: {
                agent_id: {
                    type: "string",
                    description: "状態を確認するエージェントのID"
                }
            },
            required: ["agent_id"]
        }
    }
];
// TODO関連ツール（better-sqlite3が利用可能な場合のみ）
const TODO_TOOLS = [
    {
        name: "create_todo",
        description: "新しいTODOを作成する（WBS/ガントチャート対応）",
        inputSchema: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "TODOのタイトル"
                },
                description: {
                    type: "string",
                    description: "TODOの説明（オプション）"
                },
                agent_id: {
                    type: "string",
                    description: "担当エージェントID（オプション）"
                },
                priority: {
                    type: "number",
                    description: "優先度（1-5、デフォルト: 3）"
                },
                parent_id: {
                    type: "number",
                    description: "親TODOのID（サブタスクの場合）"
                },
                project_id: {
                    type: "string",
                    description: "プロジェクトID（システムプロンプトで提供される値を使用）"
                },
                task_id: {
                    type: "string",
                    description: "タスクID（システムプロンプトで提供される値を使用）"
                },
                // WBS/ガントチャート用フィールド
                progress: {
                    type: "number",
                    description: "進捗率（0-100、デフォルト: 0）"
                },
                estimated_start: {
                    type: "string",
                    description: "予定開始日時（ISO 8601形式、例: 2025-12-12T09:00:00）"
                },
                estimated_end: {
                    type: "string",
                    description: "予定終了日時（ISO 8601形式、例: 2025-12-12T12:00:00）"
                },
                estimated_hours: {
                    type: "number",
                    description: "見積工数（時間、例: 3.5）"
                },
                phase: {
                    type: "string",
                    description: "フェーズ名（例: 設計フェーズ、実装フェーズ）"
                },
                dependencies: {
                    type: "array",
                    items: { type: "number" },
                    description: "依存するTODOのIDリスト（例: [1, 2, 3]）"
                }
            },
            required: ["title"]
        }
    },
    {
        name: "update_todo",
        description: "既存のTODOを更新する（WBS/ガントチャート対応）",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "更新するTODOのID"
                },
                title: {
                    type: "string",
                    description: "新しいタイトル（オプション）"
                },
                description: {
                    type: "string",
                    description: "新しい説明（オプション）"
                },
                status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed", "cancelled"],
                    description: "新しいステータス（オプション）"
                },
                priority: {
                    type: "number",
                    description: "新しい優先度（オプション）"
                },
                agent_id: {
                    type: "string",
                    description: "担当エージェントID（オプション）"
                },
                parent_id: {
                    type: "number",
                    description: "親TODOのID（オプション）"
                },
                // WBS/ガントチャート用フィールド
                progress: {
                    type: "number",
                    description: "進捗率（0-100）"
                },
                estimated_start: {
                    type: "string",
                    description: "予定開始日時（ISO 8601形式、例: 2025-12-12T09:00:00）"
                },
                estimated_end: {
                    type: "string",
                    description: "予定終了日時（ISO 8601形式、例: 2025-12-12T12:00:00）"
                },
                actual_start: {
                    type: "string",
                    description: "実績開始日時（ISO 8601形式）"
                },
                actual_end: {
                    type: "string",
                    description: "実績終了日時（ISO 8601形式）"
                },
                estimated_hours: {
                    type: "number",
                    description: "見積工数（時間、例: 3.5）"
                },
                actual_hours: {
                    type: "number",
                    description: "実績工数（時間）"
                },
                phase: {
                    type: "string",
                    description: "フェーズ名（例: 設計フェーズ、実装フェーズ）"
                },
                dependencies: {
                    type: "array",
                    items: { type: "number" },
                    description: "依存するTODOのIDリスト（例: [1, 2, 3]）"
                }
            },
            required: ["id"]
        }
    },
    {
        name: "get_todos",
        description: "TODO一覧を取得する",
        inputSchema: {
            type: "object",
            properties: {
                agent_id: {
                    type: "string",
                    description: "フィルタリングするエージェントID（オプション）"
                },
                status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed", "cancelled"],
                    description: "フィルタリングするステータス（オプション）"
                },
                limit: {
                    type: "number",
                    description: "取得する最大件数（オプション）"
                },
                project_id: {
                    type: "string",
                    description: "フィルタリングするプロジェクトID（オプション）"
                },
                task_id: {
                    type: "string",
                    description: "フィルタリングするタスクID（オプション）"
                }
            }
        }
    },
    {
        name: "complete_todo",
        description: "TODOを完了としてマークする",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "完了するTODOのID"
                }
            },
            required: ["id"]
        }
    }
];
// タスク管理ツール（プロジェクト > タスク > TODO 階層のタスクレベル）
const TASK_TOOLS = [
    {
        name: "create_task",
        description: "新しいタスクを作成する（親子関係・依存関係対応）。階層構造: プロジェクト > タスク > TODO",
        inputSchema: {
            type: "object",
            properties: {
                project_id: {
                    type: "string",
                    description: "プロジェクトID（必須）"
                },
                task_id: {
                    type: "string",
                    description: "タスクID（オプション、未指定時は自動生成）"
                },
                name: {
                    type: "string",
                    description: "タスク名（必須）"
                },
                description: {
                    type: "string",
                    description: "タスクの説明（オプション）"
                },
                parent_task_id: {
                    type: "string",
                    description: "親タスクのtask_id文字列（サブタスクの場合、オプション）"
                },
                dependencies: {
                    type: "array",
                    items: { type: "string" },
                    description: "依存するタスクのtask_idリスト（例: ['task-abc', 'task-xyz']）"
                },
                priority: {
                    type: "number",
                    description: "優先度（1-5、デフォルト: 3）"
                },
                estimated_start: {
                    type: "string",
                    description: "予定開始日時（ISO 8601形式、例: 2025-01-15T09:00:00）"
                },
                estimated_end: {
                    type: "string",
                    description: "予定終了日時（ISO 8601形式）"
                },
                estimated_hours: {
                    type: "number",
                    description: "見積工数（時間）"
                },
                assigned_agent_id: {
                    type: "string",
                    description: "担当エージェントID（オプション）"
                }
            },
            required: ["project_id", "name"]
        }
    },
    {
        name: "update_task",
        description: "既存のタスクを更新する（idまたはtask_idで指定）",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "タスクの数値ID（idまたはtask_idのいずれかが必須）"
                },
                task_id: {
                    type: "string",
                    description: "タスクID文字列（idまたはtask_idのいずれかが必須）"
                },
                name: {
                    type: "string",
                    description: "新しいタスク名（オプション）"
                },
                description: {
                    type: "string",
                    description: "新しい説明（オプション）"
                },
                status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed", "cancelled"],
                    description: "新しいステータス（オプション）"
                },
                parent_task_id: {
                    type: "string",
                    description: "親タスクのtask_id文字列（オプション）"
                },
                dependencies: {
                    type: "array",
                    items: { type: "string" },
                    description: "依存するタスクのtask_idリスト（オプション）"
                },
                priority: {
                    type: "number",
                    description: "優先度（1-5）"
                },
                estimated_start: {
                    type: "string",
                    description: "予定開始日時（ISO 8601形式）"
                },
                estimated_end: {
                    type: "string",
                    description: "予定終了日時（ISO 8601形式）"
                },
                actual_start: {
                    type: "string",
                    description: "実績開始日時（ISO 8601形式）"
                },
                actual_end: {
                    type: "string",
                    description: "実績終了日時（ISO 8601形式）"
                },
                estimated_hours: {
                    type: "number",
                    description: "見積工数（時間）"
                },
                actual_hours: {
                    type: "number",
                    description: "実績工数（時間）"
                },
                progress: {
                    type: "number",
                    description: "進捗率（0-100）"
                },
                assigned_agent_id: {
                    type: "string",
                    description: "担当エージェントID"
                }
            }
        }
    },
    {
        name: "get_tasks",
        description: "タスク一覧を取得する（フィルタリング対応）",
        inputSchema: {
            type: "object",
            properties: {
                project_id: {
                    type: "string",
                    description: "フィルタリングするプロジェクトID（オプション）"
                },
                status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed", "cancelled"],
                    description: "フィルタリングするステータス（オプション）"
                },
                parent_task_id: {
                    type: "string",
                    description: "親タスクのtask_id文字列（サブタスクをフィルタ、空文字でルートタスクのみ）"
                },
                assigned_agent_id: {
                    type: "string",
                    description: "担当エージェントIDでフィルタリング（オプション）"
                },
                limit: {
                    type: "number",
                    description: "取得する最大件数（オプション）"
                }
            }
        }
    },
    {
        name: "complete_task",
        description: "タスクを完了としてマークする（idまたはtask_idで指定）",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "タスクの数値ID（idまたはtask_idのいずれかが必須）"
                },
                task_id: {
                    type: "string",
                    description: "タスクID文字列（idまたはtask_idのいずれかが必須）"
                }
            }
        }
    },
    {
        name: "delete_task",
        description: "タスクを削除する（idまたはtask_idで指定）",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "タスクの数値ID（idまたはtask_idのいずれかが必須）"
                },
                task_id: {
                    type: "string",
                    description: "タスクID文字列（idまたはtask_idのいずれかが必須）"
                }
            }
        }
    },
    {
        name: "check_task_dependencies",
        description: "タスクの依存関係をチェックし、開始可能か確認する",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "タスクの数値ID（idまたはtask_idのいずれかが必須）"
                },
                task_id: {
                    type: "string",
                    description: "タスクID文字列（idまたはtask_idのいずれかが必須）"
                }
            }
        }
    }
];
// 全ツールを統合
const TOOLS = [...BASE_TOOLS, ...TODO_TOOLS, ...TASK_TOOLS];
// サーバー初期化
const server = new Server({
    name: "testactics-agent-controller",
    version: "2.0.0" // ファイルベース版
}, {
    capabilities: {
        tools: {}
    }
});
// ツール一覧
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        // 引数の型チェック
        if (!args || typeof args !== 'object') {
            throw new Error('Invalid arguments: expected object');
        }
        switch (name) {
            case "instruct_agents":
                return await handleInstructAgents(args);
            case "get_agent_status":
                return await handleGetAgentStatus(args);
            case "create_todo":
                return await handleCreateTodo(args);
            case "update_todo":
                return await handleUpdateTodo(args);
            case "get_todos":
                return await handleGetTodos(args);
            case "complete_todo":
                return await handleCompleteTodo(args);
            // タスク管理ツール
            case "create_task":
                return await handleCreateTask(args);
            case "update_task":
                return await handleUpdateTask(args);
            case "get_tasks":
                return await handleGetTasks(args);
            case "complete_task":
                return await handleCompleteTask(args);
            case "delete_task":
                return await handleDeleteTask(args);
            case "check_task_dependencies":
                return await handleCheckTaskDependencies(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        return {
            content: [
                {
                    type: "text",
                    text: `Error occurred: ${errorMessage}${errorStack ? `\n\nStack trace:\n${errorStack}` : ''}`
                }
            ],
            isError: true
        };
    }
});
// ファイルベース実装: instruct_agents
async function handleInstructAgents(args) {
    try {
        const result = await instructAgents(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ]
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("[MCP] Failed to instruct agents:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error sending agent instructions:\n\n${errorMessage}${errorStack ? `\n\nStack trace:\n${errorStack}` : ''}`
                }
            ],
            isError: true
        };
    }
}
// ファイルベース実装: get_agent_status
async function handleGetAgentStatus(args) {
    try {
        const result = await getAgentStatus(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ]
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("[MCP] Failed to get agent status:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error getting agent status:\n\n${errorMessage}${errorStack ? `\n\nStack trace:\n${errorStack}` : ''}`
                }
            ],
            isError: true
        };
    }
}
// TODO管理: create_todo
async function handleCreateTodo(args) {
    try {
        const result = await createTodo(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to create todo:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error creating TODO: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// TODO管理: update_todo
async function handleUpdateTodo(args) {
    try {
        const result = await updateTodo(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to update todo:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error updating TODO: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// TODO管理: get_todos
async function handleGetTodos(args) {
    try {
        const result = await getTodos(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to get todos:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error getting TODOs: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// TODO管理: complete_todo
async function handleCompleteTodo(args) {
    try {
        const result = await completeTodo(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to complete todo:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error completing TODO: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// タスク管理: create_task
async function handleCreateTask(args) {
    try {
        const result = await createTask(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to create task:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error creating Task: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// タスク管理: update_task
async function handleUpdateTask(args) {
    try {
        const result = await updateTask(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to update task:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error updating Task: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// タスク管理: get_tasks
async function handleGetTasks(args) {
    try {
        const result = await getTasks(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to get tasks:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error getting Tasks: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// タスク管理: complete_task
async function handleCompleteTask(args) {
    try {
        const result = await completeTask(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to complete task:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error completing Task: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// タスク管理: delete_task
async function handleDeleteTask(args) {
    try {
        const result = await deleteTask(args);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to delete task:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error deleting Task: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// タスク管理: check_task_dependencies
async function handleCheckTaskDependencies(args) {
    try {
        const taskIdOrId = args.id || args.task_id;
        if (!taskIdOrId) {
            return {
                content: [
                    {
                        type: "text",
                        text: "❌ Either id or task_id is required"
                    }
                ],
                isError: true
            };
        }
        const result = await checkDependencies(taskIdOrId);
        return {
            content: [
                {
                    type: "text",
                    text: result.message
                }
            ],
            isError: !result.success
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[MCP] Failed to check task dependencies:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error checking Task dependencies: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
// サーバー起動
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // MCP_AGENTS_DIRはTauriから設定される（必須）
    // フォールバックなしで、設定されていない場合はエラーメッセージを表示
    const agentsDir = process.env.MCP_AGENTS_DIR || '(not set - MCP_AGENTS_DIR required)';
    const executingAgent = process.env.MCP_EXECUTING_AGENT || 'user';
    const projectRoot = process.env.MCP_PROJECT_ROOT;
    const projectName = process.env.MCP_PROJECT_NAME;
    const cwd = process.cwd();
    console.error("========================================");
    console.error("Testactics MCP Server v2.0.0 (File-based)");
    console.error("========================================");
    console.error(`Mode: File-based agent communication`);
    console.error(`Agents Directory: ${agentsDir}`);
    console.error(`Executing Agent: ${executingAgent}`);
    console.error(`Working Directory: ${cwd}`);
    console.error(`MCP_PROJECT_ROOT: ${projectRoot || '(not set)'}`);
    console.error(`MCP_PROJECT_NAME: ${projectName || '(not set)'}`);
    console.error("========================================");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map