import * as fs from 'fs';
import * as path from 'path';
/**
 * ファイルベースのエージェント指示ツール
 *
 * アーキテクチャ:
 * - MCPサーバーはファイル書き込みのみを行う
 * - projects/{project-name}/tasks/{task-id}/agents/{agent-id}/input/from-{source}/ に指示ファイルを作成
 * - Tauriファイル監視がinput/ファイルを検知してClaude CLI実行
 */
export async function instructAgents(params) {
    // 新アーキテクチャ: MCP_PROJECT_ROOTから基準パスを構築
    const projectRoot = process.env.MCP_PROJECT_ROOT;
    const projectName = process.env.MCP_PROJECT_NAME;
    const taskId = process.env.MCP_TASK_ID;
    if (!projectRoot) {
        throw new Error('MCP_PROJECT_ROOT environment variable is not set');
    }
    if (!taskId) {
        throw new Error('MCP_TASK_ID environment variable is not set');
    }
    // MCPサーバー経由の指示は、実行エージェント（通常はBOSS）が依頼元となる
    const fromSource = process.env.MCP_EXECUTING_AGENT || 'user';
    // 🔍 デバッグ: 環境変数の値を確認
    console.error(`[MCP] instructAgents: ${params.instructions.length} instruction(s) from ${fromSource}`);
    console.error(`[MCP] 🔍 MCP_PROJECT_ROOT: ${projectRoot}`);
    console.error(`[MCP] 🔍 MCP_PROJECT_NAME: ${projectName}`);
    console.error(`[MCP] 🔍 MCP_TASK_ID: ${taskId}`);
    const createdFiles = [];
    const errors = [];
    for (const instruction of params.instructions) {
        try {
            // 🔍 デバッグ: 各変数の値を確認
            console.error(`[MCP] Processing instruction for agent: ${instruction.agent_id}`);
            console.error(`[MCP] 🔍 projectRoot type: ${typeof projectRoot}, value: ${projectRoot}`);
            console.error(`[MCP] 🔍 taskId type: ${typeof taskId}, value: ${taskId}`);
            console.error(`[MCP] 🔍 instruction.agent_id type: ${typeof instruction.agent_id}, value: ${instruction.agent_id}`);
            console.error(`[MCP] 🔍 fromSource type: ${typeof fromSource}, value: ${fromSource}`);
            // 新ディレクトリ構造: {projectRoot}/tasks/{taskId}/agents/{agentId}/input/from-{source}/
            const agentDir = path.join(projectRoot, 'tasks', taskId, 'agents', instruction.agent_id);
            console.error(`[MCP] 🔍 agentDir: ${agentDir}`);
            const inputDir = path.join(agentDir, 'input', `from-${fromSource}`);
            console.error(`[MCP] 🔍 inputDir: ${inputDir}`);
            // ディレクトリが存在しない場合は作成
            if (!fs.existsSync(inputDir)) {
                fs.mkdirSync(inputDir, { recursive: true });
                console.error(`[MCP] Created directory: ${inputDir}`);
            }
            // タイムスタンプ生成（ミリ秒）
            const timestamp = Date.now();
            // ファイル名: {timestamp}.json
            const filename = `${timestamp}.json`;
            const filepath = path.join(inputDir, filename);
            // JSONエントリを作成
            const entry = {
                id: `prompt-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                from: fromSource,
                prompt: instruction.instruction,
                priority: instruction.priority || 'normal',
                status: 'pending',
            };
            // ファイルに書き込み
            fs.writeFileSync(filepath, JSON.stringify(entry, null, 2));
            console.error(`[MCP] Created instruction file: ${instruction.agent_id}/input/from-${fromSource}/${filename}`);
            createdFiles.push(`${instruction.agent_id}/input/from-${fromSource}/${filename}`);
            // 同時実行を避けるため、少し待機
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        catch (error) {
            console.error(`[MCP] Failed to create instruction for ${instruction.agent_id}:`, error.message);
            errors.push({
                agent_id: instruction.agent_id,
                error: error.message
            });
        }
    }
    // 結果メッセージを生成
    let message = '';
    if (createdFiles.length > 0) {
        message += `✅ Sent ${createdFiles.length} instruction(s) (async execution)\n\n`;
        params.instructions.forEach((inst, index) => {
            if (createdFiles.some(f => f.includes(inst.agent_id))) {
                message += `${index + 1}. Agent: ${inst.agent_id}\n`;
                message += `   Priority: ${inst.priority || 'normal'}\n`;
                message += `   Instruction: ${inst.instruction}\n\n`;
            }
        });
        message += `Tasks will be executed in separate processes. Please wait for completion notifications.`;
    }
    if (errors.length > 0) {
        message += `\n\n⚠️ ${errors.length} error(s) occurred:\n\n`;
        errors.forEach((err, index) => {
            message += `${index + 1}. Agent: ${err.agent_id}\n`;
            message += `   Error: ${err.error}\n\n`;
        });
    }
    return {
        success: createdFiles.length > 0,
        message,
        queued_count: createdFiles.length,
        error_count: errors.length,
        created_files: createdFiles,
        errors,
    };
}
//# sourceMappingURL=instructAgents.js.map