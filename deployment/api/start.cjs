const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function findMainPath() {
  const candidates = [
    path.resolve(__dirname, 'dist', 'main.js'),
    path.resolve(__dirname, 'dist', 'src', 'main.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find API main entry. Looked for:\n${candidates.join('\n')}`,
  );
}

async function startServer() {
  try {
    console.log('🚀 Starting NestJS API server...');

    const serverPath = findMainPath();
    const serverURL = pathToFileURL(serverPath);

    await import(serverURL.href);

    console.log('✅ API Server started successfully from:', serverPath);
  } catch (err) {
    console.error('❌ Failed to start API server:', err);
    process.exit(1);
  }
}

startServer();
