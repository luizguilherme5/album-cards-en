import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);

// Optional, local-only configuration for two players sharing one exclusive USB
// output. The web API cannot set this hook or supply a shell command.
export async function handoffAudio(provider: 'spotify' | 'plex') {
  await execute(
    'bash',
    [fileURLToPath(new URL('../deployment/dev.sh', import.meta.url)), 'audio', provider],
    {
      timeout: 30000,
      maxBuffer: 65536,
    },
  );
}
