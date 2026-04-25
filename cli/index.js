#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk');
const { Command } = require('commander');

const program = new Command();

program
  .name('vela-dev')
  .description('Ask questions to Vela Development Documentation')
  .argument('<question>', 'The question you want to ask')
  .option('-k, --count <number>', 'Number of results to return', '3')
  .action(async (question, options) => {
    console.log(chalk.blue('🔍 Searching Vela Docs...'));
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/search', {
        question: question,
        k: parseInt(options.count)
      });

      const results = response.data.results;
      
      if (results.length === 0) {
        console.log(chalk.yellow('No relevant documents found.'));
        return;
      }

      results.forEach((r, index) => {
        console.log(chalk.green(`\n--- Result ${index + 1} ---`));
        console.log(chalk.gray(`Source: ${r.source}`));
        console.log(r.content);
      });

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(chalk.red('❌ Error: Could not connect to VelaDev server.'));
        console.error(chalk.yellow('Please make sure the Python server is running:'));
        console.error(chalk.cyan('   python -m veladev.server'));
      } else {
        console.error(chalk.red('Error:', error.message));
      }
    }
  });

program.parse();
