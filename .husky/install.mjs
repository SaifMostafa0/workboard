import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Husky only makes sense inside a git repository. Skip silently (rather than
// failing the install) when one is not present, e.g. CI containers that fetch
// a source tarball or environments without git on PATH.
if (existsSync('.git')) {
  try {
    execSync('husky', { stdio: 'inherit' });
  } catch (error) {
    console.warn('[husky] Hook installation skipped:', error.message);
  }
}
