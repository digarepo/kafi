import fs from 'node:fs';
import path from 'node:path';

const packagePath = process.argv[2];
const tarballPath = process.argv[3];
const workspacePath = process.argv[4] ?? 'packages/ui';

if (!packagePath || !tarballPath) {
  console.error(
    'Usage: node prepare-package-json.mjs <package.json> <tarball> [<workspace-path>]',
  );
  process.exit(1);
}

// 1. Read the deployment target app's package.json (e.g., deploy/web/package.json)
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 2. Read the source workspace package.json to catch its name and dependencies
const workspacePackageJsonPath = path.resolve(
  process.cwd(),
  workspacePath,
  'package.json',
);
const workspacePkg = JSON.parse(
  fs.readFileSync(workspacePackageJsonPath, 'utf8'),
);
const packageName = workspacePkg.name;

// 3. Point the workspace dependency at the local packed tarball asset
pkg.dependencies = pkg.dependencies || {};
delete pkg.dependencies[packageName];
pkg.dependencies[packageName] = `file:${tarballPath}`;

// 4. Automatically sync all production dependencies from the workspace package
if (workspacePkg.dependencies) {
  console.log(
    `Syncing external dependencies from ${packageName} into ${packagePath}...`,
  );
  for (const [depName, version] of Object.entries(workspacePkg.dependencies)) {
    // Only inject if the consumer app hasn't explicitly specified its own version
    if (!pkg.dependencies[depName]) {
      pkg.dependencies[depName] = version;
      console.log(`   + Added ${depName}: ${version}`);
    }
  }
}

// 5. Clean up devDependencies for production deployment
if (pkg.devDependencies) {
  delete pkg.devDependencies;
}

// 6. Write out the modified deployment package.json
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Successfully prepared ${packagePath} with ${packageName}`);
