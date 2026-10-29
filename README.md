# Uniden Mobile

A clickable prototype of the Uniden Mobile microsite: the marketing site, the SIM activation flow and the customer account dashboard. All 16 screens are in a single self-contained page.

**Live:** https://uniden-mobile.vercel.app

## What's inside

- **Home:** plans, the "Need help choosing?" guide, how it works and what every plan includes.
- **Activation (7 steps for data, 8 for talk and text):** get started, SIM serial, choose your plan, your details, your number, check and confirm, payment, verify your identity, activated.
- **Account:** dashboard, usage, top up, my plan, payments and receipts, and help, with a light and dark theme.

Everything runs in the browser with sample data. Nothing is sent anywhere, and no real payments or identity checks happen.

Jump straight to a screen with a hash, for example `/#account`, `/#usage`, `/#myplan` or `/#plan`.

## Project layout

```
index.html              the built site: one file, styles, script and images inlined
src/02-styles.css       base styles and tokens
src/02b-utils.css       component, layout and theme styles
src/03-sprite.svg       icon sprite and logo
src/04-body.html        markup for every screen
src/05-app.js           routing, state and rendering
assets/                 images, inlined into index.html at build time
scripts/inline-assets.js   swaps {{IMG_*}} tokens for base64 data URIs
build.sh                builds index.html from src/ and assets/
vercel.json             hosting headers (keeps the prototype out of search results)
```

## Build

Needs [Node.js](https://nodejs.org).

```sh
sh build.sh
```

This rewrites `index.html`. Open it in any browser, no server needed.

## Deploy

The site is hosted on Vercel. From this folder:

```sh
npx vercel deploy --prod
```

`.vercelignore` keeps the source and assets out of the deployment, so only `index.html` is served.

## Images

- Uniden dash cam, security camera and Looop 4G Wi-Fi hotspot: Uniden product photography.
- Generic phone and tablet, router, phone frame and hero sky: generated images, edited for the site.
- Hero clouds: rendered procedurally.
