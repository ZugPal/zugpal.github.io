const C = require(require("path").resolve(process.argv[2]));
function perft(st, d){ if(d===0) return 1; let n=0; for(const m of C.legal(st)){ n += d===1 ? 1 : perft(C.apply(st,m), d-1); } return n; }
const tests = [
 ["start", C.newGame(), [20,400,8902,197281]],
 ["kiwipete", C.fromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"), [48,2039,97862]],
 ["pos3", C.fromFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1"), [14,191,2812,43238]],
 ["pos4", C.fromFen("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1"), [6,264,9467]],
 ["pos5", C.fromFen("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"), [44,1486,62379]],
];
let ok=true;
for(const [name, st, exp] of tests){ exp.forEach((e,i)=>{ const got=perft(st,i+1); if(got!==e){ ok=false; console.log('FAIL',name,'depth',i+1,'got',got,'expected',e);} }); console.log(name,'checked'); }
// mate / stalemate
const mate = C.fromFen("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"); console.log('fools mate:', JSON.stringify(C.status(mate)));
const stale = C.fromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"); console.log('stalemate:', JSON.stringify(C.status(stale)));
let t=Date.now(); const bm = C.bestMove(C.newGame(), 3); console.log('bestMove depth3', C.uci(bm), (Date.now()-t)+'ms');
t=Date.now(); C.bestMove(C.fromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R b KQkq - 0 1"), 3); console.log('bestMove kiwipete depth3', (Date.now()-t)+'ms');
console.log(ok?'ALL PERFT OK':'PERFT ERRORS');
