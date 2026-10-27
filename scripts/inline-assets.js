// Replace asset tokens in the built page with base64 data URIs (the page stays one self-contained file).
const fs = require('fs');
const [, , out, assets] = process.argv;
const map = { '{{IMG_DASHCAM}}': 'uniden-dashcam.webp', '{{IMG_SECCAM}}': 'uniden-security-camera.webp',
  '{{IMG_GEN_HOTSPOT}}': 'generic-hotspot.webp', '{{IMG_GEN_PHONE}}': 'generic-phone-tablet.webp', '{{IMG_GEN_ROUTER}}': 'generic-router.webp',
  '{{IMG_SKY}}': 'hero-sky.webp',
  '{{IMG_PHONE_FRAME}}': 'phone-frame.webp', '{{IMG_PTZ}}': 'uniden-ptz-camera.webp' };
let s = fs.readFileSync(out, 'utf8');
for (const [tok, file] of Object.entries(map)) {
  const uri = 'data:image/webp;base64,' + fs.readFileSync(assets + '/' + file).toString('base64');
  s = s.split(tok).join(uri);
}
if (/\{\{IMG_/.test(s)) throw new Error('unreplaced asset token');
fs.writeFileSync(out, s);
