import { join } from 'path';
import fs from 'fs';

import { frameworkMap } from '../constant.js';

export function detectFrameworkFromPackageJson(cwd: string) {
  try {
    const pkgPath = join(cwd, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const matched = Object.values(frameworkMap).find((framework) =>
      Object.prototype.hasOwnProperty.call(deps, framework)
    );

    return matched ?? 'unknown';
  } catch (err) {
    return 'unknown';
  }
}
