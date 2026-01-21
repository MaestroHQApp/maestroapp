#!/usr/bin/env node

/**
 * MCP Server File-based Test Script
 *
 * このスクリプトはMCPサーバーのファイルベース実装をテストします。
 * 実際のClaude CLIからのMCP呼び出しをシミュレートします。
 */

import { instructAgents } from './dist/tools/instructAgents.js';
import { getAgentStatus } from './dist/tools/getAgentStatus.js';

async function testInstructAgents() {
  console.log('\n========================================');
  console.log('TEST 1: instruct_agents');
  console.log('========================================\n');

  try {
    const result = await instructAgents({
      instructions: [
        {
          agent_id: 'agent-worker-001',
          instruction: 'テストタスクを実行してください。このファイルはMCPサーバーのテストです。',
          priority: 'normal'
        }
      ]
    });

    console.log('✅ instruct_agents SUCCESS\n');
    console.log('Result:', result);
    console.log('\nMessage:\n', result.message);

    // 作成されたファイルを確認
    if (result.created_files && result.created_files.length > 0) {
      console.log('\n📁 作成されたファイル:');
      result.created_files.forEach(file => {
        console.log(`  - ${file}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ instruct_agents FAILED:', error.message);
    throw error;
  }
}

async function testGetAgentStatus() {
  console.log('\n========================================');
  console.log('TEST 2: get_agent_status');
  console.log('========================================\n');

  try {
    const result = await getAgentStatus({
      agent_id: 'agent-worker-001'
    });

    console.log('✅ get_agent_status SUCCESS\n');
    console.log('Result:', result);
    console.log('\nMessage:\n', result.message);

    return result;
  } catch (error) {
    console.error('❌ get_agent_status FAILED:', error.message);
    throw error;
  }
}

async function testNonExistentAgent() {
  console.log('\n========================================');
  console.log('TEST 3: get_agent_status (non-existent agent)');
  console.log('========================================\n');

  try {
    const result = await getAgentStatus({
      agent_id: 'agent-nonexistent-999'
    });

    console.log('✅ get_agent_status (non-existent) SUCCESS\n');
    console.log('Result:', result);
    console.log('\nMessage:\n', result.message);

    return result;
  } catch (error) {
    console.error('❌ get_agent_status (non-existent) FAILED:', error.message);
    throw error;
  }
}

async function verifyCreatedFiles() {
  console.log('\n========================================');
  console.log('VERIFICATION: Check created files');
  console.log('========================================\n');

  const fs = await import('fs');
  const path = await import('path');

  // テスト用: プロジェクトルートからの相対パス、または環境変数
  const baseDir = process.env.MCP_AGENTS_DIR || path.join(path.dirname(import.meta.url.replace('file://', '')), '..', 'agents');
  const inputDir = path.join(baseDir, 'agent-worker-001', 'input', 'from-user');

  console.log(`📂 Checking directory: ${inputDir}\n`);

  if (fs.existsSync(inputDir)) {
    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));
    console.log(`✅ Found ${files.length} instruction file(s):\n`);

    files.forEach(file => {
      const filepath = path.join(inputDir, file);
      try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const data = JSON.parse(content);

        console.log(`📄 ${file}:`);
        console.log(`   ID: ${data.id}`);
        console.log(`   From: ${data.from}`);
        console.log(`   Priority: ${data.priority}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Prompt: ${data.prompt.substring(0, 50)}...`);
        console.log('');
      } catch (parseError) {
        console.log(`📄 ${file}:`);
        console.log(`   ⚠️  Parse error: ${parseError.message}`);
        console.log('');
      }
    });
  } else {
    console.log('❌ Directory does not exist');
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  MCP Server File-based Test Suite     ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // Test 1: instruct_agents
    await testInstructAgents();

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test 2: get_agent_status
    await testGetAgentStatus();

    // Test 3: get_agent_status (non-existent agent)
    await testNonExistentAgent();

    // Verification
    await verifyCreatedFiles();

    console.log('\n========================================');
    console.log('🎉 ALL TESTS PASSED');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('💥 TEST FAILED');
    console.error('========================================\n');
    console.error(error);
    process.exit(1);
  }
}

main();
