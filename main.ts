import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const sourceDirectory = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const dossierLimits = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

function packageEntry() {
  mkdirSync(destination, { recursive: true });
  for (const directory of ['app', 'screenshots']) {
    const target = join(destination, directory);
    if (directory === 'screenshots') mkdirSync(target, { recursive: true });
    const source = join(sourceDirectory, directory);
    if (directory === 'app' || existsSync(source)) cpSync(source, target, { recursive: true });
  }
  writeFileSync(join(destination, 'dossier.json'), buildDossier(destination, dossierLimits));
}

packageEntry();
