import fs from 'fs';
import path from 'path';

export function scanDirectory(dir: string): string[] {
  let pathList: string[] = [];
  if (!fs.existsSync(dir)) {
    return pathList;
  }
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      pathList = pathList.concat(scanDirectory(filePath));
    } else {
      pathList.push(filePath);
    }
  });

  return pathList;
}
