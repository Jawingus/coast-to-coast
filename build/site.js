// Turns out/data.json + template.html + config.json into the pages:
//   ../index.html       the public site (full page, link-preview tags, leaderboard switched on)
//   out/artifact.html   an offline copy with no server calls
const fs=require('fs'), path=require('path');
const here=f=>path.join(__dirname,f);
const cfg=JSON.parse(fs.readFileSync(here('config.json'),'utf8'));
const data=fs.readFileSync(here('out/data.json'),'utf8').replace(/</g,'\\u003c');
const fill=(s,online)=>s.replace('/*DATA*/',()=>data).split('__NAME__').join(cfg.name).split('__SITE__').join(cfg.site)
  .split('__API_URL__').join(online?cfg.url||'':'').split('__API_KEY__').join(online?cfg.key||'':'');
const tpl=fs.readFileSync(here('template.html'),'utf8');
const m=tpl.match(/^\s*<title>.*?<\/title>\s*(<link[^>]*>)\s*/s);
if(!m) throw new Error('template.html should start with a <title> and the font <link>');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const desc='NHL trivia where the rarest answer wins. Seven prompts a day: the more obscure your answer, the further you carry the puck up the ice.';
const fav="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2305080D'/%3E%3Crect x='8' y='20' width='48' height='24' rx='12' fill='%230D1B29' stroke='%23415A72' stroke-width='2'/%3E%3Cpath d='M32 20v24' stroke='%23FF3D55' stroke-width='2'/%3E%3Cpath d='M16 32h26' stroke='%237BD3FF' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='44' cy='32' r='5' fill='%23F4FAFF'/%3E%3C/svg%3E";
const head=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(cfg.name)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#05080D">
<link rel="canonical" href="${esc(cfg.site)}">
<meta property="og:title" content="${esc(cfg.name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(cfg.site)}">
<meta property="og:image" content="${esc(cfg.site)}og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A hockey rink with seven answers plotted from obvious to obscure. The rarest answer wins.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(cfg.name)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(cfg.site)}og.jpg">
<link rel="icon" href="${fav}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${m[1]}
<style>
html{-webkit-text-size-adjust:100%}
body{margin:0}
[hidden]{display:none!important}
img{max-width:100%}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}
</style>
</head>
<body>
`;
const site=head+fill(tpl.slice(m[0].length),true)+'\n</body>\n</html>\n';
fs.writeFileSync(here('../index.html'),site);
fs.writeFileSync(here('out/artifact.html'),fill(tpl,false));
for(const left of ['__NAME__','__SITE__','__API_URL__','__API_KEY__','/*DATA*/']) if(site.includes(left)) throw new Error('unfilled placeholder '+left);
console.log('index.html',site.length,'bytes');
