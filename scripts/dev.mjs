// On this workstation dev.sh owns persistent processes. Elsewhere npm run dev
// starts the same single Node process directly, including the Vite middleware.
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
const managed = existsSync('dev.sh');
const child = managed
  ? spawn('bash', ['./dev.sh', 'up'], { stdio: 'inherit' })
  : spawn(process.execPath, ['--import', 'tsx', 'server/main.ts'], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
