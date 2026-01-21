# Maestro - AIエージェントチーム協働アプリケーション

<p align="center">
  <a href="https://www.youtube.com/watch?v=2qgNvVog4os">
    <img src="https://img.youtube.com/vi/2qgNvVog4os/maxresdefault.jpg" alt="Maestro デモ動画" width="600">
  </a>
  <br>
  <em>▶ クリックして動画を再生</em>
</p>

---

## 目次

- [Maestroとは](#maestroとは)
- [主な機能](#主な機能)
- [システム要件](#システム要件)
- [インストール手順](#インストール手順)
- [初回起動時の設定](#初回起動時の設定)
- [基本的な使い方](#基本的な使い方)

---

## Maestroとは

**Maestro**（マエストロ）は、複数のAIエージェント（AI assistants）を1つのチームとして管理・運用できるmacOS向けデスクトップアプリケーションです。

まるでオーケストラの指揮者のように、複数のAIを連携させて、複雑なタスクを効率的に処理できます。

### こんな方におすすめ

- AIを活用した作業を効率化したい方
- 複数のAIに異なる役割を持たせて協働させたい方
- プロジェクト管理とAI活用を組み合わせたい方
- チームでAIを活用したワークフローを構築したい方

---

## 主な機能

### 1. AIエージェントチームの編成

複数のAIエージェントを作成し、それぞれに役割を割り当てることができます。

| 役割 | 説明 |
|------|------|
| **BOSS（リーダー）** | チームを統括し、タスクの割り振りを行います |
| **Worker（作業者）** | 具体的なタスクを実行します |

📸 ここにチーム編成画面のスクリーンショットを挿入

### 2. ミッションモード

AIエージェント間で自動的にタスクをリレーする「ミッションモード」を搭載。

- BOSSがタスクを分解してWorkerに指示
- Workerが完了したらReviewerが確認
- 承認後、BOSSに完了報告

人間の介入なしに、AIチームが自律的に作業を進めます。

📸 ここにミッションモードのワークフロー図を挿入

### 3. リアルタイムコミュニケーション

エージェント間のやり取りをリアルタイムで監視できます。

- 全エージェントの会話履歴を一覧表示
- どのエージェントが何を処理しているか可視化
- 必要に応じて人間が介入可能

📸 ここにコミュニケーション履歴画面のスクリーンショットを挿入

### 4. プロジェクト管理

複数のプロジェクトを作成・管理できます。

- プロジェクトごとにタスクを整理
- 進捗状況の追跡
- 作業履歴の保存

---

## システム要件

### 対応OS

| OS | バージョン | 対応状況 |
|----|----------|---------|
| macOS | 11.0 (Big Sur) 以降 | ✅ 対応 |
| Windows | - | ⏳ 今後対応予定 |
| Linux | - | ⏳ 今後対応予定 |

### ハードウェア要件

| 項目 | 要件 |
|------|------|
| **アーキテクチャ** | Apple Silicon (M1/M2/M3/M4) |
| **ディスク容量** | 約200MB以上の空き容量 |
| **メモリ** | 4GB以上推奨 |

> ⚠️ **注意**: Intel Mac (x64) には現在対応していません。Apple Silicon Mac専用です。

### ソフトウェア要件

| ソフトウェア | 必須/任意 | 説明 |
|-------------|----------|------|
| **Claude CLI** | 必須 | Anthropic社のClaude CLI |
| **Node.js** | 必須 | MCPサーバーの実行に必要（v18以上推奨） |
| **インターネット接続** | 必須 | AI機能の利用に必要 |

### 前提条件

Maestroを使用するには、**Claude CLI**がインストールされている必要があります。

Claude CLIのインストールと設定については、公式ドキュメントをご参照ください：

👉 [Claude CLI 公式ドキュメント](https://docs.anthropic.com/ja/docs/claude-cli)

> ⚠️ **注意**: Claude CLIのインストール、認証、APIキーの設定が完了してからMaestroをご利用ください。

---

## インストール手順

1. **リポジトリをクローン**

   ```bash
   git clone https://github.com/your-repo/maestroapp.git
   cd maestroapp
   ```

2. **MCPサーバーのセットアップ**

   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

3. **アプリを起動**

   `Maestro.app` をダブルクリックして起動します。

---

## フォルダ構成

配布パッケージは以下の構成になっています。**全てのファイル・フォルダを同じディレクトリに配置してください。**

```
maestro/
├── Maestro.app              # メインアプリケーション
├── mcp-server/              # MCPサーバー（必須）
│   ├── dist/                # ビルド済みJavaScript
│   ├── node_modules/        # 依存パッケージ（同梱済み）
│   └── package.json
├── ai_agents.json           # AIエージェント設定
├── ai_templates/            # AIテンプレート
│   └── claude/
│       ├── config.json
│       ├── system_prompts/
│       └── command_templates/
└── workflow_templates.json  # ワークフローテンプレート
```

> ⚠️ **重要**: `Maestro.app`と同じディレクトリに`mcp-server`フォルダ、`ai_agents.json`、`ai_templates`フォルダが存在する必要があります。

---

## MCPサーバーの設定

MaestroはMCPサーバーを使用してAIエージェント間の通信を管理します。

### MCPサーバーについて

- **Node.jsは必要**: `node`コマンドが実行できる環境が必要です
- **アーキテクチャ依存**: 本パッケージはApple Silicon (arm64) 専用です
- **開発環境**: `cd mcp-server && npm install && npm run build` でセットアップ

### Node.jsのインストール確認

ターミナルで以下のコマンドを実行して、Node.jsがインストールされているか確認してください：

```bash
node --version
```

バージョンが表示されればOKです（v18以上推奨）。

インストールされていない場合は、以下からダウンロードしてください：

👉 [Node.js 公式サイト](https://nodejs.org/)

### MCPサーバーの動作確認

以下のコマンドでMCPサーバーが正常に起動できるか確認できます：

```bash
cd /path/to/maestro/mcp-server
node dist/index.js --help
```

> **補足**: 通常、MCPサーバーはMaestroアプリから自動的に起動されるため、手動で起動する必要はありません。
