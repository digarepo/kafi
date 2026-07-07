import fs from "node:fs";

const packagePath = process.argv[2];
const uiPackagePath = process.argv[3];

if (!packagePath || !uiPackagePath) {
  console.error(
    "Usage: node prepare-package-json.mjs <package.json> <ui-package>"
  );
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

delete pkg.dependencies?.["@kafi/ui"];

pkg.dependencies["@kafi/ui"] = `file:${uiPackagePath}`;

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`Prepared ${packagePath}`);
