const path = require('path');
const { pathToFileURL } = require('url');

async function startServer() {
  try {
    console.log('🚀 Starting NestJS API server...');

    const serverPath = path.resolve(__dirname, 'dist/src/main.js');
    const serverURL = pathToFileURL(serverPath);

    await import(serverURL.href);

    console.log('✅ API Server started successfully from:', serverPath);
  } catch (err) {
    console.error('❌ Failed to start API server:', err);
    process.exit(1);
  }
}

startServer();
