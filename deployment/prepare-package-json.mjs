import fs from 'node:fs';
import path from 'node:path';

const packagePath = process.argv[2];
const uiTarballPath = process.argv[3];

if (!packagePath || !uiTarballPath) {
  console.error(
    'Usage: node prepare-package-json.mjs <package.json> <ui-tarball>',
  );
  process.exit(1);
}

// 1. Read the deployment target app's package.json (e.g., deploy/web/package.json)
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 2. Read the source shared UI package.json to catch its dependencies dynamically
const uiPackageJsonPath = path.resolve(
  process.cwd(),
  'packages/ui/package.json',
);
const uiPkg = JSON.parse(fs.readFileSync(uiPackageJsonPath, 'utf8'));

// 3. Point to the local packed tarball asset
pkg.dependencies = pkg.dependencies || {};
delete pkg.dependencies['@kafi/ui'];
pkg.dependencies['@kafi/ui'] = `file:${uiTarballPath}`;

// 4. Automatically sync all production dependencies from the UI package
if (uiPkg.dependencies) {
  console.log(
    `Syncing external dependencies from UI package into ${packagePath}...`,
  );
  for (const [depName, version] of Object.entries(uiPkg.dependencies)) {
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

console.log(`Successfully prepared ${packagePath}`);
