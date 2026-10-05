// Loads the NHL season files and builds per-player records, per-team splits and fame scores.
const fs=require('fs'); const path=require('path');
const D=path.join(__dirname,'data','nhl-stats');
const J=p=>JSON.parse(fs.readFileSync(path.join(D,p)));
const manifest=J('manifest.json');
const CUR=+String(manifest.currentSeason).slice(0,4);   // season in progress (or about to start); its numbers count, but nobody has 'led the league' in it yet
const DONE=CUR-1;                                        // last completed season
const LAST=manifest.currentSeason;
const asOf=new Date(manifest.generatedAt);
const seasons=fs.readdirSync(path.join(D,'season')).filter(s=>/^\d{8}$/.test(s)&&+s<=LAST).sort();
const rows=(file)=>{ try{ const d=J(file); return d.r.map(r=>{const o={}; d.f.forEach((k,i)=>o[k]=r[i]); return o;}); }catch(e){ return []; } };
const players=new Map(); const teamNames={}; const champs={}; const divisions={}; const teamSeasons={};
const merge=t=>t==='PHX'?'ARI':t;
function get(o,kind){ let p=players.get(o.id); if(!p){ p={id:o.id,name:o.name,kind,pos:kind==='G'?'G':o.pos,rs:[],po:[],teams:new Set(),gp:0,g:0,a:0,p:0,pim:0,w:0,so:0,shG:0,gwg:0,otg:0,pgp:0,pg:0,pp:0,pw:0}; players.set(o.id,p);} 
  for(const k of ['birth','ht','wt','nat','dY','dR','dO']) if(o[k]!=null&&p[k]==null) p[k]=o[k]; return p; }
for(const s of seasons){ const Y=+s.slice(0,4);
  for(const t of rows(`season/${s}/teams-2.json`)){ (teamNames[t.abbrev]=teamNames[t.abbrev]||{})[Y]=t.name; (teamSeasons[t.abbrev]=teamSeasons[t.abbrev]||{})[Y]={gp:t.gp||0,ptPct:t.ptPct||0}; if(Y>=DONE&&t.division) divisions[t.abbrev]=t.division; }
  const t3=rows(`season/${s}/teams-3.json`); if(t3.length){ const top=t3.slice().sort((a,b)=>b.w-a.w);   // the champion is the team with the most playoff wins; for the season in progress, only once someone has all 16
    if(Y<CUR||top[0].w>=16) champs[Y]={abbrev:top[0].abbrev,name:top[0].name,w:top[0].w,next:top[1]&&top[1].w}; }
  for(const o of rows(`season/${s}/skaters-2.json`)){ const p=get(o,'S'); const r={Y,teams:o.teams.split(','),gp:o.gp,g:o.g,a:o.a,p:o.p,pim:o.pim||0,pm:o.pm,shG:o.shG||0,ppG:o.ppG||0,gwg:o.gwg||0,otg:o.otg||0}; p.rs.push(r);
    p.gp+=r.gp;p.g+=r.g;p.a+=r.a;p.p+=r.p;p.pim+=r.pim;p.shG+=r.shG;p.gwg+=r.gwg;p.otg+=r.otg; r.teams.forEach(t=>p.teams.add(merge(t))); }
  for(const o of rows(`season/${s}/goalies-2.json`)){ const p=get(o,'G'); const r={Y,teams:o.teams.split(','),gp:o.gp,w:o.w||0,so:o.so||0,svPct:o.svPct,gaa:o.gaa,g:o.g||0}; p.rs.push(r);
    p.gp+=r.gp;p.w+=r.w;p.so+=r.so;p.g+=r.g; r.teams.forEach(t=>p.teams.add(merge(t))); }
  for(const o of rows(`season/${s}/skaters-3.json`)){ const p=get(o,'S'); const r={Y,teams:o.teams.split(','),gp:o.gp,g:o.g,a:o.a,p:o.p,otg:o.otg||0,gwg:o.gwg||0}; p.po.push(r); p.pgp+=r.gp;p.pg+=r.g;p.pp+=r.p;p.potg=(p.potg||0)+r.otg;p.pgwg=(p.pgwg||0)+r.gwg; }
  for(const o of rows(`season/${s}/goalies-3.json`)){ const p=get(o,'G'); const r={Y,teams:o.teams.split(','),gp:o.gp,w:o.w||0}; p.po.push(r); p.pgp+=r.gp;p.pw+=r.w; }
}
// league ranks per season
const rankOf=(list,key)=>{ const s=list.slice().sort((a,b)=>b.r[key]-a.r[key]); const m=new Map(); let rank=0,prev=null; s.forEach((x,i)=>{ if(x.r[key]!==prev){rank=i+1;prev=x.r[key];} m.set(x,rank); }); return m; };
const bySeason={}; const SIZE={};
for(const p of players.values()) for(const r of p.rs){ (bySeason[r.Y]=bySeason[r.Y]||[]).push({p,r}); }
for(const Y in bySeason){ if(+Y>=CUR) continue; const all=bySeason[Y]; const sk=all.filter(x=>x.p.kind==='S'), gl=all.filter(x=>x.p.kind==='G'), df=sk.filter(x=>x.p.pos==='D');
  SIZE[Y]={sk:sk.length,gl:gl.length};
  const rp=rankOf(sk,'p'), rg=rankOf(sk,'g'), ra=rankOf(sk,'a'), rpim=rankOf(sk,'pim'), rd=rankOf(df,'p'), rw=rankOf(gl,'w');
  sk.forEach(x=>{x.r.rkP=rp.get(x);x.r.rkG=rg.get(x);x.r.rkA=ra.get(x);x.r.rkPim=rpim.get(x);}); df.forEach(x=>x.r.rkD=rd.get(x)); gl.forEach(x=>x.r.rkW=rw.get(x)); }
const AWARD=new Map(); // id -> bonus, filled by build.js from hand lists
function fame(p){
  const last=Math.max(...p.rs.map(r=>r.Y),...p.po.map(r=>r.Y),0), first=Math.min(...p.rs.map(r=>r.Y),...p.po.map(r=>r.Y));
  p.first=first; p.last=last;
  const ago=DONE-last; let rec = ago<=0?1.08: ago<=6?1.06: ago<=14?1.04: ago<=22?1.0: ago<=31?0.96: ago<=41?0.92: ago<=56?0.86:0.76;
  let f=0;
  if(p.kind==='S'){
    const dmul=p.pos==='D'?1.35:1;
    f+=30*Math.min(1,Math.sqrt(p.p*dmul/1700))+4*Math.min(1,p.gp/1300);
    let s=0; for(const r of p.rs){ const a=r.rkP,b=r.rkG,c=r.rkD;
      if(r.gp>=20){ const sc=Math.max(0.25,Math.min(1,(SIZE[r.Y]||{}).sk/500));
        s+= a===1?7:sc*(a<=3?5:a<=5?4:a<=10?3:a<=20?1.5:a<=40?0.5:0); s+= b===1?4:sc*(b<=3?2.5:b<=5?1.5:b<=10?0.8:0); if(c) s+= c===1?4*Math.max(sc,0.6):sc*(c<=3?2.5:c<=5?1.5:c<=10?0.7:0); } }
    f+=50*(1-Math.exp(-s/35))+0.12*s; if(rec<1) rec+=(1-rec)*Math.min(1,s/80);
    f+=10*Math.min(1,Math.sqrt(p.pp*(p.pos==='D'?1.5:1)/180));
    f+=6*Math.min(1,p.pim/3000);
    if(p.dO){ const d=p.dO===1?32:p.dO<=3?12:p.dO<=10?4:0; f+=d*(first>=2004?1:0.5)*Math.max(0.3,1-p.p/600); }
    if(last>=DONE){ let best=0; for(const r of p.rs) if(r.Y>=DONE-3&&r.gp>=30) best=Math.max(best,r.p/r.gp); f+=14*Math.max(0,Math.min(1,p.pos==='D'?(best-0.3)/0.6:(best-0.5)/0.8)); }
  } else {
    f+=34*Math.min(1,Math.sqrt(p.w/550))+4*Math.min(1,p.gp/900);
    let s=0; for(const r of p.rs){ const a=r.rkW; const sc=Math.max(0.2,Math.min(1,(SIZE[r.Y]||{}).gl/60)); if(a&&r.gp>=20) s+= a===1?6*Math.max(sc,0.6):sc*(a<=3?4:a<=5?2.5:a<=10?1.2:0); }
    f+=36*(1-Math.exp(-s/22))+0.2*s; if(rec<1) rec+=(1-rec)*Math.min(1,s/40); f+=5*Math.min(1,p.so/80); f+=12*Math.min(1,Math.sqrt(p.pw/90));
    if(last>=DONE){ let best=0; for(const r of p.rs) if(r.Y>=DONE-2) best=Math.max(best,r.w); f+=10*Math.min(1,best/35); }
  }
  f+=(AWARD.get(p.id)||0);
  return f*rec;
}

/* ---- per-team splits for traded seasons, from the Hockey Databank (through 2017-18) ---- */
const DB=path.join(__dirname,'data','hockey-databank')+'/';
function csv(file){ const txt=fs.readFileSync(file,'utf8'); const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<txt.length;i++){ const ch=txt[i];
    if(q){ if(ch==='"'){ if(txt[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else if(ch==='"') q=true; else if(ch===','){ row.push(cur); cur=''; } else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; } else if(ch!=='\r') cur+=ch; }
  if(cur||row.length){ row.push(cur); rows.push(row); }
  const h=rows.shift(); return rows.filter(r=>r.length>1).map(r=>{const o={}; h.forEach((k,i)=>o[k]=r[i]); return o;}); }
const nrm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[.'’`]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const TM={AND:'ANA',ATF:'AFM',BKN:'BRK',CAL:'CGY',CBS:'CBJ',CLF:'CGS',COR:'CLR',DTC:'DCG',DTF:'DFL',FLO:'FLA',HAR:'HFD',MTM:'MMR',MTW:'MWN',NAS:'NSH',OTS:'SEN',PHO:'PHX',PHQ:'QUA',PIP:'PIR',QUB:'QBD',STE:'SLE',TOA:'TAN',TRS:'TSP',VEG:'VGK',WAS:'WSH'};
const master=csv(DB+'Master.csv');
const byBirth=new Map(), byNm=new Map();
for(const p of players.values()){ const ln=nrm(p.name).split(' ').pop(); if(p.birth){ const k=p.birth+'|'+ln; (byBirth.get(k)||byBirth.set(k,[]).get(k)).push(p); } const k2=nrm(p.name); (byNm.get(k2)||byNm.set(k2,[]).get(k2)).push(p); }
const dbToP=new Map(); let dbMatched=0;
for(const m of master){ if(!m.playerID) continue; let c=[];
  if(m.birthYear&&m.birthMon&&m.birthDay){ const b=`${m.birthYear}-${String(m.birthMon).padStart(2,'0')}-${String(m.birthDay).padStart(2,'0')}`; c=byBirth.get(b+'|'+nrm(m.lastName).split(' ').pop())||[]; }
  if(c.length!==1){ const n=byNm.get(nrm(m.firstName+' '+m.lastName))||[]; const f=n.filter(p=>!p.birth||!m.birthYear||p.birth.slice(0,4)===m.birthYear); if(f.length===1) c=f; else if(c.length!==1) c=[]; }
  if(c.length===1){ dbToP.set(m.playerID,c[0]); c[0].dbid=m.playerID; dbMatched++; } }
const num=v=>v===''||v==null?0:+v;
let splitOk=0,splitBad=0;
function attach(rows,isG){ const grp=new Map(); for(const r of rows){ if(r.lgID!=='NHL') continue; const k=r.playerID+'|'+r.year; (grp.get(k)||grp.set(k,[]).get(k)).push(r); }
  for(const [k,st] of grp){ if(st.length<2) continue; const [pid,y]=k.split('|'); const p=dbToP.get(pid); if(!p||(isG?p.kind!=='G':p.kind!=='S')) continue; const r=p.rs.find(x=>x.Y===+y); if(!r||r.teams.length<2) continue;
    const sp={}; for(const s of st){ const t=TM[s.tmID]||s.tmID; const o=sp[t]||(sp[t]={gp:0,g:0,a:0,p:0,pim:0,w:0,so:0}); o.gp+=num(s.GP); if(isG){ o.w+=num(s.W); o.so+=num(s.SHO); } else { o.g+=num(s.G); o.a+=num(s.A); o.p+=num(s.Pts); o.pim+=num(s.PIM); } }
    const tot=Object.values(sp).reduce((a,o)=>({gp:a.gp+o.gp,g:a.g+o.g,p:a.p+o.p,w:a.w+o.w}),{gp:0,g:0,p:0,w:0});
    const sameTeams=Object.keys(sp).sort().join()===r.teams.slice().sort().join();
    const sameTot=isG?(tot.gp===r.gp&&tot.w===r.w):(tot.gp===r.gp&&tot.g===r.g&&tot.p===r.p);
    if(sameTeams&&sameTot){ r.split=sp; splitOk++; } else splitBad++; } }
attach(csv(DB+'Scoring.csv'),false); attach(csv(DB+'Goalies.csv'),true);
/* extra splits looked up one player at a time from the NHL's player pages; each must reconcile with the season total */
const extraSplits={}; const NAME2AB={};
const squash=n=>nrm(n).replace(/ /g,'');      // "Black Hawks" and "Blackhawks", "Montréal" and "Montreal" are the same team
for(const ab in teamNames) for(const y in teamNames[ab]) NAME2AB[squash(teamNames[ab][y])+'|'+y]=ab;
if(fs.existsSync(__dirname+'/splits.txt')) for(const line of fs.readFileSync(__dirname+'/splits.txt','utf8').split('\n')){ const c=line.split('|').map(x=>x.trim()); if(c.length<5) continue;
  const Y=+c[1].slice(0,4), ab=NAME2AB[squash(c[2])+'|'+Y]; const key=c[0]+'|'+Y; if(!ab){ console.error('splits: unknown team',line); continue; }
  const o=(extraSplits[key]=extraSplits[key]||{}); const v=c.slice(3).map(Number); const e=o[ab]||(o[ab]=v.map(()=>0)); v.forEach((x,i)=>e[i]+=x); }
let extraOk=0, extraStale=0, extraBad=[];
for(const key in extraSplits){ const [id,y]=key.split('|').map(Number); const p=players.get(id); const r=p&&p.rs.find(x=>x.Y===y); if(!r||r.teams.length<2){ extraBad.push(key+' no traded season'); continue; }
  const isG=p.kind==='G', sp={};
  for(const t in extraSplits[key]){ const v=extraSplits[key][t]; sp[t]=isG?{gp:v[0],w:v[1],so:v[2]||0,g:0,a:0,p:0,pim:0}:{gp:v[0],g:v[1],a:v[2],p:v[1]+v[2],pim:v[3],w:0,so:0}; }
  const tot=k=>Object.values(sp).reduce((a,o)=>a+o[k],0);
  const uniq=[...new Set(r.teams)], missing=uniq.filter(t=>!sp[t]), strange=Object.keys(sp).filter(t=>!uniq.includes(t));
  if(!strange.length&&missing.length===1){ const m={}; for(const k of ['gp','g','a','p','pim','w','so']) m[k]=(r[k]||0)-tot(k); if(Object.values(m).every(v=>v>=0)&&m.gp>0) sp[missing[0]]=m; }
  const ok=!strange.length&&uniq.every(t=>sp[t])&&tot('gp')===r.gp&&(isG?tot('w')===r.w:(tot('g')===r.g&&tot('p')===r.p&&tot('pim')===(r.pim||0)));
  if(ok){ r.split=sp; extraOk++; } else if(y>=CUR) extraStale++;      // a split for the season in progress goes stale as soon as he plays again; fetch-splits.js replaces it when it matters
  else extraBad.push(key+' '+p.name+' got '+JSON.stringify(extraSplits[key])+' vs '+r.teams+' gp'+r.gp+(isG?' w'+r.w:' g'+r.g+' p'+r.p+' pim'+r.pim)); }
/* stints(p): one entry per team per season. known=false when a traded season has no split (only the combined line is known). */
function stints(p){ const out=[]; for(const r of p.rs){ if(r.teams.length===1) out.push({Y:r.Y,t:merge(r.teams[0]),known:true,gp:r.gp,g:r.g||0,a:r.a||0,p:r.p||0,pim:r.pim||0,w:r.w||0,so:r.so||0});
    else if(r.split) for(const t in r.split) out.push(Object.assign({Y:r.Y,t:merge(t),known:true},r.split[t]));
    else for(const t of r.teams) out.push({Y:r.Y,t:merge(t),known:false,gp:r.gp,g:r.g||0,a:r.a||0,p:r.p||0,pim:r.pim||0,w:r.w||0,so:r.so||0}); }
  return out; }
const splitStats={dbMatched,splitOk,splitBad,extraOk,extraStale,extraBad};
module.exports={players,teamNames,teamSeasons,champs,divisions,seasons,J,fame,AWARD,merge,LAST,CUR,DONE,asOf,stints,splitStats,csv,nrm,dbToP,DB};
