/* =========================================================
   EXATA QUIZ — tela do aluno (celular)
   ========================================================= */
(function(){
'use strict';
const X=window.EXQ, DB=X.DB, $=X.$, esc=X.esc;
X.injetarNaipes();
if(DB.modo==='local') $('#faixa-teste').hidden=false;
if(X.erroFirebase){ const f=$('#faixa-teste'); f.hidden=false; f.textContent=X.erroFirebase; }

const A={pin:'',uid:'',nome:'',unsubs:[],atual:null,estado:null,eu:null,entrou:false,chave:'',fase:'',respondida:'',escolha:null,unRes:null,unFinal:null,final:null,tm:null,somFeito:''};
const tela=h=>{ $('#tela').innerHTML=h; };
const sala=p=>'salas/'+A.pin+(p?'/'+p:'');
const LOGO='<span class="logo">EXATA QUIZ <span class="naipes"><svg class="naipe"><use href="#s-spade"/></svg><svg class="naipe"><use href="#s-heart"/></svg><svg class="naipe"><use href="#s-diamond"/></svg><svg class="naipe"><use href="#s-club"/></svg></span></span>';
const pinUrl=(new URLSearchParams(location.search).get('pin')||'').replace(/\D/g,'').slice(0,6);
let wake=null;
function manterTelaAcesa(){ try{ if(navigator.wakeLock&&!wake) navigator.wakeLock.request('screen').then(w=>{ wake=w; w.addEventListener('release',()=>{ wake=null; }); }).catch(()=>{}); }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&A.entrou) manterTelaAcesa(); });
function guardar(pin){ try{ if(pin) sessionStorage.setItem('exq.sala',pin); else sessionStorage.removeItem('exq.sala'); }catch(e){} }
function parar(){ A.unsubs.forEach(f=>{ try{f();}catch(e){} }); A.unsubs=[]; if(A.unRes){A.unRes();A.unRes=null;} if(A.unFinal){A.unFinal();A.unFinal=null;} clearInterval(A.tm); A.tm=null; }
function erroTxt(e){ const c=String(e&&(e.code||e.message)||'');
  if(/operation-not-allowed|admin-restricted/.test(c)) return 'O acesso de alunos não está ativado no Firebase (o professor precisa ativar o login “Anônimo”).';
  if(/network/.test(c)) return 'Sem conexão com a internet.';
  if(/PERMISSION|permission/i.test(c)) return 'Não foi possível entrar. O jogo pode ter terminado.';
  return 'Não foi possível conectar. Tente de novo.'; }

/* ---------- 1. PIN ---------- */
function telaPin(msg,valor){
  parar(); A.entrou=false; A.final=null; guardar(''); $('#al-nome').textContent=''; $('#rodape').hidden=true;
  tela(`<form class="al-entrar" id="f-pin" novalidate>${LOGO}
    <label class="sr" for="pin">PIN do jogo</label>
    <input class="inp-gde" id="pin" inputmode="numeric" pattern="[0-9]*" maxlength="7" placeholder="PIN do jogo" autocomplete="off" value="${esc(valor!=null?valor:pinUrl)}">
    <p class="erro-msg" id="msg">${esc(msg||'')}</p>
    <button class="btn btn-prim btn-gde" type="submit">Entrar</button>
    <p class="dica">O PIN aparece na tela do professor.</p></form>`);
  const i=$('#pin'); if(!i.value) i.focus();
}
async function enviarPin(){
  const pin=$('#pin').value.replace(/\D/g,''); const msg=$('#msg');
  if(pin.length!==6){ msg.textContent='O PIN tem 6 números.'; return; }
  msg.textContent='Procurando o jogo…';
  try{
    const u=await DB.anonimo(); A.uid=u.uid;
    const est=await DB.get('salas/'+pin+'/estado');
    if(!est){ msg.textContent='Não encontramos um jogo com esse PIN. Confira os números.'; return; }
    if(est==='fim'){ msg.textContent='Este jogo já terminou.'; return; }
    A.pin=pin;
    const eu=await DB.get(sala('jogadores/'+A.uid));
    if(eu){ A.nome=eu.nome; entrarNaSala(); } else telaNome();
  }catch(e){ msg.textContent=erroTxt(e); console.error(e); }
}

/* ---------- 2. Nome ---------- */
function telaNome(msg){
  tela(`<form class="al-entrar" id="f-nome" novalidate>${LOGO}
    <p class="eyebrow">Jogo encontrado · PIN ${esc(A.pin)}</p>
    <label class="sr" for="nome">Seu nome</label>
    <input class="inp-gde" id="nome" maxlength="20" placeholder="Seu nome" autocomplete="off" autocapitalize="words">
    <p class="erro-msg" id="msg">${esc(msg||'')}</p>
    <button class="btn btn-prim btn-gde" type="submit">Pronto!</button>
    <button class="lnk" type="button" id="trocar-pin">Usar outro PIN</button></form>`);
  $('#nome').focus();
}
async function enviarNome(){
  const nome=$('#nome').value.replace(/\s+/g,' ').trim().slice(0,20), msg=$('#msg');
  if(nome.length<2){ msg.textContent='Digite seu nome (pelo menos 2 letras).'; return; }
  msg.textContent='Entrando…';
  try{
    const js=await DB.get(sala('jogadores'))||{};
    if(Object.values(js).some(j=>String(j.nome||'').toLowerCase()===nome.toLowerCase())){ msg.textContent='Já existe alguém com esse nome. Use também o sobrenome.'; return; }
    await DB.set(sala('jogadores/'+A.uid),{nome,entrou:DB.TS});
    A.nome=nome; entrarNaSala();
  }catch(e){ msg.textContent=erroTxt(e); console.error(e); }
}
$('#tela').addEventListener('submit',e=>{ e.preventDefault(); if(e.target.id==='f-pin') enviarPin(); else if(e.target.id==='f-nome') enviarNome(); });

/* ---------- 3. Na sala ---------- */
function entrarNaSala(){
  parar(); A.entrou=true; A.chave=''; A.fase=''; guardar(A.pin); manterTelaAcesa();
  $('#al-nome').textContent=A.nome; $('#rodape').hidden=false; rodape();
  A.unsubs.push(DB.on(sala('estado'),v=>{ A.estado=v;
    if(v==null){ if(A.final) return; telaPin('O professor encerrou a sala.',''); return; }
    if(v==='fim') telaFinal(); else render(); }));
  A.unsubs.push(DB.on(sala('jogadores/'+A.uid),v=>{
    if(v==null){ if(A.estado==null||A.estado==='fim'||A.final) return; telaPin('Você saiu da sala (removido pelo professor). Entre de novo se precisar.',''); return; }
    A.eu=v; rodape(); }));
  A.unsubs.push(DB.on(sala('atual'),v=>{ A.atual=v; render(); }));
  render(true);
}
function rodape(){ const e=A.eu||{}; $('#rod-pts').textContent=X.fmt(e.pontos||0)+' pts'; $('#rod-pos').textContent=A.ultimaPos?A.ultimaPos+'º lugar':A.nome; }
function render(forcar){
  if(!A.entrou) return;
  if(A.estado==='fim'){ telaFinal(); return; }
  const at=A.atual;
  if(!at){ const k='espera:'+A.estado; if(!forcar&&k===A.fase) return; A.fase=k;
    tela(A.estado==='jogo'
      ?`<div class="al-msg"><div class="grande">${X.naipes4()}</div><h2>Prepare-se!</h2><p>A primeira pergunta já vai aparecer.</p></div>`
      :`<div class="al-msg"><div class="grande">${X.naipes4()}</div><h2>Você entrou!</h2><p>Veja seu nome na tela do professor. O jogo começa em instantes.</p></div>`);
    return; }
  const k=at.chave+':'+at.fase; if(!forcar&&k===A.fase) return; A.fase=k;
  if(at.chave!==A.chave){ A.chave=at.chave; if(A.unRes){A.unRes();A.unRes=null;} }
  clearInterval(A.tm); A.tm=null;
  if(at.fase==='intro') tela(`<div class="al-msg"><p class="eyebrow">Pergunta ${at.i+1} de ${at.total}${at.dobro?' · pontos em dobro':''}</p><h2>${esc(at.q)}</h2><p>Prepare-se…</p></div>`);
  else if(at.fase==='pergunta'){ if(A.respondida===at.chave) telaEnviada(); else telaPergunta(); }
  else if(at.fase==='revela'||at.fase==='placar') telaResultado();
  else if(at.fase==='fim') telaFinal();
}
function telaPergunta(){
  const at=A.atual, alts=X.toArr(at.alts), T=at.tempo||20;
  tela(`<div class="al-q">${esc(at.q)}</div><div class="al-tempo"><span id="tbar"></span></div>
    ${at.img?`<div class="al-img"><img src="${at.img}" alt="Imagem da pergunta"></div>`:''}
    <div class="al-alts">${alts.map((t,k)=>`<button class="alt c${k}" data-k="${k}" aria-label="${X.SUITS[k].nome}: ${esc(t)}">${X.naipe(k)}<span>${esc(t)}</span></button>`).join('')}</div>`);
  const fim=()=>{ const rest=Math.max(0,T-(DB.agora()-(at.inicio||DB.agora()))/1000); const b=$('#tbar'); if(b) b.style.width=(100*rest/T)+'%';
    if(rest<=0&&A.respondida!==at.chave){ clearInterval(A.tm); A.tm=null; tela('<div class="al-msg"><h2>Tempo esgotado!</h2><p>Aguarde o resultado…</p></div>'); } };
  fim(); A.tm=setInterval(fim,200);
}
$('#tela').addEventListener('click',e=>{
  const b=e.target.closest('.al-alts .alt'); if(b&&A.atual&&A.atual.fase==='pergunta'&&A.respondida!==A.atual.chave){
    const k=+b.dataset.k, chave=A.atual.chave; A.respondida=chave; A.escolha=k; clearInterval(A.tm); A.tm=null; telaEnviada();
    DB.set(sala(`respostas/${chave}/${A.uid}`),{k,t:DB.TS}).catch(()=>{ if(A.atual&&A.atual.chave===chave) tela('<div class="al-msg"><h2>Ops! Sua resposta chegou depois do tempo.</h2><p>Aguarde a próxima pergunta.</p></div>'); });
    return; }
  if(e.target.id==='trocar-pin') telaPin('','');
  if(e.target.id==='novo-jogo') telaPin('','');
});
function telaEnviada(){ const k=A.escolha;
  tela(`<div class="al-msg"><div class="grande n${k}">${X.naipe(k)}</div><h2>Resposta enviada!</h2><p>Aguarde os colegas…</p></div>`); }
function telaResultado(){
  const at=A.atual, chave=at.chave;
  if(!A.unRes) A.unRes=DB.on(sala(`resultados/${chave}/${A.uid}`),r=>desenhar(r));
  function desenhar(r){
    if(!A.atual||A.atual.chave!==chave||!['revela','placar'].includes(A.atual.fase)) return;
    if(!r){ tela('<div class="al-msg"><h2>Calculando…</h2></div>'); return; }
    A.ultimaPos=r.pos; rodape();
    const alts=X.toArr(A.atual.alts), certas=X.toArr(A.atual.certas);
    const cls=r.k==null?'neutro':(r.certo?'ok':'erro');
    if(A.somFeito!==chave){ A.somFeito=chave; if(r.certo) X.som.acerto(); else X.som.erro(); }
    tela(`<div class="al-res ${cls}">
      <h2>${r.k==null?'Tempo esgotado':(r.certo?'Correto!':'Incorreto')}</h2>
      ${r.certo?`<span class="ganho">+${X.fmt(r.ganho)}</span>`:''}
      ${r.certo&&r.seq>1?`<p>Sequência de ${r.seq} acertos!</p>`:''}
      ${!r.certo&&certas.length?`<p>Resposta certa: <b>${certas.map(k=>X.SUITS[k].nome+' — '+esc(alts[k])).join(' / ')}</b></p>`:''}
      <p class="posicao">Você está em <b>${r.pos}º lugar</b> de ${r.total} · ${X.fmt(r.pontos)} pts</p>
      ${A.atual.exp?`<div class="explica"><b>Resolução</b><p>${esc(A.atual.exp)}</p></div>`:''}
    </div>`);
  }
}
function telaFinal(){
  if(A.unFinal) return;
  A.fase='fim'; clearInterval(A.tm);
  tela('<div class="al-msg"><h2>Fim de jogo!</h2><p>Calculando o resultado…</p></div>');
  A.unFinal=DB.on(sala('final/'+A.uid),async f=>{
    if(!f){ return; }
    A.final=f; let podio=[]; try{ podio=X.toArr(await DB.get(sala('podio'))); }catch(e){}
    const msg=f.pos===1?'Campeão!':f.pos<=3?'Você está no pódio!':'Bom jogo!';
    if(f.pos<=3) X.som.fanfarra();
    A.ultimaPos=f.pos; rodape();
    tela(`<div class="al-msg">
      <p class="eyebrow">${esc(msg)}</p>
      <h2 style="font-size:clamp(3rem,16vw,5rem)">${f.pos}º lugar</h2>
      <p>${X.fmt(f.pontos)} pontos · ${f.acertos} de ${f.total} acertos · ${f.jogadores} jogadores</p>
      ${podio.length?`<ol class="placar-lista" style="margin-top:8px">${podio.map((p,i)=>`<li><span class="pos">${i+1}º</span><span>${esc(p.nome)}</span><span class="pts">${X.fmt(p.pontos)}</span></li>`).join('')}</ol>`:''}
      <button class="btn btn-prim" id="novo-jogo">Entrar em outro jogo</button></div>`);
  });
}

/* ---------- Início ---------- */
(async function(){
  let salvo=''; try{ salvo=sessionStorage.getItem('exq.sala')||''; }catch(e){}
  const pin=pinUrl||salvo;
  if(salvo&&(!pinUrl||pinUrl===salvo)){
    tela('<div class="al-msg"><h2>Reconectando…</h2></div>');
    try{ const u=await DB.anonimo(); A.uid=u.uid; A.pin=salvo; const eu=await DB.get(sala('jogadores/'+A.uid)); const est=await DB.get(sala('estado'));
      if(eu&&est&&est!=='fim'){ A.nome=eu.nome; entrarNaSala(); return; } }catch(e){}
  }
  telaPin('',pin);
})();
})();
