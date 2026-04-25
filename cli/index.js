#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk');
const { Command } = require('commander');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const which = require('which'); // 用于查找 python3

const PORT = 8000;
const CACHE_DIR = path.join(require('os').homedir(), '.veladev-cache');
const PACKAGE_DIR = __dirname;

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// 将 npm 包内的文件复制到缓存目录（首次运行或版本更新时）
function syncFilesToCache() {
  const versionFile = path.join(CACHE_DIR, 'version.txt');
  const currentVersion = require('./package.json').version;
  
  let needsSync = false;
  if (!fs.existsSync(versionFile) || fs.readFileSync(versionFile, 'utf-8').trim() !== currentVersion) {
    needsSync = true;
  }
  
  // 简单检查关键文件是否存在
  if (!fs.existsSync(path.join(CACHE_DIR, 'doc_vector_db'))) {
    needsSync = true;
  }

  if (needsSync) {
    console.log(chalk.yellow('📦 Initializing local cache...'));
    // 复制 doc_vector_db
    execSync(`cp -r "${path.join(PACKAGE_DIR, 'doc_vector_db')}" "${CACHE_DIR}/"`);
    // 复制 src
    execSync(`cp -r "${path.join(PACKAGE_DIR, 'backend')}" "${CACHE_DIR}/"`);
    // 复制 server.py
    execSync(`cp "${path.join(PACKAGE_DIR, 'server.py')}" "${CACHE_DIR}/"`);
    // 复制 requirements.txt
    execSync(`cp "${path.join(PACKAGE_DIR, 'requirements.txt')}" "${CACHE_DIR}/"`);
    
    fs.writeFileSync(versionFile, currentVersion);
    console.log(chalk.green('✅ Cache ready.'));
  }
}

// 检查并安装 Python 依赖
function ensureDependencies() {
  const venvPath = path.join(CACHE_DIR, 'venv');
  if (!fs.existsSync(venvPath)) {
    console.log(chalk.yellow('🐍 Setting up Python environment...'));
    process.chdir(CACHE_DIR);
    execSync('python3 -m venv venv');
    const pip = process.platform === 'win32' ? 'venv\\Scripts\\pip.exe' : 'venv/bin/pip';
    execSync(`${pip} install -r requirements.txt`);
    console.log(chalk.green('✅ Dependencies installed.'));
  }
}

// 启动服务器
function startServer() {
  return new Promise((resolve, reject) => {
    // 检查端口是否已占用
    axios.get(`http://127.0.0.1:${PORT}/health`).then(() => {
      resolve(); // 已经在运行
    }).catch(async () => {
      console.log(chalk.yellow('🚀 Starting local server...'));
      process.chdir(CACHE_DIR);
      const python = process.platform === 'win32' ? 'venv\\Scripts\\python.exe' : 'venv/bin/python';
      
      const server = spawn(python, ['server.py'], {
        detached: true,
        stdio: 'ignore'
      });
      server.unref();
      
      // 等待几秒
      await new Promise(r => setTimeout(r, 3000));
      resolve();
    });
  });
}

const program = new Command();

program
  .name('vela-dev')
  .description('Vela Development Documentation RAG Skill')
  .argument('<question>', 'Your question')
  .action(async (question) => {
    try {
      // 1. 检查 Python
      try {
        which.sync('python3');
      } catch (e) {
        console.error(chalk.red('❌ Python 3 not found. Please install Python 3.'));
        process.exit(1);
      }

      // 2. 同步文件
      syncFilesToCache();

      // 3. 确保依赖
      ensureDependencies();

      // 4. 启动服务器
      await startServer();

      // 5. 查询
      console.log(chalk.blue(`🔎 Asking: "${question}"`));
      const res = await axios.post(`http://127.0.0.1:${PORT}/`, {
        question: question,
        k: 3
      });

      if (res.data.error) {
        console.error(chalk.red('Error:', res.data.error));
        return;
      }

      res.data.results.forEach((r, i) => {
        console.log(chalk.green(`\n--- Result ${i+1} ---`));
        console.log(chalk.gray(`Source: ${path.basename(r.source)}`));
        console.log(r.content.substring(0, 400) + '...');
      });

    } catch (err) {
      console.error(chalk.red('Fatal Error:', err.message));
    }
  });

program.parse();
