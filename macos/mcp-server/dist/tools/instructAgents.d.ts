interface InstructAgentsParams {
    instructions: Array<{
        agent_id: string;
        instruction: string;
        priority?: 'high' | 'normal' | 'low';
    }>;
}
/**
 * ファイルベースのエージェント指示ツール
 *
 * アーキテクチャ:
 * - MCPサーバーはファイル書き込みのみを行う
 * - projects/{project-name}/tasks/{task-id}/agents/{agent-id}/input/from-{source}/ に指示ファイルを作成
 * - Tauriファイル監視がinput/ファイルを検知してClaude CLI実行
 */
export declare function instructAgents(params: InstructAgentsParams): Promise<{
    success: boolean;
    message: string;
    queued_count: number;
    error_count: number;
    created_files: string[];
    errors: {
        agent_id: string;
        error: string;
    }[];
}>;
export {};
//# sourceMappingURL=instructAgents.d.ts.map