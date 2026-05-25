const { execSync } = require('child_process');

try {
  const pid = 34032;
  // On Windows, use wmic to get command line
  const cmd = execSync(`wmic process where processid=${pid} get commandline 2>nul`).toString();
  console.log('=== Steedos Process (PID 34032) ===');
  console.log(cmd.slice(0, 1000));
} catch(e) {
  console.log('Error getting process info:', e.message);
}

// Check if MongoDB is reachable
const net = require('net');
const sock = new net.Socket();
sock.setTimeout(3000);
sock.connect(27017, '127.0.0.1', () => {
  console.log('\n=== MongoDB ===');
  console.log('MongoDB port 27017: CONNECTED');
  sock.destroy();
});
sock.on('error', (e) => {
  console.log('\n=== MongoDB ===');
  console.log('MongoDB port 27017:', e.code);
});
sock.on('timeout', () => {
  console.log('\n=== MongoDB ===');
  console.log('MongoDB port 27017: TIMEOUT');
  sock.destroy();
});

// Check if Redis is reachable
const sock2 = new net.Socket();
sock2.setTimeout(3000);
sock2.connect(6379, '127.0.0.1', () => {
  console.log('\n=== Redis ===');
  console.log('Redis port 6379: CONNECTED');
  sock2.destroy();
});
sock2.on('error', (e) => {
  console.log('\n=== Redis ===');
  console.log('Redis port 6379:', e.code);
});
sock2.on('timeout', () => {
  console.log('\n=== Redis ===');
  console.log('Redis port 6379: TIMEOUT');
  sock2.destroy();
});
