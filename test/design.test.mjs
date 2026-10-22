import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const proto = join(root, "prototype");
const tokensJson = JSON.parse(readFileSync(join(root, "tokens", "tokens.json"), "utf8"));
const tokensCss = readFileSync(join(root, "tokens", "tokens.css"), "utf8");

const screens = ["first-run", "lobby", "chat", "services", "wallet", "settings"];
const enPages = screens.map((s) => join(proto, `${s}.html`));
const arPages = screens.map((s) => join(proto, "ar", `${s}.html`));
const allPages = [...enPages, ...arPages, join(proto, "index.html"), join(proto, "design-system.html")];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const htmlFiles = allPages.filter((p) => existsSync(p));

function luminance(hex) {
  const channels = hex.replace("#", "").match(/../g).map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function hrefs(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

test("A1 tokens cover both themes and every required pair meets 4.5 to 1", () => {
  const required = ["bg", "surface", "text", "text-muted", "primary", "on-primary", "border", "danger"];
  for (const theme of ["light", "dark"]) {
    const colors = tokensJson.color[theme];
    assert.ok(colors, `missing theme ${theme}`);
    for (const key of required) {
      assert.match(colors[key] ?? "", /^#[0-9a-f]{6}$/i, `${theme}.${key} must be #rrggbb`);
    }
    const pairs = [
      ["text", "bg"],
      ["text", "surface"],
      ["text-muted", "bg"],
      ["text-muted", "surface"],
      ["on-primary", "primary"],
      ["danger", "bg"],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(colors[fg], colors[bg]);
      assert.ok(ratio >= 4.5, `${theme} ${fg} on ${bg} is ${ratio.toFixed(2)}`);
    }
  }
});

test("A1 tokens.css mirrors tokens.json, light default, dark by media query and attribute", () => {
  const light = tokensJson.color.light;
  const dark = tokensJson.color.dark;
  const rootBlock = tokensCss.slice(0, tokensCss.indexOf("@media"));
  for (const [key, value] of Object.entries(light)) {
    assert.ok(rootBlock.includes(`--color-${key}: ${value}`), `root must hold light ${key}`);
  }
  const media = tokensCss.slice(tokensCss.indexOf("@media"), tokensCss.indexOf('[data-theme="dark"]'));
  for (const [key, value] of Object.entries(dark)) {
    assert.ok(media.includes(`--color-${key}: ${value}`), `media query must hold dark ${key}`);
  }
  const attr = tokensCss.slice(tokensCss.indexOf('[data-theme="dark"]'));
  for (const [key, value] of Object.entries(dark)) {
    assert.ok(attr.includes(`--color-${key}: ${value}`), `data-theme dark must hold ${key}`);
  }
});

test("A2 six screens exist in English and Arabic and Arabic flows right to left", () => {
  for (const page of allPages.filter((p) => !p.endsWith("index.html") && !p.endsWith("design-system.html"))) {
    assert.ok(existsSync(page), `missing ${page}`);
  }
  for (const page of arPages) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /<html lang="ar" dir="rtl">/, `${page} must be Arabic and rtl`);
  }
  for (const page of enPages) {
    assert.match(readFileSync(page, "utf8"), /<html lang="en">/, `${page} must be English`);
  }
});

test("A3 every screen sets a viewport and uses the tokens at phone width", () => {
  const appCss = readFileSync(join(proto, "assets", "app.css"), "utf8");
  assert.match(appCss, /@media \(max-width: 420px\)/, "app.css needs a phone width breakpoint");
  for (const page of allPages) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/, `${page} viewport`);
    assert.ok(html.includes("tokens/tokens.css"), `${page} loads tokens.css`);
    assert.ok(html.includes("assets/app.css"), `${page} loads app.css`);
    assert.ok(/var\(--/.test(html), `${page} uses token variables`);
  }
});

test("A4 every screen is reachable from index.html and no local link is broken", () => {
  for (const file of walk(proto).filter((p) => p.endsWith(".html"))) {
    const html = readFileSync(file, "utf8");
    for (const href of hrefs(html)) {
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const target = resolve(dirname(file), href.split("#")[0]);
      assert.ok(existsSync(target), `${file} links to missing ${href}`);
    }
  }
  const seen = new Set();
  const queue = [join(proto, "index.html")];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const html = readFileSync(file, "utf8");
    for (const href of hrefs(html)) {
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      queue.push(resolve(dirname(file), href.split("#")[0]));
    }
  }
  for (const page of allPages) {
    assert.ok(seen.has(page), `${page} not reachable from index.html`);
  }
});

test("A5 every page sets its language, images carry alt text and controls are labelled", () => {
  for (const page of allPages) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /<html lang="[a-z]{2}"/, `${page} language`);
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
      assert.match(img, /alt="[^"]*"/, `${page} image needs alt text`);
    }
    for (const control of html.match(/<(input|select|textarea)\b[^>]*>/g) ?? []) {
      const id = control.match(/id="([^"]+)"/)?.[1];
      assert.ok(id, `${page} control needs an id: ${control}`);
      const labelled = new RegExp(`<label[^>]*for="${id}"`).test(html) || /aria-label=/.test(control);
      assert.ok(labelled, `${page} control ${id} needs a label`);
    }
    for (const button of html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []) {
      assert.ok(textOf(button).trim().length > 0 || /aria-label=/.test(button), `${page} button needs text`);
    }
  }
});

test("house rules: Latin digits only and no long dashes in visible text", () => {
  for (const page of allPages) {
    const text = textOf(readFileSync(page, "utf8"));
    assert.ok(!/[\u0660-\u0669\u06F0-\u06F9]/.test(text), `${page} uses Arabic-Indic digits`);
    assert.ok(!/[\u2013\u2014]/.test(text), `${page} uses a long dash`);
  }
});

test("tokens expose type, space and radius scales", () => {
  for (const group of ["type", "space", "radius"]) {
    assert.ok(tokensJson[group], `missing ${group}`);
    assert.ok(Object.keys(tokensJson[group]).length > 0, `${group} empty`);
  }
});
