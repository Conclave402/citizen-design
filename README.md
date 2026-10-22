# Kognai Citizen design system and prototype

A mobile first design system and clickable prototype for the Kognai citizen app:
first run, citizen lobby, chat, services (learn, create, earn), credits and
wallet, settings. Every screen exists in English (left to right) and Arabic
(right to left), in light and dark themes.

## Layout

- `tokens/tokens.json`: colour, type, space and radius tokens. Colour has
  `light` and `dark` themes, each with `bg`, `surface`, `text`, `text-muted`,
  `primary`, `on-primary`, `border` and `danger` as `#rrggbb`.
- `tokens/tokens.css`: the same values as CSS custom properties. Light is the
  default, dark applies under `prefers-color-scheme: dark` and under
  `[data-theme="dark"]`.
- `prototype/index.html`: entry point, links every screen in both languages.
- `prototype/design-system.html`: tokens and core components on one page.
- `prototype/{first-run,lobby,chat,services,wallet,settings}.html`: the six
  screens in English.
- `prototype/ar/`: the same six in Arabic with `<html lang="ar" dir="rtl">`.
- `prototype/assets/app.css`: components built only from the token variables.

## Run the checks

The suite uses only the Node standard library, runs offline and needs no
install:

```
node --test test/*.test.mjs
```

Current result: 8 tests, 8 pass, 0 fail.

## Acceptance mapping

- A1 `test/design.test.mjs`: both themes hold the eight required colours, every
  text pair (text and text-muted on bg and surface, on-primary on primary,
  danger on bg) reaches at least 4.5 to 1 in light and dark, and
  `tokens/tokens.css` mirrors `tokens/tokens.json`.
- A2 every screen exists in English and Arabic; the Arabic pages set
  `lang="ar"` and `dir="rtl"`.
- A3 every page sets the viewport, loads the token stylesheet and uses token
  variables; `app.css` has a phone breakpoint at 420 px and fluid layouts down
  to 320 px.
- A4 every local link resolves and all screens are reachable from
  `index.html` (breadth first walk in the test).
- A5 every page sets its language, every image has alt text and every form
  control has a label.
- A6 reviewed by the Founder with three test users: this is a PACT time item
  and is not something the repository can prove offline.

Also tested: Latin digits only (including in Arabic) and no long dashes in any
text people see.

## Notes

- No network requests, no analytics and no secrets in the repository.
- The colours start from the Kognai citizen palette of terracotta, charcoal and
  cream, adjusted so the contrast pairs pass in both themes.
- The prototype is static HTML and CSS, so it can be opened from disk or
  served from any static host.
