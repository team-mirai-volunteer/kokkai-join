#!/usr/bin/env -S deno run -A

// Dump the entire PostgreSQL database from the `kokkai-postgres` container
// into ./data as a gzipped SQL file. The container's /data is mounted to ./data
// by compose.yaml, so we write inside the container to /data.
//
// Usage:
//   deno run -A scripts/dump-db.ts
//   deno run -A scripts/dump-db.ts --container kokkai-postgres

type Flags = {
  container: string;
};

const DEFAULTS: Flags = {
  container: "kokkai-postgres",
};

function parseArgs(args: string[]): Flags {
  const flags = { ...DEFAULTS };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--container" && args[i + 1]) flags.container = args[++i];
    else if (a === "--help" || a === "-h") {
      printHelp();
      Deno.exit(0);
    }
  }
  return flags;
}

function printHelp() {
  console.log(`Database dump helper for kokkai-postgres

Options:
  --container <name>      Container name (default: kokkai-postgres)
  -h, --help              Show this help

Output (in ./data):
  kokkai_dump_YYYYMMDD_HHMMSS.sql.gz
`);
}

async function run(cmd: string[], opts: { quiet?: boolean } = {}) {
  const p = new Deno.Command(cmd[0], { args: cmd.slice(1), stdout: "piped", stderr: "piped" });
  const { code, stdout, stderr } = await p.output();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);
  if (!opts.quiet) {
    if (out.trim()) console.log(out.trim());
    if (err.trim()) console.error(err.trim());
  }
  return { code, stdout: out, stderr: err };
}

async function ensureDocker() {
  const r = await run(["docker", "--version"], { quiet: true });
  if (r.code !== 0) throw new Error("docker is not available in PATH");
}

async function isRunning(name: string): Promise<boolean> {
  const r = await run(["docker", "ps", "--format", "{{.Names}}"], { quiet: true });
  return r.code === 0 && r.stdout.split(/\r?\n/).some((n) => n.trim() === name);
}

async function startContainer(): Promise<void> {
  console.log("Container not running; starting via docker compose...");
  const r = await run(["docker", "compose", "up", "-d", "postgres"]);
  if (r.code !== 0) throw new Error("failed to start postgres via docker compose");
}

async function waitHealthy(name: string): Promise<void> {
  console.log("Waiting for postgres to become healthy (no timeout)...");
  for (;;) {
    const r = await run(["docker", "inspect", "-f", "{{.State.Health.Status}}", name], { quiet: true });
    if (r.code === 0 && r.stdout.trim() === "healthy") {
      console.log("Postgres is healthy");
      return;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
}

function ts(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "_" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function dump(flags: Flags) {
  await ensureDocker();
  const running = await isRunning(flags.container);
  if (!running) {
    await startContainer();
    await waitHealthy(flags.container);
  }

  const timestamp = ts();
  const fullFile = `kokkai_dump_${timestamp}.sql.gz`;

  // Ensure host data folder exists (mirror of volume mount)
  try {
    await Deno.mkdir("data", { recursive: true });
  } catch (_) {
    // ignore
  }

  console.log(`Creating full database dump: ./data/${fullFile}`);
  const cmd = [
    "docker",
    "exec",
    flags.container,
    "sh",
    "-lc",
    `mkdir -p /data && pg_dump -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" | gzip -c > /data/${fullFile}`,
  ];
  const r = await run(cmd);
  if (r.code !== 0) throw new Error("full dump failed");

  console.log("Done.");
}

if (import.meta.main) {
  const flags = parseArgs(Deno.args);
  dump(flags).catch((e) => {
    console.error("❌ ", e?.message ?? String(e));
    Deno.exit(1);
  });
}

