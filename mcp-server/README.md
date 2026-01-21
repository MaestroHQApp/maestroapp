# Maestro MCP Server

Maestro AI エージェントオーケストレーション用のMCP（Model Context Protocol）サーバー実装です。

## 📁 ディレクトリ構造

```
mcp-server/
├── package.json          # npm設定ファイル
├── tsconfig.json         # TypeScript設定
├── mcp-config.json       # MCP設定ファイル（Claude CLI用）
├── src/
│   └── index.ts          # メインコード
├── dist/                 # ビルド後のJavaScript（自動生成）
│   └── index.js
└── README.md             # このファイル
```

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd mcp-server
npm install
```

### 2. ビルド

```bash
npm run build
```

ビルド後、`dist/index.js` が生成されます。

## 🧪 ローカルClaude CLIでのテスト

### 方法1: mcp-config.jsonを使用（推奨）

**手順:**

1. **MCPサーバーのパスを確認**

```bash
pwd
# 出力例: /path/to/Testactics/mcp-server
```

2. **mcp-config.jsonのパスを絶対パスに更新**

`mcp-config.json` の `args` 配列にある `dist/index.js` を絶対パスに変更：

```json
{
  "mcpServers": {
    "testactics-agent-controller": {
      "command": "node",
      "args": [
        "/path/to/Testactics/mcp-server/dist/index.js"
      ],
      "env": {
        "MCP_API_ENDPOINT": "http://localhost:3003"
      }
    }
  }
}
```

3. **Claude CLIでMCPサーバーを有効化して実行**

```bash
cd /path/to/Testactics/mcp-server

claude --mcp-config mcp-config.json
```

4. **Claudeにツールの利用を確認**

Claudeが起動したら、以下のように質問してください：

```
利用可能なツールを教えてください
```

Claudeの応答に `instruct_agents` と `get_agent_status` が表示されればOKです。

5. **ツールをテスト実行**

```
instruct_agents ツールを使って、worker-001に「テストタスクを実行してください」と指示してください
```

### 方法2: 直接MCPサーバーを起動してテスト

**手順:**

1. **別ターミナルでMCPサーバーを起動**

```bash
cd /path/to/Testactics/mcp-server
node dist/index.js
```

サーバーが起動すると以下のメッセージが表示されます：

```
Testactics MCP Server running on stdio
API Endpoint: http://localhost:3003
```

2. **JSON-RPCリクエストをテスト送信**

別のターミナルで以下を実行（stdioテスト）：

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

期待される出力（ツール一覧が返る）：

```json
{"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

## 🔧 利用可能なツール

### 1. `instruct_agents`

1つ以上のエージェントに作業指示を出します（単一・複数両対応）。

**パラメータ:**

```typescript
{
  instructions: [
    {
      agent_id: string,      // エージェントID（例: worker-001）
      instruction: string,   // 指示内容
      priority?: string      // 優先度（high/normal/low）デフォルト: normal
    },
    ...
  ]
}
```

**使用例（単一指示）:**

```json
{
  "instructions": [
    {
      "agent_id": "worker-001",
      "instruction": "ERPDEV-2255のタイトルを最適化してください",
      "priority": "high"
    }
  ]
}
```

**使用例（複数指示・並列実行）:**

```json
{
  "instructions": [
    {
      "agent_id": "worker-001",
      "instruction": "バッチ1を実行してください"
    },
    {
      "agent_id": "worker-002",
      "instruction": "バッチ2を実行してください"
    }
  ]
}
```

### 2. `get_agent_status`

エージェントの現在の状態を取得します。

**パラメータ:**

```typescript
{
  agent_id: string  // 状態を確認するエージェントのID
}
```

**使用例:**

```json
{
  "agent_id": "worker-001"
}
```

## 📋 Claude CLIでの実行例

### 例1: 単一エージェントへの指示

```bash
claude --mcp-config mcp-config.json
```

Claudeへの入力：

```
worker-001 に「共有ディレクトリの test.txt を読み込んで、内容を要約してください」と指示してください。
```

### 例2: 複数エージェントへの同時指示

```
instruct_agents ツールを使って、以下の指示を同時に実行してください：
1. worker-001: タスクAを実行
2. worker-002: タスクBを実行
3. worker-003: タスクCを実行
```

### 例3: エージェント状態確認

```
worker-001 の状態を確認してください
```

## 🐛 デバッグモード

MCPサーバーは、Tauri APIに接続できない場合でも**デモモード**として動作します。

**デモモードでの動作:**

- ツール呼び出しは受け付けますが、実際の指示は送信されません
- エラーメッセージに接続情報が表示されます
- Claude CLIでツールの動作確認が可能です

**デモモード出力例:**

```
⚠️ デモモード: 1件の指示を受信しました

（注意: Tauri APIに接続できませんでした。実際の指示は送信されていません）

1. エージェント: worker-001
   優先度: normal
   指示: テストタスクを実行してください

📝 デバッグ情報:
- API Endpoint: http://localhost:3003
- Error: fetch failed

Tauri アプリケーションが起動しているか確認してください。
```

## 🔗 環境変数

MCPサーバーは以下の環境変数をサポートしています：

| 環境変数 | デフォルト値 | 説明 |
|---------|------------|------|
| `MCP_API_ENDPOINT` | `http://localhost:3003` | Tauri APIエンドポイント |
| `MCP_LOG_DIR` | - | ログディレクトリ（将来の拡張用） |
| `MCP_WORK_DIR` | - | ワークディレクトリ（将来の拡張用） |
| `MCP_DELIVERABLES_DIR` | - | 成果物ディレクトリ（将来の拡張用） |

環境変数は `mcp-config.json` の `env` セクションで設定できます。

## 📝 開発

### ウォッチモード

開発中は以下のコマンドでTypeScriptの自動再コンパイルが可能です：

```bash
npm run dev
```

ファイルを変更すると自動的に `dist/` にビルドされます。

### クリーンビルド

```bash
npm run clean   # dist/ を削除
npm run build   # 再ビルド
```

## 🎯 次のステップ

1. **Tauri統合**: Tauri側にMCP APIサーバーを実装
2. **ログ監視機能**: ワーカー完了通知の実装
3. **BOSS再起動機構**: 完了検知後の自動再起動
4. **メタデータ管理**: タスクメタデータの保存・取得

詳細は `docs/MCP_ARCHITECTURE_PROPOSAL.md` を参照してください。

## 📚 関連資料

- [MCP公式ドキュメント](https://docs.claude.com/en/docs/mcp)
- [MCP SDK for TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Testactics MCPアーキテクチャ提案](../docs/MCP_ARCHITECTURE_PROPOSAL.md)

## ⚠️ トラブルシューティング

### 1. `Cannot find module '@modelcontextprotocol/sdk'`

**原因**: 依存関係がインストールされていない

**解決策**:
```bash
npm install
npm run build
```

### 2. Claude CLIで「ツールが見つからない」

**原因**: mcp-config.json のパスが間違っている

**解決策**:
- mcp-config.json の `args` を絶対パスに変更
- `node dist/index.js` が正常に動作するか確認

### 3. `Tauri API error: fetch failed`

**原因**: Tauri アプリケーションが起動していない

**解決策**:
- デモモードとして動作するため、ツールのテストは可能
- Tauriアプリを起動すれば実際の指示送信が可能になります

---

**作成日**: 2025-01-14
**バージョン**: 1.0.0
**メンテナ**: Testactics Team
