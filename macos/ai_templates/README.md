# AIテンプレートシステム

## 概要

AIテンプレートシステムは、システムプロンプトとAI CLI実行コマンドをテンプレートファイルとして外部化し、プログラムを編集せずにカスタマイズできる仕組みです。

## ディレクトリ構造

```
ai_templates/
├── README.md                    # このファイル
├── claude/                      # Claude専用テンプレート
│   ├── config.json              # Claude CLI設定
│   ├── system_prompts/          # システムプロンプトテンプレート
│   │   ├── base.txt             # 基本テンプレート
│   │   ├── boss.txt             # BOSSエージェント用
│   │   ├── worker.txt           # ワーカーエージェント用
│   │   ├── reviewer.txt         # レビュアーエージェント用
│   │   └── specialist.txt       # スペシャリスト用
│   └── command_templates/       # コマンドテンプレート
│       └── default.json         # デフォルトコマンド構成
├── gemini/                      # Gemini専用テンプレート（将来対応）
└── chatgpt/                     # ChatGPT専用テンプレート（将来対応）
```

## テンプレートの編集

### システムプロンプトテンプレート

システムプロンプトは **Handlebars形式** で記述されています。

#### 利用可能な変数

| 変数 | 説明 | 例 |
|------|------|-----|
| `{{agent.name}}` | エージェント名 | "BOSS" |
| `{{agent.description}}` | エージェントの説明 | "プロジェクト全体を統括" |
| `{{agent.id}}` | エージェントID | "boss-001" |
| `{{agent.requiredDocuments}}` | 必読ドキュメント一覧（配列） | ["CLAUDE.md", "docs/ARCHITECTURE.md"] |
| `{{role.displayName}}` | 役割の表示名 | "BOSS" |
| `{{context.missionMode}}` | ミッションモード有効か | true/false |
| `{{workers}}` | ワーカーエージェント一覧 | 配列 |
| `{{fromAgent}}` | 指示元エージェント | オブジェクト |
| `{{reviewer}}` | レビュアーエージェント | オブジェクト |
| `{{additionalInstructions}}` | 追加指示 | 文字列 |

#### 必読ドキュメントの使用例

`requiredDocuments` はエージェントがタスク開始前に確認すべきドキュメントのパス一覧です。

```handlebars
{{#if agent.requiredDocuments}}
## 📖 必読ドキュメント

以下のドキュメントを確認してください：
{{#each agent.requiredDocuments}}
- `{{this}}`
{{/each}}
{{/if}}
```

**ai_agents.json での設定例:**

```json
{
  "id": "agent-react-specialist",
  "name": "React専門家",
  "requiredDocuments": [
    "CLAUDE.md",
    "docs/SQLITE_PROCESSING_FLOW.md",
    "docs/FILE_BASED_AGENT_ARCHITECTURE.md"
  ],
  ...
}
```

#### Handlebars構文

##### 条件分岐

```handlebars
{{#if workers}}
あなたが指示を出せるワーカーエージェント:
{{/if}}
```

##### 配列のループ

```handlebars
{{#each workers}}
- {{name}} (ID: {{id}}): {{description}}
{{/each}}
```

##### 論理演算

```handlebars
{{#if (and context.missionMode fromAgent)}}
ミッションモードで、指示元エージェントがいます。
{{/if}}
```

#### テンプレートのカスタマイズ例

**boss.txt をカスタマイズ:**

```handlebars
あなたは「{{agent.name}}」という名前の{{role.displayName}}エージェントです。
あなたの役割: {{agent.description}}

{{#if workers}}
あなたが管理するチーム:
{{#each workers}}
- 🔧 {{name}} (ID: {{id}})
  役割: {{description}}
{{/each}}

【重要】指示を出すときは以下のJSON形式で出力してください:
{
  "to": "エージェントID",
  "response": "具体的な指示内容"
}

【ルール】
1. 明確で具体的な指示を心がけてください
2. 一度に複数のワーカーに指示を出す場合は、JSONを複数出力してください
3. 作業の優先順位を明確にしてください
{{/if}}

{{#if additionalInstructions}}

{{additionalInstructions}}
{{/if}}
```

### プロバイダー設定

`config.json` でAI CLIの設定を定義します。

#### 設定項目

```json
{
  "provider": "claude",
  "displayName": "Claude Code",
  "version": "1.0.0",
  "cliCommand": "claude",
  "defaultArgs": [
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages"
  ],
  "sessionSupport": true,
  "sessionArg": "--resume",
  "systemPromptArg": "--system-prompt",
  "features": {
    "streaming": true,
    "thinking": true,
    "multiTurn": true
  },
  "outputParsing": {
    "format": "stream-json",
    "eventTypes": ["system", "stream_event", "thinking", "assistant", "result"]
  }
}
```

### コマンドテンプレート

`command_templates/default.json` でCLI引数の構築順序と設定を定義します。

#### コマンド構造

```json
{
  "commandStructure": {
    "order": [
      "sessionArgs",
      "formatArgs",
      "systemPromptArgs",
      "agentArgs",
      "customArgs",
      "prompt"
    ],
    "sessionArgs": {
      "enabled": true,
      "args": ["--resume", "{{sessionId}}"],
      "requiredCondition": "sessionId"
    },
    "formatArgs": {
      "enabled": true,
      "args": ["--output-format", "stream-json", "--verbose", "--include-partial-messages"]
    },
    "systemPromptArgs": {
      "enabled": true,
      "args": ["--system-prompt", "{{systemPrompt}}"],
      "requiredCondition": "systemPrompt"
    },
    "agentArgs": {
      "enabled": true,
      "source": "agent.additionalArgs",
      "splitBy": " "
    },
    "customArgs": {
      "enabled": true,
      "source": "params.additionalArgs"
    },
    "prompt": {
      "enabled": true,
      "source": "params.command"
    }
  }
}
```

## 新しいプロバイダーの追加

### 1. プロバイダーディレクトリを作成

```bash
mkdir -p ai_templates/gemini/system_prompts
mkdir -p ai_templates/gemini/command_templates
```

### 2. config.jsonを作成

```json
{
  "provider": "gemini",
  "displayName": "Google Gemini",
  "version": "1.0.0",
  "cliCommand": "gemini",
  "defaultArgs": ["--format", "json"],
  "sessionSupport": true,
  "sessionArg": "--continue",
  "systemPromptArg": "--system",
  "features": {
    "streaming": true,
    "thinking": false,
    "multiTurn": true
  },
  "outputParsing": {
    "format": "json",
    "eventTypes": ["response", "done"]
  }
}
```

### 3. システムプロンプトテンプレートを作成

base.txt、boss.txt、worker.txt などを作成（Claude版をコピーして調整）

### 4. コマンドテンプレートを作成

command_templates/default.json を作成

### 5. エージェント設定で使用

ai_agents.json で aiProvider フィールドを設定:

```json
{
  "id": "gemini-boss",
  "name": "Gemini BOSS",
  "role": "boss",
  "aiProvider": "gemini",
  ...
}
```

## トラブルシューティング

### テンプレートが読み込めない

**原因**: ファイルパスが間違っているか、ファイルが存在しない

**解決方法**:
1. ファイルが正しい場所に配置されているか確認
2. ブラウザコンソールでエラーメッセージを確認
3. テンプレートファイルの文法エラーを確認

### システムプロンプトが反映されない

**原因**: Handlebars構文エラーまたは変数名の間違い

**解決方法**:
1. Handlebarsのif/eachブロックが正しく閉じられているか確認
2. 変数名のスペルを確認（`{{agent.name}}`など）
3. ブラウザコンソールでエラーログを確認

### プロバイダーが認識されない

**原因**: config.jsonが存在しないか、形式が間違っている

**解決方法**:
1. `ai_templates/[provider]/config.json` が存在するか確認
2. JSONの文法エラーがないか確認（カンマ、括弧など）
3. アプリケーションを再起動

## ベストプラクティス

1. **バックアップ**: テンプレートを編集する前に必ずバックアップを取る
2. **段階的変更**: 大きな変更は一度に行わず、少しずつテスト
3. **コメント**: テンプレート内にコメントを残す（Handlebarsは `{{! コメント }}` をサポート）
4. **バージョン管理**: Gitでテンプレートの変更履歴を管理
5. **共有**: 効果的なテンプレートはチームで共有

## 関連ドキュメント

- [Handlebars公式ドキュメント](https://handlebarsjs.com/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
