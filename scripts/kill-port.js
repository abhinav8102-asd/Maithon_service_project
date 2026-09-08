const { execSync } = require('child_process');

const ports = process.argv.slice(2).map(p => parseInt(p, 10)).filter(p => !isNaN(p));

if (ports.length === 0) {
  console.log('[Port Cleanup] Usage: node kill-port.js <port1> <port2> ...');
  process.exit(0);
}

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      // Find PID using netstat
      let output = '';
      try {
        output = execSync(`netstat -ano | findstr :${port}`).toString();
      } catch (e) {
        // netstat returns exit code 1 if no matches are found, which throws an error in execSync
        return;
      }
      
      const lines = output.split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          // Check if it's actually listening on the exact port
          // netstat output format: Protocol LocalAddress ForeignAddress State PID
          const localAddress = parts[1];
          if (localAddress.endsWith(`:${port}`)) {
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && !isNaN(pid)) {
              pids.add(pid);
            }
          }
        }
      }
      for (const pid of pids) {
        console.log(`[Port Cleanup] Killing process ${pid} using port ${port}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
        } catch (e) {
          // ignore error if process is already dead or access denied
        }
      }
    } else {
      // Unix-based systems
      try {
        console.log(`[Port Cleanup] Checking port ${port}...`);
        const pids = execSync(`lsof -t -i:${port}`).toString().trim().split('\n');
        for (const pid of pids) {
          if (pid) {
            console.log(`[Port Cleanup] Killing process ${pid} on port ${port}...`);
            execSync(`kill -9 ${pid}`);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (error) {
    console.error(`[Port Cleanup] Failed to cleanup port ${port}:`, error.message);
  }
}

ports.forEach(killPort);
