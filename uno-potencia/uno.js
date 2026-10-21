(() => {
'use strict';
const $=id=>document.getElementById(id);
const colors=['green','purple','orange','pink'];
const colorNames={green:'Verde',purple:'Roxo',orange:'Laranja',pink:'Rosa'};
const bank=[
['√36','sqrt36',6],['√81','sqrt81',9],['1×1¹','one',1],['∛27','cuberoot27',3],['√144×0','root144zero',0],['2⁴÷2²','pow24div22',4],['2²×2','pow22x2',8],['√(27²÷9)','root27sqdiv9',9],['√16+1','root16plus1',5],
['√4','sqrt4',2],['2+√25','twoRoot25',7],['√(9+2²)','root9plus4',Math.sqrt(13)],['√25','sqrt25',5],['3²','three2',9],['8¹','eight1',8],['√(2²)','root22',2],['√49×0','root49zero',0],['74⁰','seventyfour0',1],
['0³⁰⁰¹','zeroPower',0],['2×√4','twoRoot4',4],['3×√4','threeRoot4',6],['√625÷5','root625div5',5],['2²÷2','pow22div2',2],['2²+3','pow22plus3',7],['7⁰','seven0',1],['√36÷2','root36div2',3],['√16','sqrt16',4],
['√36+3','root36plus3',9],['√49−1','root49minus1',6],['√64','sqrt64',8],['9×√9','nineRoot9',27],['0²','zero2',0],['9−√9','nineMinusRoot9',6],['2³','two3',8],['√(2⁴)','root24',4],['√9','sqrt9',3],
['9⁰','nine0',1],['∛8','cuberoot8',2],['5+0⁹','fivePlusZero',5],['√49','sqrt49',7]
].filter(x=>Number.isFinite(x[2]));
let app=null,db=null,uid=null,roomRef=null,room=null,playerId=null,roomCode='',unsubscribe=null,localHand=[],busy=false,hasDrawn=false;
const say=(id,msg)=>$(id).textContent=msg;
function show(id){['setup','lobby','game'].forEach(x=>$(x).hidden=x!==id)}
function config(){return window.EXATA_FIREBASE&&window.EXATA_FIREBASE.apiKey&&!String(window.EXATA_FIREBASE.apiKey).includes('AIzaSy...')}
async function connect(){
 if(!config())throw new Error('Firebase não configurado. Confira ../quiz/js/config.js.');
 if(!firebase.apps.length)firebase.initializeApp(window.EXATA_FIREBASE);
 app=firebase.app();db=firebase.database();
 const cred=await firebase.auth().signInAnonymously();uid=cred.user.uid;
}
function newDeck(){
 const deck=[];
 bank.forEach((b,i)=>{colors.forEach(c=>deck.push({id:`${i}-${c}`,expr:b[0],key:b[1],value:b[2],color:c}));});
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return deck;
}
function code(){return String(Math.floor(10000+Math.random()*90000))}
function cardHTML(c,cls=''){return `<div class="card ${c.color} ${cls}" aria-label="${esc(c.expr)}"><span class="expr">${esc(c.expr)}</span></div>`}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function valueText(v){return Number.isInteger(v)?String(v):String(Math.round(v*100)/100)}
function legal(c,top){return c.color===top.color||Math.abs(c.value-top.value)<1e-9}
function current(){const ids=Object.keys(room.players||{});return ids[room.turnIndex%ids.length]}
function isMyTurn(){return current()===playerId}
async function createRoom(){
 const name=$('playerName').value.trim();if(!name){say('setupMsg','Digite seu nome.');return}
 try{say('setupMsg','Conectando...');await connect();roomCode=code();playerId=uid;
 const deck=newDeck(),players={};players[playerId]={name,uid,hand:deck.splice(0,7),joined:Date.now()};
 const top=deck.pop();
 const data={status:'lobby',host:playerId,created:Date.now(),players,deck,discard:[top],turnIndex:0,direction:1,drawnBy:null,unoCalled:{},lastAction:'Sala criada.'};
 roomRef=db.ref('unoPotencia/rooms/'+roomCode);await roomRef.set(data);listenRoom();say('setupMsg','');show('lobby');
 }catch(e){say('setupMsg',friendly(e))}
}
async function joinRoom(){
 const name=$('playerName').value.trim(),pin=$('roomCode').value.trim();if(!name||!/^\d{5}$/.test(pin)){say('setupMsg','Informe seu nome e um PIN de cinco dígitos.');return}
 try{say('setupMsg','Entrando na sala...');await connect();roomCode=pin;playerId=uid;roomRef=db.ref('unoPotencia/rooms/'+roomCode);
 await roomRef.transaction(r=>{if(!r||r.status!=='lobby'||Object.keys(r.players||{}).length>=6)return; if(r.players&&r.players[playerId])return r;const deck=r.deck||[];if(deck.length<7)return; r.players=r.players||{};r.players[playerId]={name,uid,hand:deck.splice(0,7),joined:Date.now()};r.deck=deck;return r;});
 const snap=await roomRef.once('value');if(!snap.exists()||!snap.val().players?.[playerId])throw new Error('Sala inexistente, partida iniciada ou sala cheia.');
 listenRoom();say('setupMsg','');show('lobby');
 }catch(e){say('setupMsg',friendly(e))}
}
function listenRoom(){
 if(unsubscribe)unsubscribe();const cb=roomRef.on('value',snap=>{if(!snap.exists()){say('gameMsg','A sala foi encerrada.');show('setup');return}room=snap.val();renderRoom();});unsubscribe=()=>roomRef.off('value',cb);
}
function renderRoom(){
 if(!room)return;const ids=Object.keys(room.players||{});
 if(room.status==='lobby'){show('lobby');$('pinDisplay').textContent=roomCode;$('playersList').innerHTML=ids.map(id=>`<div class="player-pill"><span class="dot"></span><span>${esc(room.players[id].name)}${id===room.host?' · anfitrião':''}</span></div>`).join('');$('startBtn').disabled=playerId!==room.host||ids.length<2;say('lobbyMsg',ids.length<2?'Aguardando pelo menos 2 jogadores.':`${ids.length}/6 jogadores. ${playerId===room.host?'Você pode iniciar a partida.':'Aguardando o anfitrião iniciar.'}`);return}
 if(room.status==='playing'||room.status==='finished'){show('game');renderGame();if(room.status==='finished')say('gameMsg',room.winner===playerId?'Você venceu!':`${room.players[room.winner]?.name||'Um jogador'} venceu a partida.`)}
}
async function startGame(){
 if(!room||playerId!==room.host||Object.keys(room.players||{}).length<2)return;
 await roomRef.transaction(r=>{if(!r||r.host!==playerId||Object.keys(r.players||{}).length<2)return;r.status='playing';r.turnIndex=0;r.lastAction='A partida começou.';return r});
}
function renderGame(){
 const ids=Object.keys(room.players||{}),top=room.discard[room.discard.length-1],me=room.players[playerId];if(!me){show('setup');return}
 $('gamePin').textContent=roomCode;$('turnTitle').textContent=isMyTurn()?'É sua vez':`Vez de ${room.players[current()]?.name||'outro jogador'}`;$('turnBadge').textContent=isMyTurn()?'SUA VEZ':'AGUARDE';
 $('opponents').innerHTML=ids.filter(id=>id!==playerId).map(id=>`<div class="opponent">${esc(room.players[id].name)} · ${room.players[id].hand.length} cartas</div>`).join('');
 $('topCard').className='card big-card '+top.color;$('topCard').innerHTML=`<span class="expr">${esc(top.expr)}</span>`;$('deckCount').textContent=`${room.deck.length} cartas`;
 $('handCount').textContent=`${me.hand.length} carta(s)`;$('hand').innerHTML=me.hand.map((c,i)=>{const ok=isMyTurn()&&legal(c,top);return `<button class="card ${c.color} ${ok?'playable':''}" data-index="${i}" ${ok?'':'disabled'} title="${ok?'Jogar '+esc(c.expr):'Não corresponde à cor ou ao resultado'}"><span class="expr">${esc(c.expr)}</span></button>`}).join('');
 $('hand').querySelectorAll('button[data-index]').forEach(b=>b.addEventListener('click',()=>play(Number(b.dataset.index))));
 $('drawBtn').disabled=!isMyTurn()||hasDrawn;$('unoBtn').disabled=!me.hand.length||me.hand.length>2;
 let passBtn=$('passBtn');if(!passBtn){passBtn=document.createElement('button');passBtn.id='passBtn';passBtn.textContent='Passar a vez';passBtn.className='quiet';passBtn.style.margin='0 auto 12px';$('game').insertBefore(passBtn,$('hand-panel'));passBtn.addEventListener('click',pass)}passBtn.hidden=!(isMyTurn()&&hasDrawn);
}
async function play(index){
 if(busy||!room||!isMyTurn())return;const me=room.players[playerId],c=me.hand[index],top=room.discard[room.discard.length-1];if(!legal(c,top))return;
 const answer=prompt(`Calcule ${c.expr}. Qual é o resultado?`);if(answer===null)return;
 if(Math.abs(Number(answer.replace(',','.'))-c.value)>1e-9){alert(`Resultado incorreto. ${c.expr} = ${valueText(c.value)}. Você recolhe a carta e compra mais uma.`);await penalty(index);return}
 busy=true;try{await roomRef.transaction(r=>{if(!r||r.status!=='playing'||Object.keys(r.players||{})[r.turnIndex%Object.keys(r.players||{}).length]!==playerId)return;const p=r.players[playerId];if(!p||!p.hand[index])return;const card=p.hand.splice(index,1)[0];r.discard.push(card);r.lastAction=`${p.name} jogou ${card.expr} = ${valueText(card.value)}.`;r.drawnBy=null;r.unoCalled=r.unoCalled||{};if(p.hand.length===0){r.status='finished';r.winner=playerId}else{r.turnIndex=(r.turnIndex+1)%Object.keys(r.players).length;}return r});hasDrawn=false;say('gameMsg','Jogada registrada.');}catch(e){say('gameMsg',friendly(e))}finally{busy=false}
}
async function penalty(index){
 await roomRef.transaction(r=>{if(!r||r.status!=='playing')return;const ids=Object.keys(r.players),id=ids[r.turnIndex%ids.length];if(id!==playerId)return;const p=r.players[id],c=p.hand.splice(index,1)[0];if(c)r.discard.push(c);for(let n=0;n<1;n++)if(r.deck.length)p.hand.push(r.deck.pop());r.lastAction=`${p.name} errou o cálculo e comprou uma carta.`;r.turnIndex=(r.turnIndex+1)%ids.length;r.drawnBy=null;return r});hasDrawn=false;
}
async function draw(){
 if(busy||!isMyTurn()||hasDrawn)return;busy=true;try{await roomRef.transaction(r=>{if(!r||r.status!=='playing')return;const ids=Object.keys(r.players);if(ids[r.turnIndex%ids.length]!==playerId||!r.deck.length)return;const p=r.players[playerId];p.hand.push(r.deck.pop());r.drawnBy=playerId;r.lastAction=`${p.name} comprou uma carta.`;return r});hasDrawn=true;renderGame();say('gameMsg','Você comprou uma carta. Se ela combinar, jogue-a; caso contrário, passe a vez.')}catch(e){say('gameMsg',friendly(e))}finally{busy=false}
}
async function pass(){if(!isMyTurn())return;await roomRef.transaction(r=>{if(!r||r.status!=='playing'||r.drawnBy!==playerId)return;const ids=Object.keys(r.players);r.turnIndex=(r.turnIndex+1)%ids.length;r.drawnBy=null;r.lastAction=`${r.players[playerId].name} passou a vez.`;return r});hasDrawn=false}
async function callUno(){
 const me=room.players[playerId];if(!me||me.hand.length>2)return;
 await roomRef.child('unoCalled/'+playerId).set(true);say('gameMsg','UNO anunciado!');
}
async function leave(){if(roomRef&&playerId){try{await roomRef.child('players/'+playerId).remove()}catch(e){}}if(unsubscribe)unsubscribe();room=null;show('setup')}
function friendly(e){const m=String(e?.message||e);if(/PERMISSION_DENIED|permission/i.test(m))return 'O Firebase bloqueou o acesso. Confira as regras do Realtime Database no LEIA-ME.txt.';if(/Firebase não configurado/.test(m))return m;if(/network/i.test(m))return 'Sem conexão com a internet.';return 'Não foi possível concluir a operação: '+m}
$('createBtn').addEventListener('click',createRoom);$('joinBtn').addEventListener('click',joinRoom);$('startBtn').addEventListener('click',startGame);$('leaveBtn').addEventListener('click',leave);$('drawBtn').addEventListener('click',draw);$('unoBtn').addEventListener('click',callUno);
$('copyLink').addEventListener('click',async()=>{const url=new URL(location.href);url.searchParams.set('pin',roomCode);try{await navigator.clipboard.writeText(url.href);say('lobbyMsg','Link de convite copiado.')}catch(e){prompt('Copie este link:',url.href)}});
const params=new URLSearchParams(location.search);if(params.get('pin'))$('roomCode').value=params.get('pin');
})();