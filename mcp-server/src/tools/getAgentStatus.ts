import * as fs from 'fs';
import * as path from 'path';

interface GetAgentStatusParams {
  agent_id: string;
}

interface AgentMetadata {
  agent_id: string;
  agent_name: string;
  agent_role: string;
  created_at: string;
  last_active: string;
  total_tasks_completed: number;
  total_tasks_failed: number;
  current_status: 'idle' | 'processing' | 'error';
  additional_args?: string;
  system_prompt_template?: string;
}

/**
 * ファイルベースのエージェント状態取得ツール
 *
 * アーキテクチャ:
 * - agents/{agent-id}/metadata.json から状態を読み取り
 * - agents/{agent-id}/.processing ファイルの存在で実行中判定
 * - queue_status.json から実行中タスク数を取得
 */
export async function getAgentStatus(params: GetAgentStatusParams) {
  // MCP_AGENTS_DIRはTauriから設定される（必須）
  const baseDir = process.env.MCP_AGENTS_DIR;
  if (!baseDir) {
    return {
      success: false,
      message: '❌ MCP_AGENTS_DIR environment variable is not set',
      agent_id: params.agent_id,
      exists: false,
    };
  }
  const agentDir = path.join(baseDir, params.agent_id);

  console.error(`[MCP] getAgentStatus: ${params.agent_id}`);

  try {
    // 1. Check if agent directory exists
    if (!fs.existsSync(agentDir)) {
      return {
        success: false,
        message: `❌ Agent "${params.agent_id}" not found.\n\nDirectory: ${agentDir}`,
        agent_id: params.agent_id,
        exists: false,
      };
    }

    // 2. metadata.json を読み込み
    const metadataPath = path.join(agentDir, 'metadata.json');
    let metadata: AgentMetadata | null = null;

    if (fs.existsSync(metadataPath)) {
      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    }

    // 3. .processing ファイルで実行中判定
    const processingPath = path.join(agentDir, '.processing');
    const isProcessing = fs.existsSync(processingPath);

    let processingInfo = null;
    if (isProcessing) {
      try {
        const processingContent = fs.readFileSync(processingPath, 'utf-8');
        processingInfo = JSON.parse(processingContent);
      } catch (e) {
        // .processingファイルが破損している場合
        processingInfo = { error: 'Invalid .processing file' };
      }
    }

    // 4. input/output/ ディレクトリのファイル数をカウント
    const inputDir = path.join(agentDir, 'input');
    const outputDir = path.join(agentDir, 'output');

    let pendingInputCount = 0;
    let completedOutputCount = 0;

    if (fs.existsSync(inputDir)) {
      // input/ 配下のすべてのサブディレクトリのファイル数をカウント
      const inputSubdirs = fs.readdirSync(inputDir);
      for (const subdir of inputSubdirs) {
        const subdirPath = path.join(inputDir, subdir);
        if (fs.statSync(subdirPath).isDirectory()) {
          const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.json'));
          pendingInputCount += files.length;
        }
      }
    }

    if (fs.existsSync(outputDir)) {
      // output/ 配下のすべてのサブディレクトリのファイル数をカウント
      const outputSubdirs = fs.readdirSync(outputDir);
      for (const subdir of outputSubdirs) {
        const subdirPath = path.join(outputDir, subdir);
        if (fs.statSync(subdirPath).isDirectory()) {
          const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.json'));
          completedOutputCount += files.length;
        }
      }
    }

    // 5. queue_status.json から実行中タスク数を取得
    const queueStatusPath = path.join(baseDir, 'queue_status.json');
    let inProgressCount = 0;

    if (fs.existsSync(queueStatusPath)) {
      try {
        const queueContent = fs.readFileSync(queueStatusPath, 'utf-8');
        const queueStatus = JSON.parse(queueContent);

        // agent_id でフィルタして in_progress ステータスのタスクをカウント
        inProgressCount = Object.values(queueStatus.tasks || {})
          .filter((task: any) => task.agent_id === params.agent_id && task.status === 'in_progress')
          .length;
      } catch (e) {
        console.error('[MCP] Failed to parse queue_status.json:', e);
      }
    }

    // Build result message
    let message = `📊 Agent "${params.agent_id}" Status:\n\n`;

    if (metadata) {
      message += `**Basic Info:**\n`;
      message += `- Name: ${metadata.agent_name}\n`;
      message += `- Role: ${metadata.agent_role}\n`;
      message += `- Created: ${metadata.created_at}\n`;
      message += `- Last Active: ${metadata.last_active}\n\n`;

      message += `**Task Statistics:**\n`;
      message += `- Completed Tasks: ${metadata.total_tasks_completed}\n`;
      message += `- Failed Tasks: ${metadata.total_tasks_failed}\n\n`;
    }

    message += `**Current State:**\n`;
    message += `- Status: ${isProcessing ? '⏳ Processing' : '✅ Idle'}\n`;
    message += `- Pending Inputs: ${pendingInputCount}\n`;
    message += `- Completed Outputs: ${completedOutputCount}\n`;
    message += `- In Progress Tasks: ${inProgressCount}\n\n`;

    if (isProcessing && processingInfo) {
      message += `**Processing Details:**\n`;
      message += `- Prompt ID: ${processingInfo.prompt_id || 'N/A'}\n`;
      message += `- Input File: ${processingInfo.input_file || 'N/A'}\n`;
      message += `- Started At: ${processingInfo.started_at || 'N/A'}\n`;
      message += `- Process ID: ${processingInfo.pid || 'N/A'}\n`;
    }

    return {
      success: true,
      message,
      agent_id: params.agent_id,
      exists: true,
      metadata,
      is_processing: isProcessing,
      processing_info: processingInfo,
      stats: {
        pending_input_count: pendingInputCount,
        completed_output_count: completedOutputCount,
        in_progress_count: inProgressCount,
      },
    };
  } catch (error: any) {
    console.error(`[MCP] Error getting agent status:`, error);

    return {
      success: false,
      message: `❌ Error getting agent status:\n\n${error.message}`,
      agent_id: params.agent_id,
      error: error.message,
    };
  }
}
