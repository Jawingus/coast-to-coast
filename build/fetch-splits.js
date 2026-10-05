// Fills in per-team numbers for players traded mid-season, straight from the NHL's player pages.
//   node fetch-splits.js         look up only the seasons the last build flagged (out/ambig.json)
//   node fetch-splits.js --all   re-check every line already in splits.txt as well
// Results are appended to splits.txt. lib.js only trusts a split whose teams add up to the player's season total.
const fs=require('fs'), path=require('path');
const FILE=path.join(__dirname,'splits.txt'), TODO=path.join(__dirname,'out','ambig.json');
const want=new Map();                                    // "id|season" -> true if goalie
if(fs.existsSync(TODO)) for(const a of JSON.parse(fs.readFileSync(TODO,'utf8'))) want.set(a.id+'|'+a.Y+String(a.Y+1),a.kind==='G');
let lines=fs.existsSync(FILE)?fs.readFileSync(FILE,'utf8').split('\n').filter(l=>l.trim()):[];
const keyOf=l=>{ const c=l.split('|').map(x=>x.trim()); return c[0]+'|'+c[1]; };
if(process.argv.includes('--all')) for(const l of lines){ const c=l.split('|'); if(c.length>=6&&!want.has(keyOf(l))) want.set(keyOf(l),c.length===6); }

function rowsFor(json,season,goalie){ const out=[];
  for(const t of json.seasonTotals||[]){ if(t.season!==season||t.leagueAbbrev!=='NHL'||t.gameTypeId!==2) continue;
    const team=t.teamName&&t.teamName.default; if(!team) continue; const n=k=>Number(t[k])||0;
    out.push(goalie?[team,n('gamesPlayed'),n('wins'),n('shutouts')]:[team,n('gamesPlayed'),n('goals'),n('assists'),n('pim')]); }
  return out; }
module.exports={rowsFor};
if(require.main===module) (async()=>{
  if(!want.size){ console.log('no trade splits to look up'); return; }
  const byPlayer=new Map(); for(const [k,g] of want){ const [id,season]=k.split('|'); (byPlayer.get(id)||byPlayer.set(id,[]).get(id)).push([+season,g]); }
  let ok=0, failed=0; const fresh=new Map();
  for(const [id,list] of byPlayer){
    try{ const res=await fetch(`https://api-web.nhle.com/v1/player/${id}/landing`,{headers:{'user-agent':'coast-to-coast fan trivia build'}}); if(!res.ok) throw new Error('HTTP '+res.status);
      const json=await res.json();
      for(const [season,goalie] of list){ const rows=rowsFor(json,season,goalie); if(rows.length<2){ failed++; console.log(`  ${id} ${season}: found ${rows.length} team rows, left alone`); continue; }
        fresh.set(id+'|'+season,rows.map(r=>[id,season,...r].join(' | '))); ok++; } }
    catch(e){ failed+=list.length; console.log(`  ${id}: ${e.message}`); }
    await new Promise(r=>setTimeout(r,250));              // be polite
  }
  lines=lines.filter(l=>!fresh.has(keyOf(l)));            // a fresh answer replaces whatever was on file for that player and season
  for(const rows of fresh.values()) lines.push(...rows);
  fs.writeFileSync(FILE,lines.join('\n')+'\n');
  console.log(`trade splits: ${ok} looked up, ${failed} not found`);
})();
