import test from "node:test";
import assert from "node:assert/strict";
import { classifyRelease } from "../src/classifier.js";

test("classifies a radio executive appointment as radio and management", () => {
  const result = classifyRelease({ title: "Audacy Names New Vice President for Its Radio Stations", company: ["Audacy"], industry: ["RAD"] });
  assert.ok(result.categories.includes("radio"));
  assert.ok(result.categories.includes("management"));
});

test("does not classify a generic consumer streaming promotion", () => {
  const result = classifyRelease({ title: "Holiday Gift Guide Offers Limited-Time Discount on Streaming Device" });
  assert.deepEqual(result.categories, []);
  assert.equal(result.excluded, true);
});

test("classifies television station programming", () => {
  const result = classifyRelease({ title: "Gray Media Television Station Launches New Local Newscast", industry: ["TVN"] });
  assert.ok(result.categories.includes("television"));
});

test("classifies a television personnel departure using company and industry", () => {
  const result = classifyRelease({ title: "FOX NEWS MEDIA PARTS WAYS WITH MARIA BARTIROMO", company: ["Fox News Network, LLC"], industry: ["TVN", "PUB", "ENT"] });
  assert.ok(result.categories.includes("television"));
});

test("does not classify generic corporate management news", () => {
  const result = classifyRelease({ title: "Memorial Healthcare System Names Shane Strum President & CEO" });
  assert.deepEqual(result.categories, []);
  assert.equal(result.review, false);
});

test("does not classify generic investor events as management or tradeshow", () => {
  const result = classifyRelease({ title: "Cellebrite Announces Upcoming Investor Events in September" });
  assert.deepEqual(result.categories, []);
  assert.equal(result.excluded, true);
});

test("does not classify a securities lawsuit as advertising", () => {
  const result = classifyRelease({ title: "Hims & Hers Shareholders Have Opportunity to Lead Securities Fraud Lawsuit", industry: ["ADV"] });
  assert.deepEqual(result.categories, []);
  assert.equal(result.excluded, true);
});

test("sends a genuinely media-related borderline story to review", () => {
  const result = classifyRelease({ title: "Company Announces Agreement for Its Broadcasting Division", industry: ["PUB"] });
  assert.deepEqual(result.categories, []);
  assert.equal(result.review, true);
});

test("ignores unrelated media brands mentioned only in body boilerplate", () => {
  const result = classifyRelease({ title: "Audacy Names New Leader for Radio Stations", company: ["Audacy"], body: "The company also creates podcasts and provides digital advertising services." });
  assert.ok(result.categories.includes("radio"));
  assert.ok(!result.categories.includes("podcast"));
  assert.ok(!result.categories.includes("advertising"));
});

test("classifies an advertising appointment", () => {
  const result = classifyRelease({ title: "Audio Advertising Platform Names New Vice President of Ad Sales", industry: ["ADV"] });
  assert.ok(result.categories.includes("advertising"));
  assert.ok(result.categories.includes("management"));
});

test("classifies broadcast technology launches as engineering", () => {
  const result = classifyRelease({ title: "Company Launches New Broadcast Automation and Playout System", industry: ["BRD"] });
  assert.ok(result.categories.includes("engineering"));
});

test("does not classify generic chip engineering as broadcast engineering", () => {
  const result = classifyRelease({ title: "Silicon Labs Opens New Austin Innovation Center with Support from Texas CHIPS Act", industry: ["TEQ"] });
  assert.deepEqual(result.categories, []);
});

test("classifies NAB Show announcements as tradeshow", () => {
  const result = classifyRelease({ title: "Company to Debut New Camera System at NAB Show", industry: ["BRD"] });
  assert.ok(result.categories.includes("tradeshow"));
});

test("does not treat a generic financial conference as a tradeshow", () => {
  const result = classifyRelease({ title: "Bank CEO to Speak at Global Financial Services Conference" });
  assert.deepEqual(result.categories, []);
});

test("classifies a music-industry legal story as entertainment", () => {
  const result = classifyRelease({ title: "Music Artists File Lawsuit Against AI Music-Generation Platform", industry: ["MUS", "ENT"] });
  assert.ok(result.categories.includes("entertainment"));
});

test("classifies an advertising technology launch but not a generic campaign", () => {
  const product = classifyRelease({ title: "Storiad Introduces the Author Marketing OS", industry: ["ADV", "SMD"] });
  const promotion = classifyRelease({ title: "AARP Launches Staycation Campaign", industry: ["ADV", "ENT"] });
  assert.ok(product.categories.includes("advertising"));
  assert.deepEqual(promotion.categories, []);
});

test("classifies a reality series as television and entertainment", () => {
  const result = classifyRelease({ title: "Tattoo Review Reality Series Expands to Four Platforms", industry: ["TVN", "ENT"] });
  assert.ok(result.categories.includes("television"));
  assert.ok(result.categories.includes("entertainment"));
});

test("does not classify a hotel's film festival promotion as entertainment", () => {
  const result = classifyRelease({ title: "Four Seasons Hotel Sets the Scene for International Film Festival", company: ["Four Seasons Hotels and Resorts"], industry: ["FLM", "ENT"] });
  assert.deepEqual(result.categories, []);
});
