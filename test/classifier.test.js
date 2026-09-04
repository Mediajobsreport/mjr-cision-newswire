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

test("does not classify a hospitality leadership forum as entertainment", () => {
  const result = classifyRelease({
    title: "Hospitality Group Announces Leadership Forum Bringing Together Tourism, Sports and Entertainment Leaders",
    industry: ["ENT"]
  });
  assert.deepEqual(result.categories, []);
});

test("does not classify a bank marketing executive as advertising or management", () => {
  const result = classifyRelease({
    title: "Huntington Bank Names Chief Marketing and Digital Products Officer",
    industry: ["ADV", "FIN"]
  });
  assert.deepEqual(result.categories, []);
});

test("does not classify an unrelated conference as a tradeshow", () => {
  const result = classifyRelease({
    title: "Rent-to-Own Industry Leaders Donate Furniture Following National Conference",
    summary: "The annual trade show brought exhibitors together."
  });
  assert.deepEqual(result.categories, []);
});

test("classifies IBC broadcast technology as engineering and tradeshow", () => {
  const result = classifyRelease({
    title: "Actus Digital Unveils the Future of Broadcast Monitoring at IBC2026",
    industry: ["BRD", "MLM"]
  });
  assert.ok(result.categories.includes("engineering"));
  assert.ok(result.categories.includes("tradeshow"));
});

test("classifies explicit podcast launches", () => {
  const result = classifyRelease({
    title: "Martin Guitar Launches a New Artist-Focused Podcast",
    industry: ["RAD", "ENT"]
  });
  assert.ok(result.categories.includes("podcast"));
});

test("classifies television broadcast partnerships", () => {
  const result = classifyRelease({
    title: "World Team Tennis Announces Broadcast Partnership with USA Sports",
    industry: ["TVN", "ENT"]
  });
  assert.ok(result.categories.includes("television"));
});

test("excludes non-editorial media-company financing releases", () => {
  const notes = classifyRelease({ title: "Tencent Music Entertainment Group Announces Notes Offering", industry: ["MUS", "ENT"] });
  const credit = classifyRelease({ title: "Corus Entertainment Provides Update Regarding Credit Facility", industry: ["TVN", "ENT"] });
  assert.equal(notes.excluded, true);
  assert.equal(credit.excluded, true);
});

test("does not classify consumer brand entertainment promotions", () => {
  const result = classifyRelease({
    title: "Decoy Wines Expands Emmy Awards Season Partnership",
    industry: ["ENT", "FLM"]
  });
  assert.deepEqual(result.categories, []);
});

test("classifies TV-branded services when Cision confirms the television industry", () => {
  const result = classifyRelease({
    title: "Company Sets Subscriber Targets for IDILIO TV",
    industry: ["TVN", "MLM"]
  });
  assert.ok(result.categories.includes("television"));
});

test("classifies digital-media consortium launches", () => {
  const result = classifyRelease({
    title: "Local Media Consortium Launches AI Accelerator",
    industry: ["PUB"]
  });
  assert.ok(result.categories.includes("digital"));
});
