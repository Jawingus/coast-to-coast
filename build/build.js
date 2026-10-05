// Builds every prompt in the game from the raw stats and writes out/data.json (site.js turns that into the page).
//   node build.js            build
//   node build.js "leafs"    build, then print the prompts whose name matches, to eyeball the rankings
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const L=require('./lib.js'); const {players,teamNames,teamSeasons,champs,divisions,merge,J,AWARD,stints,csv,nrm:norm,dbToP,DB,CUR:CURY,DONE,asOf}=L;
const OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const AS_OF=asOf.toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'America/Toronto'});
const ps=[...players.values()];
const sl=Y=>`${Y}–${String((Y+1)%100).padStart(2,'0')}`;
const N=n=>n.toLocaleString('en-US'); const an=t=>(/^(8|11|18)/.test(String(t))?'an':'a');
ps.forEach(p=>{ p.first=Math.min(...p.rs.map(r=>r.Y),...p.po.map(r=>r.Y)); p.last=Math.max(...p.rs.map(r=>r.Y),...p.po.map(r=>r.Y)); p.st=stints(p); });
const CANON={};
("alex alexander alexandre aleksander aleksandr|mike michael mikey micheal|matt matthew mathew matty mat|nick nicklas nicholas nicolas niklas nik nicky|steve steven stephen stevie|"+
 "pat patrick patrik patric|dan danny daniel|dave david davey|bob bobby robert rob robbie|bill billy william will willie willy|jim jimmy james|joe joseph joey|tom tommy thomas tomas|"+
 "tony anthony|chris christopher kris kristopher|jon jonathan john johnny jonny jonathon|zach zack zachary zac|josh joshua|sam samuel sammy|ben benjamin|max maxime maxim maksim|"+
 "andy andrew drew|tim timothy|ken kenny kenneth|ron ronnie ronald|don donald donnie|ed eddie edward eddy|rick ricky richard rich dick|greg gregory gregg|jeff jeffrey geoff geoffrey|"+
 "brad bradley|doug douglas|phil philip phillip philippe|vince vincent vinny vinnie|evgeni evgeny evgenii yevgeni|sergei sergey|alexei alexey|andrei andrey|nikolai nikolay|"+
 "dmitri dmitry dimitri|ted teddy theodore theo|jake jacob jakob|nate nathan|cam cameron|gabe gabriel|marty martin|larry lawrence|gerry jerry gerald|ray raymond|al allan alan allen|"+
 "fred freddie freddy frederik frederick fredrik|charlie charles chuck|pete peter petr|stan stanley|vic victor viktor|erik eric|mark marc|brian bryan|sean shawn shaun|mitch mitchell|"+
 "gord gordie gordon|dom dominik dominic|wes wesley|lou louis").split("|").forEach(g=>{const w=g.split(" "); w.forEach(x=>CANON[x]=w[0]);});
const canon=k=>{const t=k.split(' '); if(CANON[t[0]]) t[0]=CANON[t[0]]; return t.join(' ');};
const byName=new Map(), byCanon=new Map();
ps.forEach(p=>{ const k=norm(p.name); (byName.get(k)||byName.set(k,[]).get(k)).push(p); const c=canon(k); (byCanon.get(c)||byCanon.set(c,[]).get(c)).push(p); });
const ALIAS={'reggie lemelin':'rejean lemelin','robert fabbri':'robby fabbri','bryan hextall':'bryan hextall sr','olaf kolzig':'olie kolzig','p k subban':'pk subban','sweeney schriner':'sweeney schriner','johnny quilty':'john quilty','tiger williams':'dave williams','j s giguere':'jean-sebastien giguere'};
const unresolved=[];
function resolve(name,year,kind,quiet){ const k=norm(ALIAS[norm(name)]||name); let c=byName.get(k)||byCanon.get(canon(k))||[];
  if(kind){ const f=c.filter(p=>p.kind===kind); if(f.length) c=f; }
  if(c.length>1&&year){ const f=c.filter(p=>p.first<=year+1&&p.last+3>=year); if(f.length) c=f; }
  if(c.length>1) c=[c.slice().sort((a,b)=>b.gp-a.gp)[0]];
  if(!c.length){ if(!quiet) unresolved.push(name); return null; } return c[0]; }
const yr=d=>{const m=String(d).match(/\d{4}/); return m?+m[0]:null;};

/* ---------- hand-ranked lists ---------- */
/* hand-lists.json is ordered by hand, most obvious answer first. A new winner goes wherever he belongs in that order. */
const HAND=JSON.parse(fs.readFileSync(path.join(__dirname,'hand-lists.json'),'utf8'));
const hand={};
[['cs',5],['fo',0],['cap',0],['calder',2],['norris',6]].forEach(([key,bonus])=>{
  hand[key]=HAND[key].map(a=>{ let y=yr(a.detail); if(key==='cap'&&/present/.test(a.detail)) y=DONE; if(key==='cs'||key==='calder'||key==='norris') y=y-1; if(key==='fo') y=y+2;
    const p=resolve(a.name,y); if(p&&bonus) AWARD.set(p.id,(AWARD.get(p.id)||0)+bonus); return {p,name:a.name,detail:a.detail}; }); });

/* ---------- awards: Hockey Databank through 2017-18, later seasons checked against Wikipedia ---------- */
const HANDAW=JSON.parse(fs.readFileSync(path.join(__dirname,'awards-recent.json'),'utf8')); const RECENT=HANDAW.awards;
const masterById=new Map(csv(DB+'Master.csv').map(m=>[m.playerID,m])); const awards={}; const awMiss=[];
for(const r of csv(DB+'AwardsPlayers.csv')){ if(r.lgID!=='NHL') continue; const a=r.award==='Pearson'?'Lindsay':r.award; let p=dbToP.get(r.playerID); if(!p){ const m=masterById.get(r.playerID); if(m) p=resolve(m.firstName+' '+m.lastName,+r.year,null,true); } if(!p){ if(RECENT[a]) awMiss.push(a+' '+r.year+' '+r.playerID); continue; } (awards[a]=awards[a]||[]).push({p,Y:+r.year,pos:r.pos}); }
for(const a in RECENT) for(const y in RECENT[a]) for(const part of RECENT[a][y].split('|')){ const [pos,nm]=part.includes(':')?part.split(':'):['',part]; const p=resolve(nm,+y); if(p) awards[a].push({p,Y:+y,pos}); }
const bump=(a,b,cap)=>{ const c=new Map(); for(const w of awards[a]||[]) c.set(w.p,(c.get(w.p)||0)+1); for(const [p,n] of c) AWARD.set(p.id,(AWARD.get(p.id)||0)+Math.min(cap,b*n)); };
bump('Hart',7,14); bump('Vezina',4,10); bump('Lindsay',3,8); bump('Selke',3,7); bump('First Team All-Star',2,10); bump('Second Team All-Star',1,4); bump('Lady Byng',1.5,4); bump('Art Ross',2,8);
/* Hall of Fame players: databank through 2018, later classes checked against Wikipedia */
const HOF_NEW=HANDAW.hallOfFame;
const hof=[];
for(const r of csv(DB+'HOF.csv')){ if(r.category!=='Player') continue; const p=dbToP.get(r.hofID.replace(/h$/,''))||resolve(r.name,null,null,true); hof.push({p:p&&p.last<=+r.year?p:null,name:r.name,Y:+r.year}); }
for(const y in HOF_NEW) for(const nm of HOF_NEW[y]){ const p=resolve(nm,null,null,true); hof.push({p:p&&p.last<=+y+1?p:null,name:nm,Y:+y}); }
for(const h of hof) if(h.p) AWARD.set(h.p.id,(AWARD.get(h.p.id)||0)+12);
ps.forEach(p=>p.f=L.fame(p));

/* ---------- "too clever": the go-to obscure picks that everyone reaches for (hand-curated) ---------- */
const TOO_CLEVER=`Patrik Stefan|Alexandre Daigle|Nail Yakupov|Rick DiPietro|Hugh Jessiman|Pavel Brendl|Jason Bonsignore|Nikita Filatov|Cam Barker|Brian Lawton|Doug Wickenheiser|Greg Joly|Alek Stojanov|Gilbert Brule|Griffin Reinhart|Alexander Svitov|Daniel Tkaczuk|Jesse Puljujarvi|Zach Hamill|
Mike Sillinger|Olli Jokinen|J.J. Daigneault|Michel Petit|Jim Dowd|Dominic Moore|Lee Stempniak|Brent Ashton|Derick Brassard|
Tie Domi|Bob Probert|Dave Williams|Marty McSorley|Dave Semenko|Stu Grimson|Georges Laraque|John Scott|Colton Orr|Tony Twist|Rob Ray|Donald Brashear|Zenon Konopka|George Parros|Dave Schultz|Chris Nilan|Derek Boogaard|Shawn Thornton|Paul Bissonnette|Sean Avery|Matthew Barnaby|Jordin Tootoo|Raffi Torres|Wade Belak|Tiger Williams|Darcy Tucker|Claude Lemieux|Ulf Samuelsson|Esa Tikkanen|
Andrew Raycroft|Vesa Toskala|Jonas Gustavsson|Jim Carey|Steve Mason|Roman Cechmanek|Dan Cloutier|Tommy Salo|Patrick Lalime|Jose Theodore|Ron Tugnutt|David Ayres|Scott Foster|Hardy Astrom|Andre Racicot|Darren Pang|Garth Snow|Arturs Irbe|Ilya Bryzgalov|Damian Rhodes|James Reimer|Ben Scrivens|Felix Potvin|Byron Dafoe|Manny Legace|Mike Smith|
Jonathan Cheechoo|Bernie Nicholls|Dennis Maruk|Rob Brown|Blaine Stoughton|Charlie Simmer|Jimmy Carson|Gary Leeman|Warren Young|Hakan Loob|Joe Juneau|Petr Klima|Fernando Pisani|Chris Kontos|John Druce|Ruslan Fedotenko|Bryan Bickell|Max Talbot|Ville Leino|Joel Ward|Wayne Babych|Jacques Richard|Reggie Leach|Butch Goring|Roger Crozier|
Nik Antropov|Alexei Ponikarovsky|Jason Blake|Mikhail Grabovski|Jeff Finger|Mike Komisarek|David Clarkson|Joffrey Lupul|Tyler Bozak|Jonas Hoglund|Kyle Wellwood|Matt Stajan|Shayne Corson|Bryan McCabe|Aki Berg|Frederik Gauthier|Leo Komarov|Martin Marincin|
Miroslav Satan|Radek Bonk|Marek Malik|Ziggy Palffy|Pavol Demitra|Petr Nedved|Maxim Afinogenov|Nikolai Zherdev|Alexander Semin|Valeri Bure|Oleg Tverdovsky|Sergei Samsonov|Alexei Yashin`.split('|').map(s=>s.trim()).filter(Boolean);
const tcMiss=[]; for(const nm of TOO_CLEVER){ const p=resolve(nm,null,null,true); if(p){ p.tc=true; p.f0=p.f; p.f+=14; } else tcMiss.push(nm); }

/* ---------- prompt assembly ---------- */
const NICK={ANA:'Ducks',BOS:'Bruins',BUF:'Sabres',CGY:'Flames',CAR:'Hurricanes',CHI:'Blackhawks',COL:'Avalanche',CBJ:'Blue Jackets',DAL:'Stars',DET:'Red Wings',EDM:'Oilers',FLA:'Panthers',LAK:'Kings',MIN:'Wild',MTL:'Canadiens',NSH:'Predators',NJD:'Devils',NYI:'Islanders',NYR:'Rangers',OTT:'Senators',PHI:'Flyers',PIT:'Penguins',SJS:'Sharks',SEA:'Kraken',STL:'Blues',TBL:'Lightning',TOR:'Maple Leafs',UTA:'Mammoth',VAN:'Canucks',VGK:'Golden Knights',WSH:'Capitals',WPG:'Jets',
  QUE:'Quebec Nordiques',HFD:'Hartford Whalers',WIN:'original Winnipeg Jets',MNS:'Minnesota North Stars',ATL:'Atlanta Thrashers',ARI:'Coyotes',AFM:'Atlanta Flames'};
const CUR=Object.keys(divisions).sort(); const isCur=new Set(CUR); const O6=['BOS','CHI','DET','MTL','NYR','TOR'];
const fullName=(ab,Y)=>((teamNames[ab]||{})[Y]||ab).replace('Montréal','Montreal');
const theT=T=>T==='WPG'?'current Winnipeg Jets':NICK[T];
/* every prompt about a current team goes in that team's own pack (t-TOR, t-MTL, ...) */
const packsFor=(teams,more)=>{ const out=new Set(more||[]); for(const t of teams||[]) if(isCur.has(t)) out.add('t-'+t); if(teams&&teams.length&&teams.every(t=>O6.includes(t))) out.add('o6'); return [...out]; };
const prompts=[]; const skipped=[]; const tooHard=[]; const AMBIG=new Map(); const taken_=new Set();
const amb=(p,Y,why)=>{ const k=p.id+'|'+Y; (AMBIG.get(k)||AMBIG.set(k,{p,Y,why:new Set()}).get(k)).why.add(why); };
function add(f,short,q,note,t,answers,o={}){ const min=o.min||14,max=o.max||320;
  const seen=new Set(); answers=answers.filter(a=>{const k=a.p?a.p.id:norm(a.name); if(seen.has(k)) return false; seen.add(k); return true;});
  if(answers.length<min||answers.length>max){ skipped.push(`${short} (${answers.length})`); return false; }
  const sc=(a,fm)=>a.fixed!=null?a.fixed:fm*(0.75+0.5*(a.ctx||0))+14*(a.ctx||0);
  answers.forEach(a=>{ a.score=sc(a,a.p?a.p.f:(a.f||5)); a.score0=sc(a,a.p?(a.p.f0||a.p.f):(a.f||5)); });
  const n=answers.length, fixed=answers[0].fixed!=null;
  if(fixed){ answers.sort((a,b)=>b.score-a.score);          // hand-ranked list: pull the go-to "obscure" picks back toward the middle
    const pulled=answers.filter((a,i)=>a.p&&a.p.tc&&i/(n-1)>=0.5);
    if(pulled.length&&pulled.length<=n/4){ answers=answers.filter(a=>!pulled.includes(a)); answers.splice(Math.floor(0.36*answers.length),0,...pulled); pulled.forEach(a=>a.tcFlag=true); } }
  else { const by0=answers.slice().sort((a,b)=>b.score0-a.score0); by0.forEach((a,i)=>{ if(a.p&&a.p.tc&&i/(n-1)>=0.5) a.tcFlag=true; }); answers.sort((a,b)=>b.score-a.score); }
  const packs=o.packs||[]; if(answers.every(a=>a.p&&a.p.kind==='G')&&!packs.includes('g')) packs.push('g');
  let main=o.main!==false;
  if(main){ const known=answers.filter(a=>(a.p?a.p.f:60)>=32).length; if(known<(o.known==null?(f==='R'?0:f==='M'||f==='S'||f==='A'?6:5):o.known)){ main=false; tooHard.push(short); } }
  if(!main&&!packs.length) return true;
  if(taken_.has(short)) return true;                     // a name is a prompt's identity (saved games and guess counts are filed under it), so the first one wins
  taken_.add(short); prompts.push({f,short,q,note,t,answers,packs,main,g:o.g||short}); return true; }
const THRU=`Regular season, through ${AS_OF}.`;
const S=p=>p.kind==='S', G=p=>p.kind==='G', Dm=p=>p.kind==='S'&&p.pos==='D';

// M: career milestones
function career(short,q,unit,filter,val,o={}){ const list=ps.filter(filter); const mx=Math.max(...list.map(val)), mn=Math.min(...list.map(val));
  return add('M',short,q,o.note||THRU,['c',unit],list.map(p=>({p,vals:[val(p)],ctx:o.noctx?0:0.6*(val(p)-mn)/((mx-mn)||1)})),o); }
career('500-goal scorers','Name a player with 500 or more career goals.','goals',p=>S(p)&&p.g>=500,p=>p.g);
career('1,000-point players','Name a player with 1,000 or more career points.','points',p=>S(p)&&p.p>=1000,p=>p.p);
career('800-assist players','Name a player with 800 or more career assists.','assists',p=>S(p)&&p.a>=800,p=>p.a);
career('1,400-game players','Name a skater who played 1,400 or more career games.','games',p=>S(p)&&p.gp>=1400,p=>p.gp);
career('2,500 PIM club','Name a player with 2,500 or more career penalty minutes.','penalty minutes',p=>S(p)&&p.pim>=2500,p=>p.pim,{packs:['pim']});
career('600-point defencemen','Name a defenceman with 600 or more career points.','points',p=>Dm(p)&&p.p>=600,p=>p.p);
career('200-goal defencemen','Name a defenceman with 200 or more career goals.','goals',p=>Dm(p)&&p.g>=200,p=>p.g);
career('300-win goalies','Name a goalie with 300 or more career wins.','wins',p=>G(p)&&p.w>=300,p=>p.w);
career('50-shutout goalies','Name a goalie with 50 or more career shutouts.','shutouts',p=>G(p)&&p.so>=50,p=>p.so);
career('700-game goalies','Name a goalie who played 700 or more career games.','games',p=>G(p)&&p.gp>=700,p=>p.gp);
const PY=Math.max(...ps.map(p=>Math.max(0,...p.po.map(r=>r.Y))))+1; const PO=`Playoffs, through ${PY}.`;
career('120 playoff points','Name a player with 120 or more career playoff points.','playoff points',p=>S(p)&&p.pp>=120,p=>p.pp,{note:PO,packs:['po']});
career('60 playoff goals','Name a player with 60 or more career playoff goals.','playoff goals',p=>S(p)&&p.pg>=60,p=>p.pg,{note:PO,packs:['po']});
career('60 playoff wins','Name a goalie with 60 or more career playoff wins.','playoff wins',p=>G(p)&&p.pw>=60,p=>p.pw,{note:PO,packs:['po']});
career('150 playoff games','Name a skater who played 150 or more career playoff games.','playoff games',p=>S(p)&&p.pgp>=150,p=>p.pgp,{note:PO,packs:['po']});
for(const t of [4,3]) if(career('Playoff overtime heroes',`Name a player with ${t===4?'four':'three'} or more career playoff overtime goals.`,'playoff overtime goals',p=>S(p)&&(p.potg||0)>=t,p=>p.potg,{note:PO,packs:['po'],max:90})) break;
career('15 playoff game-winners','Name a player with 15 or more career playoff game-winning goals.','playoff game-winners',p=>S(p)&&(p.pgwg||0)>=15,p=>p.pgwg,{note:PO,packs:['po']});
for(const t of [12,10,8]) if(career('Overtime specialists',`Name a player with ${t} or more career regular-season overtime goals.`,'overtime goals',p=>S(p)&&p.otg>=t,p=>p.otg,{max:80})) break;
career('20 shorthanded goals','Name a player with 20 or more career shorthanded goals.','shorthanded goals',p=>S(p)&&p.shG>=20,p=>p.shG);
career('70 game-winners','Name a player with 70 or more career game-winning goals.','game-winning goals',p=>S(p)&&p.gwg>=70,p=>p.gwg);
career('Eight-team journeymen','Name a player who suited up for eight or more NHL teams.','teams',p=>p.teams.size>=8,p=>p.teams.size,{min:12});
career('One-team 1,000-gamers','Name a skater who played 1,000 or more games, all for one team.','games',p=>S(p)&&p.gp>=1000&&p.teams.size===1,p=>p.gp);
career('Undrafted 500-point men','Name an undrafted skater with 500 or more career points.','points',p=>S(p)&&p.p>=500&&!p.dY&&p.first>=1980,p=>p.p,{note:'Careers that began in 1980 or later.',packs:['dr']});
career('Goalie goals','Name a goalie credited with a goal.','goals',p=>G(p)&&p.g>=1,p=>p.g,{min:8,noctx:1});
add('M','Point-a-game careers','Name a player who averaged a point per game over 400 or more career games.',THRU,['pg'],ps.filter(p=>S(p)&&p.gp>=400&&p.p/p.gp>=1).map(p=>({p,vals:[Math.round(100*p.p/p.gp)],ctx:0.3*Math.min(1,(p.p/p.gp-1)/0.6)})));
add('M','6-foot-7 and up','Name a player listed at 6-foot-7 or taller with 100 or more games.',THRU,['h'],ps.filter(p=>p.ht>=79&&p.gp>=100).map(p=>({p,vals:[p.ht],ctx:0.3*(p.ht-79)/3})));
add('M','5-foot-8 and under','Name a skater listed at 5-foot-8 or shorter with 300 or more career points.','Careers that began in 1967 or later.',['h'],ps.filter(p=>S(p)&&p.ht&&p.ht<=68&&p.p>=300&&p.first>=1967).map(p=>({p,vals:[p.ht]})));
{ const list=[]; for(const p of ps){ if(!p.birth) continue; let best=null; for(const r of p.rs){ const age=(r.Y+1)-(+p.birth.slice(0,4))-(p.birth.slice(5)>'02-01'?1:0); if(age>=40&&(!best||age>best[0])) best=[age,r.Y]; } if(best) list.push({p,vals:best,ctx:0.4*Math.min(1,(best[0]-40)/8)}); }
  add('M','Played at 40','Name a player who played in the NHL at age 40 or older.',THRU,['a'],list); }

// S: single-season feats (league-wide, so combined totals are right even for traded players)
function seasonFeat(f,short,q,unit,pred,val,o={}){ const m=new Map(); let mx=0;
  for(const p of ps) for(const r of p.rs){ if(!pred(r,p)) continue; const v=val(r); mx=Math.max(mx,v); const e=m.get(p)||{best:-1,Y:0,n:0}; e.n++; if(v>e.best){e.best=v;e.Y=r.Y;} m.set(p,e); }
  const thr=o.thr||0; return add(f,short,q,o.note||THRU,['s',unit],[...m].map(([p,e])=>({p,vals:[e.best,e.Y,e.n],ctx:0.35*Math.min(1,e.n/5)+0.35*(e.best-thr)/((mx-thr)||1)})),o); }
const sk=(r,p)=>p.kind==='S', gl=(r,p)=>p.kind==='G';
seasonFeat('S','50-goal seasons','Name a player with a 50-goal season.','goals',(r,p)=>sk(r,p)&&r.g>=50,r=>r.g,{thr:50,g:'S-goals'});
seasonFeat('S','60-goal seasons','Name a player with a 60-goal season.','goals',(r,p)=>sk(r,p)&&r.g>=60,r=>r.g,{thr:60,g:'S-goals'});
seasonFeat('S','100-point seasons','Name a player with a 100-point season.','points',(r,p)=>sk(r,p)&&r.p>=100,r=>r.p,{thr:100,g:'S-points'});
seasonFeat('S','130-point seasons','Name a player with a 130-point season.','points',(r,p)=>sk(r,p)&&r.p>=130,r=>r.p,{thr:130,g:'S-points'});
seasonFeat('S','80-assist seasons','Name a player with an 80-assist season.','assists',(r,p)=>sk(r,p)&&r.a>=80,r=>r.a,{thr:80});
seasonFeat('S','20-goal defencemen','Name a defenceman with a 20-goal season.','goals',(r,p)=>p.pos==='D'&&r.g>=20,r=>r.g,{thr:20});
seasonFeat('S','70-point defencemen','Name a defenceman with a 70-point season.','points',(r,p)=>p.pos==='D'&&r.p>=70,r=>r.p,{thr:70});
seasonFeat('S','300-PIM seasons','Name a player with 300 or more penalty minutes in a season.','penalty minutes',(r,p)=>sk(r,p)&&r.pim>=300,r=>r.pim,{thr:300,packs:['pim'],g:'S-pim'});
seasonFeat('S','20 goals, 200 PIM','Name a player with 20 goals and 200 penalty minutes in the same season.','penalty minutes',(r,p)=>sk(r,p)&&r.pim>=200&&r.g>=20,r=>r.pim,{thr:200,packs:['pim']});
seasonFeat('S','40-win seasons','Name a goalie with a 40-win season.','wins',(r,p)=>gl(r,p)&&r.w>=40,r=>r.w,{thr:40});
seasonFeat('S','10-shutout seasons','Name a goalie with 10 or more shutouts in a season.','shutouts',(r,p)=>gl(r,p)&&r.so>=10,r=>r.so,{thr:10});
seasonFeat('S','70-game goalies','Name a goalie who played 70 or more games in a season.','games',(r,p)=>gl(r,p)&&r.gp>=70,r=>r.gp,{thr:70});
seasonFeat('S','Plus-50 seasons','Name a player who finished a season at plus-50 or better.','plus/minus',(r,p)=>sk(r,p)&&r.Y<=DONE&&r.pm>=50,r=>r.pm,{thr:50});
seasonFeat('S','20 power-play goals','Name a player with 20 or more power-play goals in a season.','power-play goals',(r,p)=>sk(r,p)&&r.ppG>=20,r=>r.ppG,{thr:20});
seasonFeat('S','7 shorthanded goals','Name a player with seven or more shorthanded goals in a season.','shorthanded goals',(r,p)=>sk(r,p)&&r.shG>=7,r=>r.shG,{thr:7});
seasonFeat('S','10 game-winners','Name a player with 10 or more game-winning goals in a season.','game-winning goals',(r,p)=>sk(r,p)&&r.gwg>=10,r=>r.gwg,{thr:10});
const age=(r,p)=>p.birth?(r.Y+1)-(+p.birth.slice(0,4))-(p.birth.slice(5)>'02-01'?1:0):99;
seasonFeat('S','Teenage 30-goal men','Name a player with a 30-goal season as a teenager.','goals',(r,p)=>sk(r,p)&&r.g>=30&&age(r,p)<=19,r=>r.g,{thr:30,note:'Age 19 or younger on February 1 of that season.'});
seasonFeat('S','30 goals at 36','Name a player with a 30-goal season at age 36 or older.','goals',(r,p)=>sk(r,p)&&r.g>=30&&age(r,p)>=36&&age(r,p)<99,r=>r.g,{thr:30,note:'Age on February 1 of that season.'});
{ const mk=(short,q,unit,kind,key,thr)=>{ const m=new Map(); for(const p of ps) if(p.kind===kind) for(const r of p.po){ if(r[key]<thr) continue; const e=m.get(p)||{best:-1,Y:0,n:0}; e.n++; if(r[key]>e.best){e.best=r[key];e.Y=r.Y;} m.set(p,e);}
    add('S',short,q,PO,['sp',unit],[...m].map(([p,e])=>({p,vals:[e.best,e.Y+1,e.n],ctx:0.3*Math.min(1,e.n/3)})),{packs:['po']}); };
  mk('25-point playoff runs','Name a player with 25 or more points in a single playoff year.','points','S','p',25);
  mk('14-goal playoff runs','Name a player with 14 or more goals in a single playoff year.','goals','S','g',14);
  mk('16-win playoff runs','Name a goalie with 16 or more wins in a single playoff year.','wins','G','w',16);
  mk('Two playoff OT goals','Name a player with two or more overtime goals in a single playoff year.','overtime goals','S','otg',2); }
{ const lead=(short,q,key,kind,minY,o)=>{ const m=new Map(); for(const p of ps) if(p.kind===kind) for(const r of p.rs){ if(r[key]!==1||r.Y<minY) continue; const e=m.get(p)||{n:0,Y:0}; e.n++; e.Y=Math.max(e.Y,r.Y); m.set(p,e);}
    add('A',short,q,THRU,['l'],[...m].map(([p,e])=>({p,vals:[e.n,e.Y],ctx:0.4*Math.min(1,e.n/5)+0.3*Math.max(0,(e.Y-1960)/65)})),o); };
  lead('Points leaders','Name a player who led the NHL in points in a season.','rkP','S',1917);
  lead('Goal leaders','Name a player who led the NHL in goals in a season.','rkG','S',1917);
  lead('Assist leaders','Name a player who led the NHL in assists in a season.','rkA','S',1917);
  lead('PIM leaders','Name a player who led the NHL in penalty minutes in a season.','rkPim','S',1945,{packs:['pim']});
  lead('Wins leaders','Name a goalie who led the NHL in wins in a season.','rkW','G',1945); }
for(const d of [1970,1980,1990,2000,2010,2020]){ const inD=r=>r.Y>=d&&r.Y<d+10; const lab=d===2020?'2020s':`${d}s`; const note=d===2020?'Seasons since 2020–21.':`Seasons from ${sl(d)} to ${sl(d+9)}.`; const pk=d===1990?['90s']:d===2020?['mod']:[];
  for(const t of [50,40]) if(seasonFeat('S',`${t}-goal seasons, ${lab}`,`Name a player with a ${t}-goal season in the ${lab}.`,'goals',(r,p)=>sk(r,p)&&inD(r)&&r.g>=t,r=>r.g,{thr:t,note,max:110,packs:pk.slice(),g:'S-goals'})) break;
  for(const t of [100,90]) if(seasonFeat('S',`${t}-point seasons, ${lab}`,`Name a player with a ${t}-point season in the ${lab}.`,'points',(r,p)=>sk(r,p)&&inD(r)&&r.p>=t,r=>r.p,{thr:t,note,max:110,packs:pk.slice(),g:'S-points'})) break;
  for(const t of [40,35,30]) if(seasonFeat('S',`${t}-win seasons, ${lab}`,`Name a goalie with a ${t}-win season in the ${lab}.`,'wins',(r,p)=>gl(r,p)&&inD(r)&&r.w>=t,r=>r.w,{thr:t,note,max:110,packs:pk.slice(),g:'S-wins'})) break;
  seasonFeat('S',`60-point defencemen, ${lab}`,`Name a defenceman with a 60-point season in the ${lab}.`,'points',(r,p)=>p.pos==='D'&&inD(r)&&r.p>=60,r=>r.p,{thr:60,note,packs:pk.slice()});
  if(d<2020) for(const t of [300,250,200]) if(seasonFeat('S',`${t}-PIM seasons, ${lab}`,`Name a player with ${t} or more penalty minutes in a season in the ${lab}.`,'penalty minutes',(r,p)=>sk(r,p)&&inD(r)&&r.pim>=t,r=>r.pim,{thr:t,note,max:110,min:18,packs:['pim',...pk],main:false,g:'S-pim'})) break; }
// 90s extras
{ const inD=r=>r.Y>=1990&&r.Y<2000, note='Seasons from 1990–91 to 1999–2000.';
    const m=new Map(); for(const p of ps) if(S(p)) for(const r of p.rs) if(inD(r)&&r.rkP<=5) { const e=m.get(p)||{n:0,Y:0}; e.n++; e.Y=Math.max(e.Y,r.Y); m.set(p,e); }
  add('S','Top-five scorers, 1990s','Name a player who finished top five in NHL points in a 1990s season.',note,['l'],[...m].map(([p,e])=>({p,vals:[e.n,e.Y],ctx:0.4*Math.min(1,e.n/4)})),{packs:['90s'],main:false});
  seasonFeat('S','6-shutout seasons, 1990s','Name a goalie with six or more shutouts in a 1990s season.','shutouts',(r,p)=>gl(r,p)&&inD(r)&&r.so>=6,r=>r.so,{thr:6,note,packs:['90s'],main:false});
  add('M','1990s debuts, 1,000 games','Name a skater who debuted in the 1990s and played 1,000 or more games.',THRU,['c','games'],ps.filter(p=>S(p)&&p.first>=1990&&p.first<2000&&p.gp>=1000).map(p=>({p,vals:[p.gp]})),{packs:['90s'],main:false}); }

// T: team feats, by stint (one team's share of a season)
const TEAMNOTE=`Counts only what he did with that team, through ${AS_OF}.`;
function teamSeason(T,stat,kind,ladder,mk,o={}){
  for(const t of ladder){ const m=new Map(), cand=[]; let mx=0;
    for(const p of ps) if(p.kind===kind) for(const s of p.st){ if(s.t!==T||s[stat]<t||s.Y<(o.minY||0)) continue; if(!s.known){ cand.push([p,s.Y]); continue; } mx=Math.max(mx,s[stat]); const e=m.get(p)||{best:-1,Y:0,n:0}; e.n++; if(s[stat]>e.best){e.best=s[stat];e.Y=s.Y;} m.set(p,e); }
    const d=mk(t); const ok=add('T',d.short,d.q,o.note||TEAMNOTE,['s',d.unit],[...m].map(([p,e])=>({p,vals:[e.best,e.Y,e.n],ctx:0.35*Math.min(1,e.n/5)+0.35*(e.best-t)/((mx-t)||1)})),Object.assign({thr:t},o,{packs:packsFor([T],o.packs)}));
    if(ok){ cand.filter(([p])=>!m.has(p)).forEach(([p,Y])=>amb(p,Y,d.short)); if(!o.all) return t; } }
  return null; }
function teamCareer(T,stat,kind,ladder,mk,o={}){
  for(const t of ladder){ const list=[], cand=[];
    for(const p of ps) if(p.kind===kind&&(!o.filter||o.filter(p))){ let lo=0,hi=0,un=[]; for(const s of p.st) if(s.t===T&&s.Y>=(o.minY||0)){ if(s.known) lo+=s[stat]; else { const floor=stat==='gp'?1:0; lo+=floor; hi+=s[stat]-floor; un.push(s.Y); } } if(lo>=t) list.push({p,vals:[lo],lo}); else if(lo+hi>=t) cand.push([p,un]); }
    const mx=Math.max(1,...list.map(x=>x.lo)); list.forEach(x=>x.ctx=0.5*(x.lo-t)/((mx-t)||1));
    const d=mk(t); const ok=add('T',d.short,d.q,o.note||TEAMNOTE,['c',d.unit],list,Object.assign({},o,{packs:packsFor([T],o.packs)}));
    if(ok){ cand.forEach(([p,un])=>un.forEach(Y=>amb(p,Y,d.short))); if(!o.all) return t; } }
  return null; }
const ROSTER_YEARS={TOR:[1966,1977,1985,1992,1993,1998,2001,2003,2012,2016,2020]};   // seasons worth a roster prompt on top of the automatic picks
const below=(ladder,t)=>ladder.filter(x=>t==null||x<t);
const A_=dem=>/^[AEIOU]/.test(dem)?'an':'a';
function rosterOf(T,Y){ const list=[]; let mx=1; for(const p of ps){ const r=p.rs.find(r=>r.Y===Y&&r.teams.includes(T)); if(!r) continue; const s=p.st.find(s=>s.Y===Y&&s.t===merge(T))||r; if(p.kind==='S') mx=Math.max(mx,s.p); list.push({p,s,r}); }
  return {list,mx,maxGp:Math.max(0,...list.map(x=>x.s.gp))}; }
const rosterAns=({list,mx},scale=1)=>list.map(({p,s,r})=>({p,vals:[s.gp,p.kind==='G'?s.w:s.p,p.kind==='G'?1:0],ctx:scale*(r.teams.length>1?0.6:1)*(p.kind==='G'?0.8*Math.min(1,s.gp/55):0.9*Math.pow(s.p/mx,0.6))}));
for(const T of [...CUR,'QUE','HFD','WIN','MNS','ATL','ARI','AFM']){ const nick=NICK[T], the=theT(T), cur=CUR.includes(T);
  // the main ladders: the toughest threshold that still leaves a decent list
  const mkG=t=>({short:`${t}-goal ${nick}`,q:`Name a player with ${an(t)} ${t}-goal season for the ${the}.`,unit:'goals'});
  const mkP=t=>({short:`${t}-point ${nick}`,q:`Name a player with ${an(t)} ${t}-point season for the ${the}.`,unit:'points'});
  const mkW=t=>({short:`${t}-win ${nick} goalies`,q:`Name a goalie with ${an(t)} ${t}-win season for the ${the}.`,unit:'wins'});
  const mkGP=t=>t>1?{short:`${t} games as ${nick}`,q:`Name a skater who played ${t} or more games for the ${the}.`,unit:'games'}:{short:`Every ${nick} skater`,q:`Name a skater who has played for the ${the}.`,unit:'games'};
  const tg=teamSeason(T,'g','S',[40,30,25,20],mkG,{max:95,min:13,g:'T-g-'+T});
  const tp=teamSeason(T,'p','S',[100,90,80,70,60,50],mkP,{max:80,min:13,g:'T-p-'+T});
  const tw=teamSeason(T,'w','G',[30,25,20,15,10],mkW,{max:60,min:12,g:'T-w-'+T});
  teamSeason(T,'pim','S',[200,150,100],t=>({short:`${t}-PIM ${nick}`,q:`Name a player with ${t} or more penalty minutes in a season for the ${the}.`,unit:'penalty minutes'}),{max:90,min:13,packs:['pim'],g:'T-pim-'+T});
  if(!cur) continue;
  const mkCG=t=>({short:`${t} goals as ${nick}`,q:`Name a player with ${t} or more goals for the ${the}.`,unit:'goals'});
  const tgp=teamCareer(T,'gp','S',[800,700,600,500,400,300,200],mkGP,{max:60,min:18,g:'T-gp-'+T});
  const tcg=teamCareer(T,'g','S',[300,250,200,150,100,75,50],mkCG,{max:50,min:15,g:'T-cg-'+T});
  teamCareer(T,'w','G',[150,100,75,50,30],t=>({short:`${t} wins as ${nick}`,q:`Name a goalie with ${t} or more wins for the ${the}.`,unit:'wins'}),{max:40,min:12,g:'T-cw-'+T});
  teamCareer(T,'pim','S',[1200,1000,800,600,400],t=>({short:`${N(t)} PIM as ${nick}`,q:`Name a player with ${N(t)} or more penalty minutes for the ${the}.`,unit:'penalty minutes'}),{max:45,min:14,packs:['pim'],main:false,g:'T-cpim-'+T});
  // team-pack extras: gentler thresholds and a few more angles, only ever seen inside that team's own pack
  teamSeason(T,'g','S',below([30,20,15,10],tg),mkG,{max:120,min:12,main:false,g:'T-g-'+T});
  teamSeason(T,'p','S',below([60,50,40,30,20],tp),mkP,{max:120,min:12,main:false,g:'T-p-'+T});
  teamSeason(T,'w','G',below([20,15,10,5],tw),mkW,{max:120,min:10,main:false,g:'T-w-'+T});
  teamCareer(T,'p','S',[500,400,300,200,150,100,50],t=>({short:`${t} points as ${nick}`,q:`Name a player with ${t} or more points for the ${the}.`,unit:'points'}),{max:90,min:14,main:false,g:'T-cp-'+T});
  teamCareer(T,'gp','G',[200,150,100,50,25,10],t=>({short:`${t}-game ${nick} goalies`,q:`Name a goalie who played ${t} or more games for the ${the}.`,unit:'games'}),{max:90,min:10,main:false,g:'T-ggp-'+T});
  if(tgp==null) teamCareer(T,'gp','S',[150,100,50,25,1],mkGP,{max:110,min:18,main:false,g:'T-gp-'+T});
  if(tcg==null) teamCareer(T,'g','S',[40,30,20,10,5],mkCG,{max:90,min:12,main:false,g:'T-cg-'+T});
  teamSeason(T,'a','S',[60,50,40,30,20],t=>({short:`${t}-assist ${nick}`,q:`Name a player with ${an(t)} ${t}-assist season for the ${the}.`,unit:'assists'}),{max:90,min:12,main:false,g:'T-a-'+T});
  teamCareer(T,'gp','S',[500,400,300,200,100,50,1],t=>t>1?{short:`${nick} defencemen, ${t}+ games`,q:`Name a defenceman who played ${t} or more games for the ${the}.`,unit:'games'}:{short:`${nick} defencemen`,q:`Name a defenceman who has played for the ${the}.`,unit:'games'},{max:70,min:12,main:false,filter:p=>p.pos==='D',g:'T-d-'+T});
  // season rosters: the team's best regular season of each decade, plus any hand-picked years (Cup years already have a playoff-roster prompt)
  { const ts=teamSeasons[T]||{}, cupY=new Set(Object.keys(champs).map(Number).filter(y=>champs[y].abbrev===T)), years=new Set(ROSTER_YEARS[T]||[]);
    for(let d=1960;d<=DONE;d+=10){ let best=null; for(let Y=Math.max(d,1967);Y<d+10&&Y<DONE;Y++){ const x=ts[Y]; if(!x||x.gp<40||cupY.has(Y)) continue; if(best==null||x.ptPct>ts[best].ptPct) best=Y; } if(best!=null) years.add(best); }
    const played=Object.keys(ts).map(Number).filter(Y=>Y<DONE&&ts[Y].gp>=40&&!cupY.has(Y)); if(played.length<12) played.forEach(Y=>years.add(Y));
    for(const Y of [...years].sort((a,b)=>a-b)){ const R=rosterOf(T,Y); add('R',`${sl(Y)} ${nick}`,`Name a player who suited up for the ${sl(Y)} ${fullName(T,Y)}.`,'At least one regular-season game.',['r'],rosterAns(R),{packs:packsFor([T],Y>=2020?['mod']:Y>=1990&&Y<=1999?['90s']:[]),main:false,g:'Rs-'+T}); } }
  for(const [code,dem] of [['SWE','Swede'],['FIN','Finn'],['RUS','Russian'],['CZE','Czech'],['USA','American'],['CAN','Canadian']]){
    const here=ps.filter(p=>p.nat===code&&p.st.some(s=>s.t===T)).map(p=>{ const mine=p.st.filter(s=>s.t===T), un=mine.filter(s=>!s.known); return {p,un,gp:mine.reduce((a,s)=>a+(s.known?s.gp:1),0),hi:un.reduce((a,s)=>a+s.gp-1,0)}; });
    for(const t of [1,50,100,200,400]){ const short=`${dem}s on the ${nick}`+(t>1?`, ${t}+ games`:'');
      if(add('N',short,t>1?`Name ${A_(dem)} ${dem} who played ${t} or more games for the ${the}.`:`Name ${A_(dem)} ${dem} who played for the ${the}.`,'By the nationality listed in NHL records. '+TEAMNOTE,['c',`games for the ${nick}`],here.filter(x=>x.gp>=t).map(x=>({p:x.p,vals:[x.gp],ctx:0.5*Math.min(1,x.gp/500)})),{packs:packsFor([T]),main:false,min:12,max:90,g:'N-'+T})){
        here.filter(x=>x.gp<t&&x.gp+x.hi>=t).forEach(x=>x.un.forEach(s=>amb(x.p,s.Y,short))); break; } } } }

// R: rosters. Last season's for every team, and this season's once the teams have played enough for the list to mean something.
for(const [Y,now] of [[DONE,false],[CURY,true]]) for(const T of CUR){ const R=rosterOf(T,Y); if(now&&R.maxGp<10) continue;
  add('R',`${sl(Y)} ${NICK[T]}`,now?`Name a player who has suited up for the ${sl(Y)} ${fullName(T,Y)}.`:`Name a player who suited up for the ${sl(Y)} ${fullName(T,Y)}.`,
    now?`At least one game this season, as of ${AS_OF}.`:'At least one regular-season game.',['r'],rosterAns(R,now?Math.min(1,R.maxGp/50):1),{packs:packsFor([T],['mod']),g:'R-'+T}); }
for(const Y of Object.keys(champs).map(Number).filter(y=>y>=1967)){ const T=champs[Y].abbrev; const list=[]; let mx=1; for(const p of ps){ const r=p.po.find(r=>r.Y===Y&&r.teams.includes(T)); if(r){ if(p.kind==='S') mx=Math.max(mx,r.p); list.push({p,r}); } }
  add('R',`${Y+1} ${NICK[T]||fullName(T,Y)}`,`Name a player who appeared in the playoffs for the ${Y+1} Stanley Cup champion ${fullName(T,Y)}.`,'At least one playoff game that spring.',['rp'],list.map(({p,r})=>({p,vals:[r.gp,p.kind==='G'?r.w:r.p,p.kind==='G'?1:0],ctx:p.kind==='G'?0.8*Math.min(1,r.gp/16):0.9*Math.pow(r.p/mx,0.6)})),{min:12,packs:packsFor([T],['po',...(Y>=1989&&Y<=1998?['90s']:[]),...(Y>=2020?['mod']:[])]),g:'R-cup-'+T}); }
// B: both teams
const pairs=new Set();
for(let i=0;i<CUR.length;i++) for(let j=i+1;j<CUR.length;j++){ const a=CUR[i],b=CUR[j]; if((O6.includes(a)&&O6.includes(b))||divisions[a]===divisions[b]||a==='TOR'||b==='TOR') pairs.add(a+','+b); }
['EDM,CGY','NYR,NYI','NYR,NJD','PIT,PHI','PIT,WSH','CHI,STL','LAK,ANA','LAK,SJS','VAN,CGY','COL,DET','BOS,PHI','MTL,EDM'].forEach(s=>{const [a,b]=s.split(',').sort(); pairs.add(a+','+b);});
for(const pr of pairs){ const [a,b]=pr.split(','); const list=ps.filter(p=>p.teams.has(a)&&p.teams.has(b));
  add('B',`${NICK[a]} + ${NICK[b]}`,`Name a player who played for both the ${NICK[a]} and the ${NICK[b]}.`,THRU,['y'],list.map(p=>({p,vals:[p.first,p.last+1]})),{min:12,max:320,main:list.length>=20,packs:packsFor([a,b]),g:'B-'+pr}); }
// N: nationality
const NAT={SWE:'Sweden',FIN:'Finland',CZE:'Czechia',SVK:'Slovakia',RUS:'Russia',DEU:'Germany',CHE:'Switzerland',DNK:'Denmark',LVA:'Latvia',AUT:'Austria',BLR:'Belarus',USA:'the United States'};
const DEM={SWE:'Swedes',FIN:'Finns',CZE:'Czechs',SVK:'Slovaks',RUS:'Russians',DEU:'Germans',CHE:'Swiss players',DNK:'Danes',LVA:'Latvians',AUT:'Austrians',BLR:'Belarusians',USA:'Americans'};
const NATNOTE='By the nationality listed in NHL records. '+THRU;
for(const [code,country] of Object.entries(NAT)){ for(const t of [1000,800,600,400,200,100,50,1]){ const list=ps.filter(p=>p.nat===code&&p.gp>=t);
    if(add('N',t>1?`${DEM[code]}, ${N(t)}+ games`:DEM[code],t>1?`Name a player from ${country} with ${N(t)} or more NHL games.`:`Name a player from ${country} who played in the NHL.`,NATNOTE,['c','games'],list.map(p=>({p,vals:[p.gp]})),{min:code==='USA'?30:12,max:90,g:'N-'+code})) break; } }
for(const [code,country,t] of [['SWE','Sweden',500],['FIN','Finland',400],['RUS','Russia',500],['CZE','Czechia',500],['USA','the United States',900]]){ const list=ps.filter(p=>S(p)&&p.nat===code&&p.p>=t);
  add('N',`${DEM[code]}, ${t}+ points`,`Name a skater from ${country} with ${t} or more career points.`,NATNOTE,['c','points'],list.map(p=>({p,vals:[p.p],ctx:0.4*Math.min(1,p.p/1500)})),{min:12,max:120,g:'N-'+code}); }
for(const [code,country,t] of [['SWE','Sweden',100],['FIN','Finland',100],['RUS','Russia',50],['CZE','Czechia',50],['USA','the United States',150]]){ const list=ps.filter(p=>G(p)&&p.nat===code&&p.w>=t);
  add('N',`${DEM[code].replace(/s$/,'')} goalies, ${t}+ wins`.replace('Swiss player','Swiss'),`Name a goalie from ${country} with ${t} or more career wins.`,NATNOTE,['c','wins'],list.map(p=>({p,vals:[p.w],ctx:0.4*Math.min(1,p.w/400)})),{min:10,max:90,g:'Ng-'+code}); }

// D: draft, from full draft records 1963-2022 (goalies and players who never made the NHL included)
const FIRSTN=y=>y<=1990?21:y===1991?22:y===1992?24:y<=1997?26:y===1998?27:y===1999?28:y<=2016?30:y<=2020?31:32;
const TEAMAB={}; for(const T of CUR) TEAMAB[fullName(T,DONE)]=T; Object.assign(TEAMAB,{'Arizona Coyotes':'ARI','Phoenix Coyotes':'ARI','Montreal Canadiens':'MTL'});
const byPick=new Map(); ps.forEach(p=>{ if(p.dY&&p.dO) byPick.set(p.dY+'|'+p.dO,p); });
const draftMiss=[];
const draft=csv(path.join(__dirname,'data','draft-explorer','nhldraft.csv')).map(r=>({Y:+r.year,O:+r.overall_pick,team:r.team,name:r.player.replace(/\s*\(.*?\)\s*/g,'').trim(),isG:r.position==='G',gp:+r.games_played||0,ggp:+r.goalie_games_played||0})).filter(d=>d.name&&d.O);
draft.sort((a,b)=>a.Y-b.Y||a.O-b.O);
const lev=(a,b)=>{ const m=a.length,n=b.length; let prev=Array.from({length:n+1},(_,j)=>j); for(let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; } return prev[n]; };
const sameName=(a,b)=>{ a=canon(norm(ALIAS[norm(a)]||a)); b=canon(norm(b)); return a===b||lev(a,b)<=2||(a.split(' ').pop()===b.split(' ').pop()&&a[0]===b[0]); };
const byDY=new Map(); ps.forEach(p=>{ if(p.dY) (byDY.get(p.dY)||byDY.set(p.dY,[]).get(p.dY)).push(p); });
const taken=new Set();
for(const d of draft){ let p=byPick.get(d.Y+'|'+d.O); if(p&&!sameName(d.name,p.name)) p=null;
  if(!p){ const c=(byDY.get(d.Y)||[]).filter(x=>sameName(d.name,x.name)&&Math.abs(x.dO-d.O)<=6); if(c.length===1) p=c[0]; }
  if(!p){ const k=norm(ALIAS[norm(d.name)]||d.name); const c=(byName.get(k)||byCanon.get(canon(k))||[]).filter(x=>x.first>=d.Y&&x.first<=d.Y+17&&(!x.dY||x.dY>d.Y||x.kind==='G')&&(d.isG?x.kind==='G':x.kind==='S')); if(c.length===1) p=c[0]; else if(c.length>1) p=c.sort((a,b)=>b.gp-a.gp)[0];
    if(!p){ const f=ps.filter(x=>x.first>=d.Y&&x.first<=d.Y+17&&(d.isG?x.kind==='G':x.kind==='S'&&!x.dY)&&sameName(d.name,x.name)&&lev(canon(norm(d.name)),canon(norm(x.name)))<=2); if(f.length===1) p=f[0]; }
    if(!p&&(d.gp>0||d.ggp>0)&&d.Y<=2018) draftMiss.push(`${d.Y} #${d.O} ${d.name} (${d.isG?'G':'S'} gp ${d.gp||d.ggp})`); }
  d.p=p||null; if(p&&p.kind==='G'&&!p.dY){ p.dY=d.Y; p.dO=d.O; } }
const dAns=d=>d.p?{p:d.p}:{name:d.name,f:Math.max(2,13-d.O/4)};
const DN='Every pick counts, including players who never reached the NHL.';
for(let Y=1979;Y<=2022;Y++){ const list=draft.filter(d=>d.Y===Y&&d.O<=FIRSTN(Y));
  add('D',`${Y} first round`,`Name a player picked in the first round of the ${Y} NHL Draft.`,DN,['d'],list.map(d=>Object.assign(dAns(d),{vals:[d.O],ctx:0.35*(1-Math.min(1,(d.O-1)/30))})),{min:15,packs:['dr',...(Y>=1990&&Y<=1999?['90s']:[]),...(Y>=2020?['mod']:[])],g:'D-round1'}); }
for(const dd of [1970,1980,1990,2000,2010]){ const list=draft.filter(d=>d.O<=5&&d.Y>=dd&&d.Y<dd+10);
  add('D',`Top-five picks, ${dd}s`,`Name a player picked in the top five of an NHL Draft in the ${dd}s.`,DN,['dy'],list.map(d=>Object.assign(dAns(d),{vals:[d.O,d.Y],ctx:0.3*(1-(d.O-1)/5)})),{packs:['dr',...(dd===1990?['90s']:[])],g:'D-top5'}); }
for(const T of CUR){ const rows=draft.filter(d=>TEAMAB[d.team]===T&&d.O<=FIRSTN(d.Y)&&d.Y>=1969);
  add('D',`${NICK[T]} first-rounders`,`Name a player the ${theT(T)} picked in the first round of the NHL Draft.`,'Drafts from 1969 to 2022. '+DN,['dy'],rows.map(d=>Object.assign(dAns(d),{vals:[d.O,d.Y],ctx:0.3*(1-Math.min(1,(d.O-1)/30))+0.2*Math.max(0,(d.Y-1990)/32)})),{min:14,packs:packsFor([T],['dr']),g:'D-team'}); }
add('D','First-round goalies','Name a goalie picked in the first round of the NHL Draft since 1990.','Drafts from 1990 to 2022. '+DN,['dy'],draft.filter(d=>d.isG&&d.O<=FIRSTN(d.Y)&&d.Y>=1990).map(d=>Object.assign(dAns(d),{vals:[d.O,d.Y],ctx:0.3*(1-Math.min(1,(d.O-1)/30))})),{packs:['dr','g']});
add('D','Late-pick goalies, 100 wins','Name a goalie drafted 100th overall or later who won 100 or more NHL games.','Drafts from 1963 to 2022.',['dy'],draft.filter(d=>d.isG&&d.O>=100&&d.p&&d.p.w>=100).map(d=>({p:d.p,vals:[d.O,d.Y],ctx:0.4*Math.min(1,d.p.w/400)})),{packs:['dr']});
add('D','Pick 200+, 500 games','Name a skater drafted 200th overall or later who played 500 or more NHL games.','Drafts from 1963 to 2022.',['dy'],draft.filter(d=>!d.isG&&d.O>=200&&d.p&&d.p.gp>=500).map(d=>({p:d.p,vals:[d.O,d.Y]})),{packs:['dr'],max:200});
add('D','Top-ten picks, under 100 games','Name a top-ten pick since 1990 who played fewer than 100 NHL games.','Drafts from 1990 to 2015. '+DN,['dy'],draft.filter(d=>d.O<=10&&d.Y>=1990&&d.Y<=2015&&(d.p?d.p.gp<100:true)).map(d=>Object.assign(dAns(d),{vals:[d.O,d.Y],ctx:0.3*(1-(d.O-1)/10)})),{packs:['dr'],main:false,min:10});

// A: awards and hand lists
const lastYr=key=>Math.max(...hand[key].flatMap(h=>(h.detail.match(/\d{4}/g)||[]).map(Number)));
const handAdd=(key,short,q,note,o)=>{ const strs=[]; add('A',short,q,note,['x',strs],hand[key].map((h,i)=>{ strs.push(h.detail); return {p:h.p,name:h.name,vals:[i],fixed:1000-i}; }),Object.assign({min:10},o)); };
handAdd('cs','Conn Smythe winners','Name a Conn Smythe Trophy winner.',`Playoff MVP, 1965 to ${lastYr('cs')}.`,{packs:['po']});
handAdd('calder','Calder winners','Name a Calder Trophy winner.',`Rookie of the year, 1933 to ${lastYr('calder')}.`);
handAdd('norris','Norris winners','Name a Norris Trophy winner.',`Best defenceman, 1954 to ${lastYr('norris')}.`);
handAdd('cap','Maple Leafs captains','Name a Toronto Maple Leafs captain.','Since the team took the Maple Leafs name in 1927.',{packs:['t-TOR','o6']});
handAdd('fo','First-overall picks','Name a first-overall NHL draft pick.',`1963 to ${lastYr('fo')}.`,{packs:['dr']});
const yrs=ys=>{ ys=[...new Set(ys)].sort((a,b)=>a-b).map(y=>y+1); return ys.length<=3?ys.join(', '):`${ys.length} times, ${ys[0]} to ${ys[ys.length-1]}`; };
const AWY=Math.max(...Object.values(RECENT).flatMap(o=>Object.keys(o).map(Number)));   // last season with hand-kept award winners
function awardAdd(key,short,q,note,filter,o={}){ const m=new Map(); for(const w of awards[key]) if(!filter||filter(w)) (m.get(w.p)||m.set(w.p,[]).get(w.p)).push(w.Y);
  const strs=[]; return add('A',short,q,note,['x',strs],[...m].map(([p,ys],i)=>{ strs.push(yrs(ys)); return {p,vals:[i],ctx:0.3*Math.min(1,ys.length/4)+0.3*Math.max(0,(Math.max(...ys)-1950)/75)}; }),o); }
awardAdd('Hart','Hart winners','Name a Hart Trophy winner.',`League MVP, 1924 to ${AWY+1}.`);
awardAdd('Vezina','Vezina winners','Name a Vezina Trophy winner.',`Top goalie, 1927 to ${AWY+1}. Before 1982 it went to the goalies on the team that allowed the fewest goals.`);
awardAdd('Selke','Selke winners','Name a Selke Trophy winner.',`Best defensive forward, 1978 to ${AWY+1}.`);
awardAdd('Lady Byng','Lady Byng winners','Name a Lady Byng Trophy winner.',`Most gentlemanly player, 1925 to ${AWY+1}.`);
awardAdd('Lindsay','Ted Lindsay winners','Name a Ted Lindsay Award winner.',`MVP as voted by the players, 1971 to ${AWY+1}. Called the Lester B. Pearson Award until 2010.`);
awardAdd('First Team All-Star','First All-Star Team, since 1990','Name a player voted to the NHL First All-Star Team since 1990.',`Seasons from 1989–90 to ${sl(AWY)}.`,w=>w.Y>=1989,{max:140});
awardAdd('First Team All-Star','First All-Star Team, 1990s','Name a player voted to the NHL First All-Star Team in the 1990s.','Seasons from 1989–90 to 1998–99.',w=>w.Y>=1989&&w.Y<=1998,{packs:['90s'],main:false});
awardAdd('First Team All-Star','First-team goalies','Name a goalie voted to the NHL First All-Star Team.',`Seasons from 1930–31 to ${sl(AWY)}.`,w=>w.p.kind==='G');
awardAdd('First Team All-Star','First-team defencemen','Name a defenceman voted to the NHL First All-Star Team since 1968.',`Seasons from 1967–68 to ${sl(AWY)}.`,w=>w.p.pos==='D'&&w.Y>=1967);
{ const strs=[]; add('A','Hall of Fame, since 2000','Name a player inducted into the Hockey Hall of Fame since 2000.',`Player category, classes of 2000 to ${Math.max(...hof.map(h=>h.Y))}.`,['x',strs],hof.filter(h=>h.Y>=2000).map((h,i)=>{ strs.push('Class of '+h.Y); return h.p?{p:h.p,vals:[i],ctx:0.25*Math.max(0,(h.Y-2000)/26)}:{name:h.name,f:14,vals:[i]}; }),{max:200}); }


// Modern NHL pack: 2020-21 onward
{ const M0=2020, inM=r=>r.Y>=M0, MN='Seasons since 2020–21.', mo=(x={})=>Object.assign({packs:['mod'],main:false,note:MN},x);
  for(const t of [30]) seasonFeat('S',`${t}-goal seasons, 2020s`,`Name a player with a ${t}-goal season since 2020–21.`,'goals',(r,p)=>sk(r,p)&&inM(r)&&r.g>=t,r=>r.g,mo({thr:t,max:130,g:'S-goals'}));
  for(const t of [80]) seasonFeat('S',`${t}-point seasons, 2020s`,`Name a player with an ${t}-point season since 2020–21.`,'points',(r,p)=>sk(r,p)&&inM(r)&&r.p>=t,r=>r.p,mo({thr:t,max:130,g:'S-points'}));
  seasonFeat('S','30-win seasons, 2020s','Name a goalie with a 30-win season since 2020–21.','wins',(r,p)=>gl(r,p)&&inM(r)&&r.w>=30,r=>r.w,mo({thr:30,g:'S-wins'}));
  seasonFeat('S','15-goal defencemen, 2020s','Name a defenceman with a 15-goal season since 2020–21.','goals',(r,p)=>p.pos==='D'&&inM(r)&&r.g>=15,r=>r.g,mo({thr:15}));
  seasonFeat('S','100-PIM seasons, 2020s','Name a player with 100 or more penalty minutes in a season since 2020–21.','penalty minutes',(r,p)=>sk(r,p)&&inM(r)&&r.pim>=100,r=>r.pim,mo({thr:100,packs:['mod','pim']}));
  seasonFeat('S','5-shutout seasons, 2020s','Name a goalie with five or more shutouts in a season since 2020–21.','shutouts',(r,p)=>gl(r,p)&&inM(r)&&r.so>=5,r=>r.so,mo({thr:5}));
  { const m=new Map(); for(const p of ps) if(S(p)) for(const r of p.rs) if(inM(r)&&r.rkP<=10){ const e=m.get(p)||{n:0,Y:0}; e.n++; e.Y=Math.max(e.Y,r.Y); m.set(p,e); }
    add('S','Top-ten scorers, 2020s','Name a player who finished top ten in NHL points in a season since 2020–21.',MN,['l'],[...m].map(([p,e])=>({p,vals:[e.n,e.Y],ctx:0.5*Math.min(1,e.n/4)})),mo()); }
  const act=p=>p.rs.some(r=>r.Y>=DONE), AN=`Players who have appeared since ${sl(DONE)}. Career totals through ${AS_OF}.`;
  add('M','Active 700-point players','Name an active player with 700 or more career points.',AN,['c','points'],ps.filter(p=>S(p)&&act(p)&&p.p>=700).map(p=>({p,vals:[p.p],ctx:0.5*Math.min(1,(p.p-700)/1000)})),mo({note:AN}));
  add('M','Active 300-goal scorers','Name an active player with 300 or more career goals.',AN,['c','goals'],ps.filter(p=>S(p)&&act(p)&&p.g>=300).map(p=>({p,vals:[p.g],ctx:0.5*Math.min(1,(p.g-300)/600)})),mo({note:AN}));
  add('M','Active 1,000-game players','Name an active skater with 1,000 or more career games.',AN,['c','games'],ps.filter(p=>S(p)&&act(p)&&p.gp>=1000).map(p=>({p,vals:[p.gp]})),mo({note:AN}));
  add('M','Active 150-win goalies','Name an active goalie with 150 or more career wins.',AN,['c','wins'],ps.filter(p=>G(p)&&act(p)&&p.w>=150).map(p=>({p,vals:[p.w],ctx:0.5*Math.min(1,(p.w-150)/400)})),mo({note:AN}));
  add('M','2020s debuts, 150 points','Name a player who debuted in 2020–21 or later and has 150 or more points.',THRU,['c','points'],ps.filter(p=>S(p)&&p.first>=M0&&p.p>=150).map(p=>({p,vals:[p.p],ctx:0.4*Math.min(1,p.p/500)})),mo({note:THRU}));
  { const m=new Map(), putA=(p,lab,y)=>{ if(!p) return; (m.get(p)||m.set(p,[]).get(p)).push(lab+' '+y); };
    for(const [k,lab] of [['Hart','Hart'],['Vezina','Vezina'],['Selke','Selke'],['Lady Byng','Lady Byng'],['Lindsay','Ted Lindsay']]) for(const w of awards[k]) if(w.Y>=M0) putA(w.p,lab,w.Y+1);
    for(const [k,lab] of [['norris','Norris'],['calder','Calder'],['cs','Conn Smythe']]) for(const h of hand[k]) for(const y of (h.detail.match(/\d{4}/g)||[]).map(Number)) if(y>=M0+1) putA(h.p,lab,y);
    const strs=[]; add('A','Award winners, 2020s','Name a player who has won a major NHL award since 2021.',`Hart, Ted Lindsay, Vezina, Norris, Calder, Selke, Lady Byng or Conn Smythe, 2021 to ${AWY+1}.`,['x',strs],[...m].map(([p,a],i)=>{ strs.push(a.join(', ')); return {p,vals:[i],ctx:0.4*Math.min(1,a.length/4)}; }),mo({note:null})); }
  awardAdd('First Team All-Star','First All-Star Team, 2020s','Name a player voted to the NHL First All-Star Team since 2020–21.',MN,w=>w.Y>=M0,mo({min:12}));
  for(const [code,country] of Object.entries(NAT)){ const gpM=p=>p.rs.filter(inM).reduce((a,r)=>a+r.gp,0); for(const t of [350,300,200,100,50,1]){ const list=ps.filter(p=>p.nat===code&&gpM(p)>=t);
      if(add('N',`${DEM[code]} of the 2020s`+(t>1?`, ${t}+ games`:''),t>1?`Name a player from ${country} with ${t} or more games since 2020–21.`:`Name a player from ${country} who has played since 2020–21.`,'By the nationality listed in NHL records. '+MN,['c','games since 2020–21'],list.map(p=>({p,vals:[gpM(p)]})),mo({min:12,max:70,note:null,g:'N-'+code}))) break; } }
  add('D','Top-ten picks, 2020 to 2022','Name a top-ten pick from the 2020, 2021 or 2022 NHL Draft.',DN,['dy'],draft.filter(d=>d.O<=10&&d.Y>=2020&&d.Y<=2022).map(d=>Object.assign(dAns(d),{vals:[d.O,d.Y],ctx:0.3*(1-(d.O-1)/10)})),mo({note:null,packs:['mod','dr'],g:'D-top5'}));
  for(let Y=2023;Y<=CURY;Y++) add('D',`${Y} first round`,`Name a skater picked in the first round of the ${Y} NHL Draft who has played in the NHL.`,`Skaters with at least one NHL game through ${AS_OF}.`,['d'],ps.filter(p=>S(p)&&p.dY===Y&&p.dR===1).map(p=>({p,vals:[p.dO],ctx:0.35*(1-Math.min(1,(p.dO-1)/30))})),mo({note:null,min:12,g:'D-round1'}));
}

/* ---------- output ---------- */
/* Rookie mode: prompts where plenty of the answers are household names and the idea is simple */
const NERDY=/game-winners|shorthanded|power-play|Plus-50|OT goals|[Oo]vertime|Played at 40|One-team|Point-a-game|PIM|journeymen|Undrafted|foot|Teenage|at 36|Lady Byng|debuts|19[78]0s|Late-pick|Pick 200|under 100|70-game|defencemen, /;
for(const pr of prompts){ const fs_=pr.answers.map(a=>a.p?(a.p.f0||a.p.f):0); pr.star=fs_.filter(f=>f>=62).length; pr.known=fs_.filter(f=>f>=45).length; pr.share=pr.known/fs_.length;
  const roster=pr.f==='R'&&(pr.short.startsWith(sl(DONE)+' ')||pr.short.startsWith(sl(CURY)+' ')), cup=pr.f==='R'&&/^20(09|[1-9]\d) /.test(pr.short);
  const easy=!NERDY.test(pr.short)&&((roster&&pr.known>=4)||(cup&&pr.known>=5)||(!roster&&pr.f!=='R'&&pr.f!=='B'&&pr.f!=='T'&&pr.star>=12&&pr.share>=0.55));
  if(easy) pr.packs.push('rk');
  pr.d=easy?1:(pr.star>=4||pr.known>=8)?2:3; }
/* A traded player's season that still has no per-team split could make a team prompt reject a right answer, so those prompts sit out until
   fetch-splits.js (run by the weekly job) fills the split in. out/ambig.json is its to-do list. */
const A=[...AMBIG.values()]; const hold=new Set(); A.forEach(a=>a.why.forEach(w=>hold.add(w)));
fs.writeFileSync(path.join(OUT,'ambig.json'),JSON.stringify(A.map(a=>({id:a.p.id,name:a.p.name,kind:a.p.kind,Y:a.Y,teams:a.p.rs.find(r=>r.Y===a.Y).teams,why:[...a.why]})),null,1));
const live=prompts.filter(p=>!hold.has(p.short));
const idx=J('index/players.json'); const all=new Map(); idx.r.forEach(r=>all.set(r[0],r[1])); ps.forEach(p=>all.set(p.id,p.name));
const fameOf=id=>{const p=players.get(id); return p?p.f:0;};
const order=[...all.keys()].sort((a,b)=>fameOf(b)-fameOf(a)||a-b); const pos=new Map(order.map((id,i)=>[id,i]));
const names=order.map(id=>all.get(id)); const extra=new Map();
const out=live.map(pr=>{ const k=1+(pr.answers[0].vals||[]).length; const a=[], c=[]; pr.answers.forEach((x,j)=>{ let i; if(x.p) i=pos.get(x.p.id); else { const key=norm(x.name); if(!extra.has(key)){ extra.set(key,names.length); names.push(x.name);} i=extra.get(key);} a.push(i,...x.vals); if(x.tcFlag) c.push(j); });
  const o={f:pr.f,s:pr.short,q:pr.q,n:pr.note,t:pr.t,k,a,g:pr.g,d:pr.d}; if(pr.main) o.m=1; if(pr.packs.length) o.p=pr.packs; if(c.length) o.c=c; return o; });
const teams=CUR.map(T=>[T,fullName(T,CURY)===T?fullName(T,DONE):fullName(T,CURY),NICK[T]]).sort((a,b)=>a[1].localeCompare(b[1]));
const body={asOf:AS_OF,season:sl(CURY),teams,names:names.join('|'),prompts:out};
const data=Object.assign({v:crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0,10)},body);

/* ---------- checks: a bad download or a change upstream should stop the build, not ship a broken game ---------- */
const fam={}, pk={}; let nmain=0; live.forEach(p=>{ if(p.main){ nmain++; fam[p.f]=(fam[p.f]||0)+1; } p.packs.forEach(x=>pk[x]=(pk[x]||0)+1); });
const problems=[]; const need=(ok,msg)=>{ if(!ok) problems.push(msg); };
const fnv=str=>{ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(36); };
need(ps.length>8000,`only ${ps.length} players loaded`);
need(ps.every(p=>Number.isFinite(p.f)),'a fame score is not a number: '+ps.filter(p=>!Number.isFinite(p.f)).slice(0,5).map(p=>p.name).join(', '));
need(CUR.length>=32,`only ${CUR.length} current teams`);
need(live.length>=900,`only ${live.length} prompts`); need(nmain>=450,`only ${nmain} prompts in the main pool`);
for(const f of ['M','S','A','T','R','B','N','D']) need((fam[f]||0)>=12,`family ${f} has only ${fam[f]||0} main prompts`);
for(const id of ['rk','mod','o6','90s','g','pim','po','dr']) need((pk[id]||0)>=20,`pack ${id} has only ${pk[id]||0} prompts`);
for(const T of CUR){ const mine=live.filter(p=>p.packs.includes('t-'+T)); need(mine.length>=9&&new Set(mine.map(p=>p.g)).size>=7,`team pack ${T} is too thin: ${mine.length} prompts, ${new Set(mine.map(p=>p.g)).size} kinds`); }
for(const d of [1,2,3]){ const n=live.filter(p=>p.d===d&&(d===1||p.main)).length; need(n>=40,`only ${n} prompts at daily difficulty ${d}`); }
need(new Set(live.map(p=>fnv(p.short))).size===live.length,'two prompts share a short code');
need(out.every(o=>o.a.every(v=>Number.isFinite(v))),'a prompt has a non-numeric value: '+out.filter(o=>!o.a.every(v=>Number.isFinite(v))).slice(0,5).map(o=>o.s).join(', '));
if(!RECENT.Hart[DONE]&&asOf.getMonth()>=6) console.warn(`\nHEADS UP: awards-recent.json has no ${sl(DONE)} winners yet. Add them (and the new Calder, Norris and Conn Smythe names in hand-lists.json).\n`);

fs.writeFileSync(path.join(OUT,'data.json'),JSON.stringify(data));
console.log(`season ${sl(CURY)} in progress, stats as of ${AS_OF}`);
console.log('prompts',live.length,'main',nmain,JSON.stringify(fam),'names',names.length,'extras',extra.size,'bytes',fs.statSync(path.join(OUT,'data.json')).size);
console.log('packs',JSON.stringify(Object.fromEntries(Object.entries(pk).filter(([k])=>!k.startsWith('t-')))),'| team packs',CUR.map(T=>T+':'+(pk['t-'+T]||0)).join(' '));
console.log('splits',JSON.stringify(L.splitStats).slice(0,400));
console.log('unresolved hand names:',unresolved.join(', ')||'none','| award rows unmatched:',awMiss.length,awMiss.slice(0,30).join('; '),'| too-clever unmatched:',tcMiss.join(', ')||'none');
console.log('draft issues',draftMiss.length,'| skipped',skipped.length,'| too hard for main',tooHard.length);
console.log('traded seasons without a split:',A.length,'| prompts on hold:',hold.size,[...hold].slice(0,12).join('; '));
if(problems.length){ console.error('\nBUILD STOPPED:\n - '+problems.join('\n - ')); process.exit(1); }
if(process.argv[2]){ const re=new RegExp(process.argv[2],'i'); prompts.filter(p=>re.test(p.short)).forEach(p=>{ const n=p.answers.length; const nm=a=>(a.p?a.p.name:a.name)+(a.tcFlag?'*':''); console.log(`\n## ${p.short} [${n}] main:${p.main} packs:${p.packs} — ${p.q}\n TOP: ${p.answers.slice(0,14).map(nm).join(', ')}\n MID: ${p.answers.slice(Math.floor(n*.33),Math.floor(n*.33)+6).map(nm).join(', ')}\n BOTTOM: ${p.answers.slice(-10).map(nm).join(', ')}`); }); }
module.exports={prompts,data};
