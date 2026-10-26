const D = require(require("path").resolve(process.argv[2]));
const emptyState = (turn) => ({ b: new Array(64).fill(null), turn: turn||"w", quiet:0 });
let ok = true; const check = (name, cond) => { console.log((cond?'PASS ':'FAIL ')+name); if(!cond) ok=false; };
// 1. start: 8 moves, all forward from row 2
const s0 = D.newGame(); const m0 = D.legal(s0);
check('start has 8 moves', m0.length === 8 && m0.every(m => Math.floor(m.path[0]/8)===2 && m.path[1]===m.path[0]+8));
// 2. capture is mandatory
let s = emptyState(); s.b[3*8+3]="w"; s.b[4*8+3]="b"; s.b[0]="w";
let L = D.legal(s); check('capture mandatory', L.length===1 && L[0].taken[0]===4*8+3 && L[0].path[1]===5*8+3);
// 3. men cannot capture backwards
s = emptyState(); s.b[3*8+3]="w"; s.b[2*8+3]="b";
L = D.legal(s); check('no backward capture for men', L.every(m => m.taken.length===0));
// 4. maximum capture rule: one path takes 1, other takes 2
s = emptyState(); s.b[1*8+3]="w"; s.b[2*8+3]="b"; s.b[4*8+3]="b"; s.b[1*8+4]="b";
L = D.legal(s); check('max capture chosen (2 pieces)', L.length===1 && L[0].taken.length===2);
// 5. sideways capture
s = emptyState(); s.b[3*8+3]="w"; s.b[3*8+4]="b";
L = D.legal(s); check('sideways capture', L.length===1 && L[0].path[1]===3*8+5);
// 6. promotion
s = emptyState(); s.b[6*8+0]="w"; s.b[0*8+7]="b";
let n = D.apply(s, D.legal(s).find(m=>m.path[1]===7*8+0)); check('promotion to king', n.b[56]==="W");
// 7. flying king capture, land any square beyond
s = emptyState(); s.b[0]="W"; s.b[5*8+0]="b";
L = D.legal(s); check('flying king capture landings', L.length===2 && L.every(m=>m.taken[0]===40));
// 8. king no 180 turn: capture then cannot reverse direction over another piece behind
s = emptyState(); s.b[3*8+0]="W"; s.b[5*8+0]="b"; s.b[1*8+0]="b";
L = D.legal(s); check('king takes one piece only (no reversal)', L.every(m=>m.taken.length===1));
// 9. win when no pieces
s = emptyState("b"); s.b[0]="w"; check('no black pieces -> white wins', D.status(s).winner==="w");
// 10. random self-play sanity
let st = D.newGame(), plies=0; while(!D.status(st).over && plies<300){ const ms=D.legal(st); st=D.apply(st, ms[Math.floor(Math.random()*ms.length)]); plies++; }
check('random game runs ('+plies+' plies)', plies>10);
let t=Date.now(); D.bestMove(D.newGame(), 4); console.log('cpu depth4 start:', Date.now()-t, 'ms');
st = D.newGame(); for(let i=0;i<12;i++){ const ms=D.legal(st); st=D.apply(st, ms[Math.floor(Math.random()*ms.length)]); }
t=Date.now(); D.bestMove(st, 4); console.log('cpu depth4 midgame:', Date.now()-t, 'ms');
console.log(ok ? 'ALL DAMA TESTS OK' : 'DAMA ERRORS');
