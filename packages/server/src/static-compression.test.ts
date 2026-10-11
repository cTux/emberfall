import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import test from "node:test";
import { createGameServer } from "./worlds.ts";

test("static files negotiate compressed representations and preserve HTTP semantics", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "emberfall-compression-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "assets"));
  const original = Buffer.from("console.log('Emberfall');\n".repeat(100));
  const br = brotliCompressSync(original);
  const gzip = gzipSync(original);
  const name = "assets/app-abc12345.js";
  await writeFile(join(root, name), original);
  await writeFile(join(root, name + ".br"), br);
  await writeFile(join(root, name + ".gz"), gzip);
  await writeFile(join(root, "fallback.js"), original);
  await writeFile(join(root, "fallback.js.gz"), gzip);
  await writeFile(join(root, "plain.js"), original);
  await writeFile(join(root, "orphan.js.br"), br);
  await writeFile(join(root, "version.json"), '{"buildId":"current"}');
  await writeFile(
    join(root, "version.json.br"),
    brotliCompressSync(Buffer.from('{"buildId":"stale"}')),
  );
  const app = await createGameServer(root, ":memory:");
  await app.listen(0, "127.0.0.1");
  t.after(() => app.close());
  const address = app.server.address();
  assert.ok(address && typeof address !== "string");

  const port = address.port;

  function get(path: string, encoding?: string, method = "GET") {
    return new Promise<{
      status: number;
      headers: import("node:http").IncomingHttpHeaders;
      body: Buffer;
    }>((resolve, reject) => {
      request(
        {
          hostname: "127.0.0.1",
          port: port,
          path,
          method,
          headers: encoding === undefined ? {} : { "Accept-Encoding": encoding },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () =>
            resolve({
              status: response.statusCode!,
              headers: response.headers,
              body: Buffer.concat(chunks),
            }),
          );
          response.on("error", reject);
        },
      )
        .on("error", reject)
        .end();
    });
  }

  for (const [header, expected, bytes] of [
    ["gzip, br", "br", br],
    ["br;q=0.2, gzip;q=0.8", "gzip", gzip],
    ["br;q=0, gzip", "gzip", gzip],
    ["*;q=1", "br", br],
    ["br;q=0, gzip;q=0", undefined, original],
    ["identity;q=1, br;q=0.5", undefined, original],
    ["", undefined, original],
    [undefined, undefined, original],
  ] as const) {
    const result = await get("/" + name + "?v=1", header);
    assert.equal(result.status, 200);
    assert.equal(result.headers["content-encoding"], expected, header ?? "absent header");
    assert.equal(result.headers.vary, "Accept-Encoding");
    assert.equal(result.headers["content-type"], "text/javascript");
    assert.equal(result.headers["cache-control"], "public, max-age=31536000, immutable");
    assert.equal(Number(result.headers["content-length"]), bytes.length);
    assert.deepEqual(result.body, bytes);
  }
  const head = await get("/" + name, "br", "HEAD");
  assert.equal(head.headers["content-encoding"], "br");
  assert.equal(Number(head.headers["content-length"]), br.length);
  assert.equal(head.body.length, 0);
  assert.equal((await get("/fallback.js", "br, gzip")).headers["content-encoding"], "gzip");
  assert.deepEqual((await get("/plain.js", "br, gzip")).body, original);
  assert.equal((await get("/plain.js", "br, identity;q=0")).status, 406);
  assert.equal((await get("/" + name, "*;q=0")).status, 406);
  assert.equal((await get("/orphan.js", "br")).status, 404);
  const version = await get("/version.json", "br");
  assert.equal(version.headers["content-encoding"], undefined);
  assert.equal(version.headers["cache-control"], "no-store");
  assert.equal(version.body.toString(), '{"buildId":"current"}');
  assert.equal((await get("/..%2fpackage.json", "br")).status, 403);
});
