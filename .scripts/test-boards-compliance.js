#!/usr/bin/env node

/**
 * 开发板配置检测测试脚本
 * 用于本地测试和快速验证
 */

const BoardValidator = require('./validate-boards-compliance.js');

async function testBoards() {
  const validator = new BoardValidator();
  
  console.log('🧪 开发板配置检测测试\n');

  // 测试几个典型的开发板
  const testBoards = [
    'arduino_uno',
    'esp32',
    'raspberrypi_pico',
    'arduino_nano'
  ];

  console.log(`将测试以下开发板: ${testBoards.join(', ')}\n`);

  for (const boardName of testBoards) {
    console.log(`\n${'='.repeat(60)}`);
    try {
      const result = await validator.validateBoard(boardName);
      validator.generateBoardReport(result.boardName, result.issues);
    } catch (error) {
      console.error(`❌ 测试 ${boardName} 时发生错误:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 测试完成');
}

// 如果直接运行此文件
if (require.main === module) {
  testBoards().catch(console.error);
}

module.exports = testBoards;