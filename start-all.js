const { spawn } = require('child_process');
const path = require('path');

// Colors for output
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m"
};

function runProcess(name, command, args, cwd, color) {
  console.log(`${color}Starting ${name}...${colors.reset}`);
  const child = spawn(command, args, { 
    cwd: cwd, 
    shell: true,
    stdio: 'pipe'
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    for (const line of lines) {
      console.log(`${color}[${name}]${colors.reset} ${line}`);
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    for (const line of lines) {
      console.error(`${colors.red}[${name} ERROR]${colors.reset} ${line}`);
    }
  });

  child.on('close', (code) => {
    console.log(`${color}[${name}] exited with code ${code}${colors.reset}`);
  });

  return child;
}

// Start Backend
const backendCwd = path.join(__dirname, 'server');
const backendProcess = runProcess('Backend', 'npm', ['start'], backendCwd, colors.cyan);

// Start Frontend
const frontendCwd = __dirname;
const frontendProcess = runProcess('Frontend', 'npm', ['start'], frontendCwd, colors.green);

// Handle termination
const cleanup = () => {
  console.log('\nShutting down...');
  backendProcess.kill('SIGTERM');
  frontendProcess.kill('SIGTERM');
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
