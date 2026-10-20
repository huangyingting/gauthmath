import { readFileSync } from 'node:fs';
import { bootstrapAdmin } from '../src/lib/account-admission/bootstrap';

function parseArgs(argv: string[]) {
  let email = process.env.BOOTSTRAP_ADMIN_EMAIL || '';
  let name = process.env.BOOTSTRAP_ADMIN_NAME || '';
  let password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  let passwordStdin = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--email' && argv[i + 1]) email = argv[++i];
    else if (arg.startsWith('--email=')) email = arg.slice('--email='.length);
    else if (arg === '--name' && argv[i + 1]) name = argv[++i];
    else if (arg.startsWith('--name=')) name = arg.slice('--name='.length);
    else if (arg === '--password' && argv[i + 1]) password = argv[++i];
    else if (arg.startsWith('--password=')) password = arg.slice('--password='.length);
    else if (arg === '--password-stdin') passwordStdin = true;
  }

  return { email, name, password, passwordStdin };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const password = args.passwordStdin
    ? readFileSync(0, 'utf8').replace(/\r?\n$/, '')
    : args.password;

  if (!args.email || !password) {
    console.error(
      'Both --email <email> and a password (--password-stdin or --password) are required.'
    );
    process.exit(2);
  }

  const result = await bootstrapAdmin({
    email: args.email,
    password,
    name: args.name || null,
  });

  console.log(
    JSON.stringify({
      ok: true,
      created: result.created,
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    })
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
