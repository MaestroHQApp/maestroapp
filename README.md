# Maestro - AI Orchestration App

<p align="center">
  <strong>English</strong> | <a href="./README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=2qgNvVog4os">
    <img src="https://img.youtube.com/vi/2qgNvVog4os/maxresdefault.jpg" alt="Maestro Demo Video" width="600">
  </a>
  <br>
  <em>▶ Click to play video</em>
</p>

---

## Table of Contents
- [Getting Started](#getting-started)
- [What is Maestro?](#what-is-maestro)
- [Security & Privacy](#security--privacy)
- [Key Features](#key-features)
- [System Requirements](#system-requirements)
- [Folder Structure](#folder-structure)
- [MCP Server Setup](#mcp-server-setup)

---

## Getting Started

1. **Clone the repository (or download as zip)**

   ```bash
   git clone https://github.com/MaestroHQApp/maestroapp.git
   cd maestroapp
   ```

2. **Set up the MCP server**

   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

3. **Launch the app**

   Double-click `Maestro.app` to launch.

4. **Select a directory**

   ![Select Directory](images/GetStarted_selectdir.png)

5. **Create a task**

   ![Create Task](images/GetStarted_task.png)

6. **Give instructions to BOSS AI**

   Run the following prompt to experience all of Maestro's capabilities:

   ```
   Please discuss AI usage in 2026. Create multiple agents to participate in the discussion. Please act as the MC (Moderator) and lead the discussion. Include agents representing experts from various fields and the general public. Have each of them participate and state their opinions. Register a Team Memo and TODOs for this task, and then start the discussion.
   ```

   ![Instruct BOSS AI](images/GetStarted_toboss.png)

---

## What is Maestro?

**Maestro** is a macOS desktop application that enables you to manage and operate multiple AI agents (AI assistants) as a unified team.

Like an orchestra conductor, Maestro coordinates multiple AIs to efficiently handle complex tasks.

### Who is this for?

- Those who want to streamline AI-powered workflows
- Those who want multiple AIs with different roles working together
- Those who want to combine project management with AI capabilities
- Teams building AI-powered collaborative workflows

---

## Security & Privacy

Maestro is designed with user privacy and security as top priorities.

| Item | Description |
|------|-------------|
| **Data Transmission** | The Maestro app itself does not perform any network communication |
| **AI Communication** | All AI communication goes through Claude CLI (Claude Code) |
| **Local Execution** | Configuration files, logs, and project data are all stored locally |
| **Database** | Conversation history and task information are stored in a local SQLite database |
| **External Servers** | No connections to Maestro-specific servers |

> **Security Note**: Maestro operates as a desktop app that harnesses Claude CLI. All AI communication is routed through Claude CLI, and the Maestro app does not independently communicate with Anthropic servers or external services.

---

## Key Features

### 1. Request to BOSS Agent

All orchestration begins with instructions to the BOSS agent.
You simply give instructions to the BOSS agent.
AI team formation, schedule management, team work status memos, and process management.

- BOSS breaks down tasks and creates necessary workers
- Process definition
- Schedule management
- Progress management and reporting to you

The AI team works autonomously without human intervention.

![Instruct BOSS AI](images/GetStarted_toboss.png)

### 2. Parallel Execution & Inter-Agent Communication

Monitor interactions between agents in real-time.

- View conversation history of all agents
- Visualize which agent is processing what
- Human intervention when needed

### 3. AI Agent Team Formation

Create multiple AI agents and assign roles to each.
You can let the BOSS agent create them.
You can also create and edit them manually.

| Role | Description |
|------|-------------|
| **BOSS (Leader)** | Oversees the team and assigns tasks |
| **Worker** | Executes specific tasks |

![AI Team](images/aiteam.png)

### 4. Progress Management

Track task progress with Gantt charts.
The BOSS agent manages the work status of each agent.

![Gantt Chart](images/gantt.png)

### 5. AI Team Thought Process

See how the AI team is progressing on tasks through team memos created for each task.
Important information between teams, lessons learned, and know-how can be utilized as task memos for future improvements.

![Team Memo](images/teammemo.png)

---

## System Requirements

### Supported OS

| OS | Version | Support Status |
|----|---------|----------------|
| macOS | 11.0 (Big Sur) or later | Supported |
| Windows | - | Coming soon |
| Linux | - | Coming soon |

> **Note**: Intel Mac (x64) is not currently supported. Apple Silicon Mac only.

### Software Requirements

| Software | Required/Optional | Description |
|----------|-------------------|-------------|
| **Claude CLI** | Required | Anthropic's Claude CLI |
| **Node.js** | Required | Required to run MCP server (v18+ recommended) |

---

## Folder Structure

The distribution package has the following structure. **All files and folders must be placed in the same directory.**

```
maestro/
├── Maestro.app              # Main application
├── mcp-server/              # MCP server (required)
│   ├── dist/                # Built JavaScript
│   ├── node_modules/        # Dependencies (included)
│   └── package.json
├── ai_agents.json           # AI agent configuration
├── ai_templates/            # AI templates
│   └── claude/
│       ├── config.json
│       ├── system_prompts/
│       └── command_templates/
└── workflow_templates.json  # Workflow templates
```

> **Important**: The `mcp-server` folder, `ai_agents.json`, and `ai_templates` folder must exist in the same directory as `Maestro.app`.

---

## MCP Server Setup

Maestro uses the MCP server to manage communication between AI agents.

### About MCP Server

- **Node.js is required**: You need an environment where `node` command can be executed
- **Architecture dependent**: This package is for Apple Silicon (arm64) only
- **Development environment**: Set up with `cd mcp-server && npm install && npm run build`
