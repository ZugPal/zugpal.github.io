const Z = require(require("path").resolve(process.argv[2])); let ok=true; const check=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n); if(!c) ok=false;};
let g = Z.deal();
check('deal sizes', g.tab.map(p=>p.length).join()==='1,2,3,4,5,6,7' && g.stock.length===24 && g.tab.every(p=>p[p.length-1].up && p.slice(0,-1).every(c=>!c.up)));
const total = x => x.tab.flat().length + x.stock.length + x.waste.length + x.found.flat().length;
// draw through stock and recycle
let h = g; for(let i=0;i<24;i++) h = Z.draw(h); check('stock to waste', h.stock.length===0 && h.waste.length===24);
h = Z.draw(h); check('recycle waste', h.stock.length===24 && h.waste.length===0 && total(h)===52);
// constructed position: ace to foundation, alternating build, king to empty
const mk = (s,r,up=true)=>({s,r,up});
let c = {tab:[[mk('S',1)],[mk('H',13)],[mk('S',12)],[],[mk('C',5,false),mk('D',9)],[mk('S',10)],[]], stock:[], waste:[mk('C',13)], found:[[],[],[],[]], moves:0};
let r = Z.autoFound(c, {kind:'tab', i:0, idx:0}); check('ace to foundation', r && r.found.some(f=>f.length===1) && r.tab[0].length===0);
r = Z.move(c, {kind:'tab', i:2, idx:0}, {kind:'tab', i:1}); check('black Q on red K', r && r.tab[1].length===2);
check('same color rejected', Z.move(c, {kind:'tab', i:5, idx:0}, {kind:'tab', i:2})===null);
r = Z.move(c, {kind:'waste'}, {kind:'tab', i:3}); check('king to empty', r && r.tab[3][0].r===13 && r.waste.length===0);
check('non-king to empty rejected', Z.move(c, {kind:'tab', i:5, idx:0}, {kind:'tab', i:6})===null);
r = Z.move(c, {kind:'tab', i:4, idx:1}, {kind:'tab', i:5}); check('red 9 on black 10 flips card under', r && r.tab[4][0].up===true);
check('face-down card cannot move', Z.move(c, {kind:'tab', i:4, idx:0}, {kind:'tab', i:6})===null);
// auto finish
let f = {tab:[[mk('S',2)],[mk('H',2)],[],[],[],[],[]], stock:[], waste:[], found:[[mk('S',1)],[mk('H',1)],[],[]], moves:0};
check('can auto finish', Z.canAutoFinish(f)); const fin = Z.autoFinish(f); check('auto finish moves cards', fin.found[0].length===2 && fin.found[1].length===2);
// random play keeps 52 cards
let x = Z.deal(); for(let k=0;k<500;k++){ const opts=[]; const d=Z.draw(x); if(d) opts.push(d); for(let i=0;i<7;i++){ const p=x.tab[i]; for(let idx=0;idx<p.length;idx++){ for(let j=0;j<7;j++){ const m=Z.move(x,{kind:'tab',i,idx},{kind:'tab',i:j}); if(m) opts.push(m);} const a=Z.autoFound(x,{kind:'tab',i,idx}); if(a) opts.push(a);} } const w=Z.autoFound(x,{kind:'waste'}); if(w) opts.push(w); if(!opts.length) break; x = opts[Math.floor(Math.random()*opts.length)]; if(total(x)!==52){ ok=false; console.log('card count broken'); break; } }
check('random play keeps 52 cards', total(x)===52);
console.log(ok?'ALL SOLITAIRE TESTS OK':'SOLITAIRE ERRORS');
