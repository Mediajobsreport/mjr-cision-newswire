import test from "node:test";
import assert from "node:assert/strict";
import { classifyRelease } from "../src/classifier.js";

test("classifies a radio executive appointment as radio", () => {
  const result = classifyRelease({
    title: "Audacy Names New Vice President for Its Radio Stations",
    company: ["Audacy"]
  });
  assert.ok(result.categories.includes("radio"));
  assert.equal(result.review, false);
});

test("does not classify a generic consumer streaming promotion", () => {
  const result = classifyRelease({
    title: "Holiday Gift Guide Offers Limited-Time Discount on Streaming Device"
  });
  assert.deepEqual(result.categories, []);
  assert.equal(result.excluded, true);
});

test("classifies television station programming", () => {
  const result = classifyRelease({
    title: "Gray Media Television Station Launches New Local Newscast"
  });
  assert.ok(result.categories.includes("television"));
});

test("sends borderline media business stories to review", () => {
  const result = classifyRelease({
    title: "Company Names Executive to Lead Broadcasting Division"
  });
  assert.deepEqual(result.categories, []);
  assert.equal(result.review, true);
});

test("ignores unrelated media brands mentioned only in body boilerplate", () => {
  const result = classifyRelease({
    title: "Audacy Names New Leader for Radio Stations",
    company: ["Audacy"],
    body: "The company also creates podcasts and provides digital advertising services."
  });
  assert.ok(result.categories.includes("radio"));
  assert.ok(!result.categories.includes("podcast"));
  assert.ok(!result.categories.includes("advertising"));
});

test("uses the exact Buzz categories for an advertising appointment", () => {
  const result = classifyRelease({
    title: "Audio Advertising Platform Names New Vice President of Ad Sales"
  });
  assert.ok(result.categories.includes("advertising"));
  assert.ok(result.categories.includes("management"));
});

test("classifies broadcast technology launches as engineering", () => {
  const result = classifyRelease({
    title: "Company Launches New Broadcast Automation and Playout System"
  });
  assert.ok(result.categories.includes("engineering"));
});

test("classifies NAB Show announcements as tradeshow", () => {
  const result = classifyRelease({
    title: "Company to Debut New Camera System at NAB Show"
  });
  assert.ok(result.categories.includes("tradeshow"));
});
