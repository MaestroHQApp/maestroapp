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
export declare function getAgentStatus(params: GetAgentStatusParams): Promise<{
    success: boolean;
    message: string;
    agent_id: string;
    exists: boolean;
    metadata?: undefined;
    is_processing?: undefined;
    processing_info?: undefined;
    stats?: undefined;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    agent_id: string;
    exists: boolean;
    metadata: AgentMetadata | null;
    is_processing: boolean;
    processing_info: any;
    stats: {
        pending_input_count: number;
        completed_output_count: number;
        in_progress_count: number;
    };
    error?: undefined;
} | {
    success: boolean;
    message: string;
    agent_id: string;
    error: any;
    exists?: undefined;
    metadata?: undefined;
    is_processing?: undefined;
    processing_info?: undefined;
    stats?: undefined;
}>;
export {};
//# sourceMappingURL=getAgentStatus.d.ts.map