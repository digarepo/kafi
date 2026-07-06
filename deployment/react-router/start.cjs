const path = require('path');
const { pathToFileURL } = require('url');

async function startServer() {
  try {
    console.log('🚀 Starting server...');

    const serverPath = path.resolve(__dirname, 'server.js');
    const serverURL = pathToFileURL(serverPath);

    await import(serverURL.href);

    console.log('✅ Server started from:', serverPath);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
