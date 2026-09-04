import test from "node:test";
import assert from "node:assert/strict";
import { CisionClient, formatCisionDate, parseCisionDate } from "../src/cision-client.js";

test("round-trips Cision UTC timestamps", () => {
  const date = parseCisionDate("20260904T123456+0000");
  assert.equal(date.toISOString(), "2026-09-04T12:34:56.000Z");
  assert.equal(formatCisionDate(date), "20260904T123456+0000");
});

test("paginates list requests and reuses one authentication token", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/auth/login")) {
      return jsonResponse({ auth_token: "token", expires: "20990101T000000+0000" });
    }
    const offset = Number(new URL(url).searchParams.get("from"));
    const length = offset === 0 ? 100 : 1;
    return jsonResponse({
      data: Array.from({ length }, (_, index) => ({ release_id: String(offset + index) })),
      pagination: { total_items: 101 }
    });
  };

  const client = new CisionClient({ login: "user", password: "secret", fetchImpl });
  const releases = await client.getAllReleases({ language: "en" });
  assert.equal(releases.length, 101);
  assert.equal(calls.filter(({ url }) => url.endsWith("/auth/login")).length, 1);
  assert.equal(calls.filter(({ url }) => url.includes("/releases?")).length, 2);
  assert.equal(calls[1].options.headers.Authorization, "Bearer token");
  assert.equal(calls[1].options.headers["X-Client"], "user");
});

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
