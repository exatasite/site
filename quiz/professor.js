/* =========================================================
   EXATA QUIZ — painel do professor
   ========================================================= */
(function(){
'use strict';
const X=window.EXQ, DB=X.DB, $=X.$, esc=X.esc, toast=X.toast;
X.injetarNaipes();
if(DB.modo==='local'){ $('#faixa-teste').hidden=false; }
if(X.erroFirebase){ const f=$('#faixa-teste'); f.hidden=false; f.textContent=X.erroFirebase; }

const S={user:null,base:'',pastas:{},quizzes:{},historico:{},pastaSel:'__todos',edit:null,unsubs:[],view:''};
function show(v){ S.view=v; ['login','painel','editor','host'].forEach(n=>$('#v-'+n).hidden=n!==v); window.scrollTo(0,0); }
function erroBanco(e){
  const m=String(e&&(e.code||e.message)||'');
  if(/PERMISSION|permission/.test(m)) toast('O banco recusou a operação. Confira as regras do Firebase e o seu e-mail (guia, passos 3 e 5).');
  else toast('Não foi possível falar com o banco de dados. Verifique a internet.');
  console.error(e);
}

/* ---------- Quiz de exemplo (Geradores e Receptores) ---------- */
const SEED=[
 ["Um gerador elétrico é um dispositivo que:",["Converte energia elétrica em térmica","Converte outra forma de energia em elétrica","Armazena cargas elétricas","Consome energia elétrica"],2,20,"Gerador: transforma energia (química, mecânica...) em energia elétrica."],
 ["Qual é a equação característica de um gerador real?",["U = ε + r·i","U = R·i²","U = ε − r·i","U = ε / r"],3,20,"Parte da fem se perde na resistência interna: U = ε − r·i."],
 ["Gerador com ε = 12 V e r = 0,5 Ω fornece i = 4 A. Qual a ddp U em seus terminais?",["14 V","10 V","12 V","8 V"],2,60,"U = 12 − 0,5·4 = 12 − 2 = 10 V."],
 ["Gerador com ε = 24 V e r = 2 Ω. Qual a corrente de curto-circuito?",["12 A","48 A","6 A","24 A"],1,60,"i_cc = ε/r = 24/2 = 12 A."],
 ["Um gerador de fem 20 V mantém U = 16 V nos terminais. Seu rendimento é:",["16%","125%","20%","80%"],4,60,"η = U/ε = 16/20 = 0,8 = 80%."],
 ["Um gerador transfere potência máxima ao circuito externo quando:",["R externa = 0","R externa = r interna","R externa é infinita","A corrente é nula"],2,20,"Máxima transferência: R = r (rendimento de 50%)."],
 ["Gerador com ε = 12 V e r = 1 Ω. Qual a máxima potência útil que ele pode fornecer?",["36 W","144 W","72 W","12 W"],1,90,"P_máx = ε²/(4r) = 144/4 = 36 W."],
 ["No gráfico U × i de um gerador real, obtemos:",["Reta crescente pela origem","Parábola","Reta horizontal","Reta decrescente"],4,20,"U = ε − r·i: reta decrescente; corta U em ε e i em i_cc."],
 ["Gerador (ε = 12 V, r = 1 Ω) ligado a resistor de 5 Ω. A corrente no circuito é:",["2,4 A","12 A","2 A","3 A"],3,60,"i = ε/(R + r) = 12/(5 + 1) = 2 A."],
 ["Um receptor elétrico (ex.: motor) é um dispositivo que:",["Converte energia elétrica em outra forma não só térmica","Gera energia elétrica","Converte energia elétrica só em calor","Não possui resistência interna"],1,20,"Receptor: transforma energia elétrica em outra forma útil (mecânica, química...)."],
 ["A grandeza ε' de um receptor é chamada de:",["Força eletromotriz","Resistência interna","Força contraeletromotriz","Potência dissipada"],3,20,"ε' é a força contraeletromotriz (fcem)."],
 ["Qual é a equação característica de um receptor?",["U = ε' − r'·i","U = ε' + r'·i","U = r'·i","U = ε'·i"],2,20,"O receptor recebe U, usa ε' e dissipa r'·i: U = ε' + r'·i."],
 ["Motor com ε' = 100 V e r' = 2 Ω percorrido por i = 5 A. Qual a ddp U aplicada a ele?",["90 V","100 V","110 V","120 V"],3,60,"U = 100 + 2·5 = 110 V."],
 ["Receptor com ε' = 90 V ligado a U = 120 V. Seu rendimento é:",["75%","133%","25%","90%"],1,60,"η = ε'/U = 90/120 = 0,75 = 75%."],
 ["Receptor com ε' = 40 V e i = 3 A. Sua potência útil é:",["13,3 W","43 W","37 W","120 W"],4,60,"P_útil = ε'·i = 40·3 = 120 W."],
 ["Se o eixo de um motor ligado for travado (bloqueado), o que acontece?",["A corrente diminui","ε' se anula e a corrente aumenta","A corrente fica nula","O motor vira gerador"],2,30,"Travado, ε' = 0: o motor age como resistor, i cresce e ele pode queimar."],
 ["Circuito: gerador (30 V; 1 Ω), receptor (12 V; 2 Ω) e resistor de 3 Ω. A corrente é:",["7 A","3 A","6 A","2 A"],2,90,"i = (ε − ε')/(r + r' + R) = (30 − 12)/(1 + 2 + 3) = 18/6 = 3 A."]
];
const seedPerguntas=()=>SEED.map(([q,a,c,t,exp])=>({q,a,c:[c-1],t,p:'std',img:null,exp}));

/* ---------- Login ---------- */
function traduzErro(e){
  const c=e&&e.code||'';
  if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'E-mail ou senha incorretos.';
  if(/too-many-requests/.test(c)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if(/network/.test(c)) return 'Sem conexão com a internet.';
  if(/invalid-email/.test(c)) return 'Digite um e-mail válido.';
  if(/operation-not-allowed/.test(c)) return 'O login por e-mail/senha não está ativado no Firebase (guia, passo 4).';
  return 'Não foi possível entrar. ('+(c||'erro')+')';
}
$('#form-login').addEventListener('submit',e=>{
  e.preventDefault(); $('#lg-erro').textContent='';
  const em=$('#lg-email').value.trim(), se=$('#lg-senha').value;
  if(DB.modo==='firebase'&&X.PROF_EMAIL&&em.toLowerCase()!==X.PROF_EMAIL){ $('#lg-erro').textContent='Este e-mail não é o do professor cadastrado.'; return; }
  Promise.resolve(DB.entrar(em,se)).catch(err=>{ $('#lg-erro').textContent=traduzErro(err); });
});
$('#lg-esqueci').addEventListener('click',()=>{
  const em=$('#lg-email').value.trim(); if(!em){ $('#lg-erro').textContent='Digite seu e-mail acima e clique de novo.'; return; }
  Promise.resolve(DB.redefinirSenha(em)).then(()=>toast('Enviamos um link para redefinir a senha no seu e-mail.')).catch(err=>{ $('#lg-erro').textContent=traduzErro(err); });
});
if(DB.modo==='local'){ $('#lg-senha').placeholder='No modo de teste, qualquer senha serve'; $('#lg-email').value='professor@teste'; }
$('#bt-sair-conta').addEventListener('click',()=>DB.sair());

function pararOuvintes(){ S.unsubs.forEach(f=>{ try{f();}catch(e){} }); S.unsubs=[]; }
DB.onAuth(u=>{
  if(H) return; /* não interrompe um jogo em andamento */
  pararOuvintes();
  if(!u||u.anon){ S.user=null; show('login'); return; }
  if(DB.modo==='firebase'&&X.PROF_EMAIL&&String(u.email||'').toLowerCase()!==X.PROF_EMAIL){ $('#lg-erro').textContent='Este e-mail não é o do professor cadastrado.'; DB.sair(); return; }
  S.user=u; S.base='professores/'+u.uid; $('#quem').textContent=u.email||''; iniciarPainel();
});

async function iniciarPainel(){
  show('painel');
  try{
    const sem=await DB.get(S.base+'/semeado');
    if(!sem){ const pid=DB.chave(), qid=DB.chave();
      await DB.update(S.base,{['pastas/'+pid]:{nome:'Física III',criado:Date.now()},
        ['quizzes/'+qid]:{titulo:'Geradores e Receptores Elétricos',pasta:pid,atualizado:Date.now(),perguntas:seedPerguntas()},semeado:true}); }
  }catch(e){ erroBanco(e); }
  S.unsubs.push(DB.on(S.base+'/pastas',v=>{ S.pastas=v||{}; renderPastas(); renderLista(); }));
  S.unsubs.push(DB.on(S.base+'/quizzes',v=>{ S.quizzes=v||{}; renderPastas(); renderLista(); }));
  S.unsubs.push(DB.on(S.base+'/historico',v=>{ S.historico=v||{}; renderHist(); }));
  limparSalasAntigas();
}
async function limparSalasAntigas(){
  try{ const v=await DB.porCampo('salas','dono',S.user.uid)||{}; const lim=DB.agora()-6*3600e3;
    for(const pin in v){ if((v[pin].criado||0)<lim) await DB.remove('salas/'+pin); } }catch(e){}
}
function quizObj(id){ const q=S.quizzes[id]; if(!q) return null;
  return {id,titulo:q.titulo||'Quiz sem título',pasta:q.pasta||'',atualizado:q.atualizado||0,perguntas:X.toArr(q.perguntas).map(X.normQ)}; }

/* ---------- Pastas ---------- */
const ordenarPastas=()=>Object.entries(S.pastas).sort((a,b)=>String(a[1].nome).localeCompare(String(b[1].nome),'pt-BR'));
const naPasta=(q,sel)=>sel==='__todos'||(sel==='__sem'?!(q.pasta&&S.pastas[q.pasta]):q.pasta===sel);
const IC_PASTA='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h5l2 2h8A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>';
function renderPastas(){
  if(!['__todos','__sem'].includes(S.pastaSel)&&!S.pastas[S.pastaSel]) S.pastaSel='__todos';
  const qs=Object.values(S.quizzes);
  const item=(id,nm)=>`<button class="pasta${S.pastaSel===id?' ativa':''}" data-p="${id}">${IC_PASTA}<span class="nm">${esc(nm)}</span><span class="qt">${qs.filter(q=>naPasta(q,id)).length}</span></button>`;
  $('#lista-pastas').innerHTML=item('__todos','Todos os quizzes')+ordenarPastas().map(([id,p])=>item(id,p.nome)).join('')+'<div class="sep"></div>'+item('__sem','Sem pasta');
}
$('#lista-pastas').addEventListener('click',e=>{ const b=e.target.closest('.pasta'); if(!b) return; S.pastaSel=b.dataset.p; renderPastas(); renderLista(); abrirAba('quizzes'); });
$('#form-pasta').addEventListener('submit',async e=>{ e.preventDefault(); const nm=$('#nova-pasta').value.trim(); if(!nm) return;
  const id=DB.chave(); try{ await DB.set(S.base+'/pastas/'+id,{nome:nm.slice(0,40),criado:Date.now()}); $('#nova-pasta').value=''; S.pastaSel=id; renderPastas(); renderLista(); toast('Pasta criada.'); }catch(err){ erroBanco(err); } });

/* ---------- Lista de quizzes ---------- */
function renderLista(){
  const sel=S.pastaSel, h=$('#titulo-pasta');
  const titulo=sel==='__todos'?'Todos os quizzes':sel==='__sem'?'Sem pasta':(S.pastas[sel]||{}).nome;
  if(!h.querySelector('#ren-inp')) h.innerHTML=esc(titulo)+(S.pastas[sel]?' <span class="pasta-ops"><button class="lnk" id="pasta-ren">Renomear</button><button class="lnk perigo" id="pasta-del">Excluir pasta</button></span>':'');
  const lista=Object.entries(S.quizzes).filter(([,q])=>naPasta(q,sel)).sort((a,b)=>(b[1].atualizado||0)-(a[1].atualizado||0));
  if(!lista.length){ $('#lista').innerHTML=`<div class="vazio"><p><b>Nenhum quiz ${sel==='__todos'?'ainda':'nesta pasta'}.</b></p><p>Crie um novo quiz ou importe uma planilha com um Quiz.</p></div>`; return; }
  const opts=pasta=>'<option value="">Sem pasta</option>'+ordenarPastas().map(([pid,p])=>`<option value="${pid}"${pasta===pid?' selected':''}>${esc(p.nome)}</option>`).join('');
  $('#lista').innerHTML=lista.map(([id,q])=>{ const ps=X.toArr(q.perguntas).map(X.normQ), n=ps.length, inc=n-ps.filter(X.valida).length;
    return `<article class="qcard" data-id="${id}">
      <div class="qcard-naipes">${X.naipes4()}</div>
      <h3>${esc(q.titulo||'Quiz sem título')}</h3>
      <p class="meta">${n} pergunta${n!==1?'s':''}${inc?` · <span class="alerta">${inc} incompleta${inc!==1?'s':''}</span>`:''} · editado em ${X.fmtData(q.atualizado)}</p>
      <div class="qcard-acoes"><button class="btn btn-prim" data-act="jogar">▶ Iniciar jogo</button><button class="btn btn-ghost" data-act="editar">Editar</button></div>
      <label class="qcard-mover">Pasta: <select data-act="mover" aria-label="Mover para a pasta">${opts(q.pasta)}</select></label>
      <div class="qcard-mais"><button class="lnk" data-act="dup">Duplicar</button><button class="lnk" data-act="xlsx">Exportar Quiz</button><button class="lnk" data-act="json">Exportar JSON</button><button class="lnk perigo" data-act="del">Excluir</button></div>
    </article>`; }).join('');
}
$('#titulo-pasta').addEventListener('click',e=>{
  const id=S.pastaSel;
  if(e.target.id==='pasta-ren'){ const nm=(S.pastas[id]||{}).nome||'';
    $('#titulo-pasta').innerHTML=`<label class="sr" for="ren-inp">Novo nome da pasta</label><input class="inp" id="ren-inp" maxlength="40" value="${esc(nm)}" style="max-width:280px"> <button class="btn btn-sec" id="ren-ok">Salvar</button> <button class="lnk" id="ren-x">Cancelar</button>`;
    $('#ren-inp').focus(); $('#ren-inp').select(); }
  else if(e.target.id==='ren-ok'){ const nm=$('#ren-inp').value.trim(); if(!nm) return; $('#titulo-pasta').innerHTML=''; DB.set(`${S.base}/pastas/${id}/nome`,nm.slice(0,40)).then(renderLista).catch(erroBanco); }
  else if(e.target.id==='ren-x'){ $('#titulo-pasta').innerHTML=''; renderLista(); }
  else if(e.target.id==='pasta-del'){ X.confirmar2(e.target,'Confirmar: excluir pasta (os quizzes vão para “Sem pasta”)',()=>{
      const upd={['pastas/'+id]:null}; for(const qid in S.quizzes) if(S.quizzes[qid].pasta===id) upd[`quizzes/${qid}/pasta`]='';
      S.pastaSel='__todos'; DB.update(S.base,upd).then(()=>toast('Pasta excluída.')).catch(erroBanco); }); }
});
$('#titulo-pasta').addEventListener('keydown',e=>{ if(e.target.id==='ren-inp'&&e.key==='Enter'){ e.preventDefault(); $('#ren-ok').click(); } });
$('#lista').addEventListener('click',e=>{
  const b=e.target.closest('button[data-act]'); if(!b) return; const id=b.closest('.qcard').dataset.id; const quiz=quizObj(id); if(!quiz) return;
  const a=b.dataset.act;
  if(a==='jogar') iniciarJogo(id);
  else if(a==='editar') abrirEditor(id);
  else if(a==='dup'){ const nid=DB.chave(); DB.set(`${S.base}/quizzes/${nid}`,{titulo:quiz.titulo+' (cópia)',pasta:quiz.pasta,atualizado:Date.now(),perguntas:quiz.perguntas}).then(()=>toast('Quiz duplicado.')).catch(erroBanco); }
  else if(a==='xlsx') exportarKahoot(quiz);
  else if(a==='json') exportarJson(quiz);
  else if(a==='del') X.confirmar2(b,'Confirmar exclusão',()=>DB.remove(`${S.base}/quizzes/${id}`).then(()=>toast('Quiz excluído.')).catch(erroBanco));
});
$('#lista').addEventListener('change',e=>{ if(e.target.dataset.act!=='mover') return; const id=e.target.closest('.qcard').dataset.id;
  DB.set(`${S.base}/quizzes/${id}/pasta`,e.target.value).then(()=>toast('Quiz movido.')).catch(erroBanco); });
function pastaAtual(){ return S.pastas[S.pastaSel]?S.pastaSel:''; }
$('#bt-novo').addEventListener('click',async()=>{ const id=DB.chave();
  try{ await DB.set(`${S.base}/quizzes/${id}`,{titulo:'Novo quiz',pasta:pastaAtual(),atualizado:Date.now(),perguntas:[X.blankQ()]}); S.quizzes[id]={titulo:'Novo quiz',pasta:pastaAtual(),perguntas:[X.blankQ()]}; abrirEditor(id); setTimeout(()=>$('#ed-titulo').select(),60); }catch(e){ erroBanco(e); } });

/* Abas */
function abrirAba(n){ document.querySelectorAll('.aba').forEach(b=>b.classList.toggle('ativa',b.dataset.aba===n)); $('#sec-quizzes').hidden=n!=='quizzes'; $('#sec-resultados').hidden=n!=='resultados'; }
document.querySelectorAll('.aba').forEach(b=>b.addEventListener('click',()=>abrirAba(b.dataset.aba)));

/* ---------- Histórico de partidas ---------- */
function renderHist(){
  const L=Object.entries(S.historico).sort((a,b)=>(b[1].data||0)-(a[1].data||0));
  if(!L.length){ $('#hist').innerHTML='<div class="vazio"><p><b>Nenhuma partida ainda.</b></p><p>Ao final de cada jogo, o ranking completo fica guardado aqui.</p></div>'; return; }
  $('#hist').innerHTML=L.map(([id,h])=>{ const rk=X.toArr(h.ranking);
    return `<details class="hcard" data-id="${id}"><summary><b>${esc(h.titulo)}</b><span class="meta">${X.fmtDataHora(h.data)} · ${rk.length} jogador${rk.length!==1?'es':''}${rk[0]?' · 1º lugar: '+esc(rk[0].nome):''}</span></summary>
      <div class="corpo"><div class="tabela-wrap">${tabelaRanking(rk,h.perguntas)}</div>
      <div class="linha-btn" style="justify-content:flex-start"><button class="btn btn-sec" data-act="xls">Exportar resultado (.xlsx)</button><button class="btn btn-perigo" data-act="del">Excluir registro</button></div></div></details>`; }).join('');
}
function tabelaRanking(rk,tot){ return `<table class="rk"><thead><tr><th>Pos.</th><th>Aluno</th><th>Pontos</th><th>Acertos</th><th>%</th></tr></thead><tbody>${rk.map((r,i)=>`<tr><td>${i+1}º</td><td>${esc(r.nome)}</td><td>${X.fmt(r.pontos)}</td><td>${r.acertos}/${tot}</td><td>${tot?Math.round(100*r.acertos/tot):0}%</td></tr>`).join('')}</tbody></table>`; }
$('#hist').addEventListener('click',e=>{ const b=e.target.closest('button[data-act]'); if(!b) return; const id=b.closest('.hcard').dataset.id; const h=S.historico[id]; if(!h) return;
  if(b.dataset.act==='xls') exportarResultado(h.titulo,h.data,X.toArr(h.ranking),h.perguntas);
  else X.confirmar2(b,'Confirmar exclusão',()=>DB.remove(`${S.base}/historico/${id}`).catch(erroBanco)); });

/* ---------- Importar / exportar ---------- */
$('#bt-imp-xlsx').addEventListener('click',()=>$('#f-xlsx').click());
$('#bt-imp-json').addEventListener('click',()=>$('#f-json').click());
$('#f-xlsx').addEventListener('change',async e=>{ const f=e.target.files[0]; e.target.value=''; if(f) await importarXlsx(f); });
$('#f-json').addEventListener('change',async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
  try{ const d=JSON.parse(await f.text()); const lista=(Array.isArray(d)?d:[d]).filter(x=>x&&(x.perguntas||x.questions));
    if(!lista.length) throw 0; const upd={};
    lista.forEach(x=>{ upd['quizzes/'+DB.chave()]={titulo:String(x.titulo||x.title||'Quiz importado').slice(0,80),pasta:pastaAtual(),atualizado:Date.now(),perguntas:X.toArr(x.perguntas||x.questions).map(X.normQ)}; });
    await DB.update(S.base,upd); toast(lista.length>1?`${lista.length} quizzes importados.`:'Quiz importado.');
  }catch(err){ toast('Este arquivo não é um quiz do Exata Quiz em JSON.'); } });
async function importarXlsx(file){
  if(typeof XLSX==='undefined'){ toast('A leitura de planilhas não carregou. Verifique a internet e recarregue a página.'); return; }
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});
    const h=rows.findIndex(r=>r.some(c=>/^\s*(question|pergunta)/i.test(String(c))));
    if(h<0){ toast('Não encontrei a coluna "Question" do modelo do Quiz nesta planilha.'); return; }
    const hdr=rows[h].map(c=>String(c).trim().toLowerCase()), col=re=>hdr.findIndex(c=>re.test(c));
    const cq=col(/^(question|pergunta)/), ct=col(/time|tempo/), cc=col(/correct|correta/);
    const ca=[1,2,3,4].map(n=>col(new RegExp('^(answer|resposta|alternativa)\\s*'+n)));
    const qs=[];
    for(const r of rows.slice(h+1)){
      const q=String(r[cq]||'').trim(); if(!q) continue;
      const a=ca.map(ci=>ci>=0?String(r[ci]).trim():''), t=parseInt(r[ct],10);
      const c=String(cc>=0?r[cc]:'').split(/[,;\s]+/).map(x=>parseInt(x,10)-1).filter(x=>x>=0&&x<4&&a[x]);
      qs.push(X.normQ({q,a,c,t:X.TIMES.includes(t)?t:20}));
    }
    const rs=wb.SheetNames.find(n=>/resolu|explica/i.test(n));
    if(rs){ const rr=XLSX.utils.sheet_to_json(wb.Sheets[rs],{header:1,defval:''}); const hh=(rr[0]||[]).map(c=>String(c).toLowerCase());
      const ce=hh.findIndex(c=>/resolu|explica/.test(c)), cn=hh.findIndex(c=>/^n/.test(c));
      if(ce>=0) rr.slice(1).forEach((r,k)=>{ const idx=cn>=0&&parseInt(r[cn],10)?parseInt(r[cn],10)-1:k; if(qs[idx]&&r[ce]) qs[idx].exp=String(r[ce]).slice(0,300); }); }
    if(!qs.length){ toast('A planilha não tem perguntas preenchidas abaixo do cabeçalho.'); return; }
    const titulo=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'Quiz importado';
    await DB.set(`${S.base}/quizzes/${DB.chave()}`,{titulo,pasta:pastaAtual(),atualizado:Date.now(),perguntas:qs});
    toast(`Importado: ${qs.length} perguntas${rs?' com resoluções':''}.`);
  }catch(err){ console.error(err); toast('Não consegui ler esta planilha. Confira se é um .xlsx no modelo do Quiz.'); }
}
const slug=s=>String(s||'quiz').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'')||'quiz';
function baixar(nome,blob){ const u=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),3000); toast('Arquivo gerado: '+nome); }
const MIME_XLSX='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function exportarJson(q){ baixar(slug(q.titulo)+'.json',new Blob([JSON.stringify({titulo:q.titulo,perguntas:q.perguntas},null,1)],{type:'application/json'})); }
function exportarKahoot(q){
  if(typeof XLSX==='undefined'){ toast('A geração de planilhas não carregou. Verifique a internet.'); return; }
  const ok=q.perguntas.filter(X.valida);
  const aoa=[[],['',q.titulo],[],['','Gerado pelo Exata Quiz · modelo de importação do Quiz'],[],[],[],
    ['','Question - max 120 characters','Answer 1 - max 75 characters','Answer 2 - max 75 characters','Answer 3 - max 75 characters','Answer 4 - max 75 characters','Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs','Correct answer(s) - choose at least one']];
  ok.forEach((p,i)=>aoa.push([i+1,p.q,...p.a,p.t,p.c.filter(k=>p.a[k].trim()).map(k=>k+1).join(',')]));
  const wb=XLSX.utils.book_new(), ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:4},{wch:60},{wch:30},{wch:30},{wch:30},{wch:30},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws,'Kahoot');
  const ws2=XLSX.utils.aoa_to_sheet([['Nº','Pergunta','Resposta correta','Resolução'],...ok.map((p,i)=>[i+1,p.q,p.c.filter(k=>p.a[k].trim()).map(k=>p.a[k]).join(' / '),p.exp||''])]);
  ws2['!cols']=[{wch:4},{wch:60},{wch:30},{wch:60}]; XLSX.utils.book_append_sheet(wb,ws2,'Resoluções');
  baixar(slug(q.titulo)+'_kahoot.xlsx',new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:MIME_XLSX}));
}
function exportarResultado(titulo,data,rk,tot){
  if(typeof XLSX==='undefined'){ toast('A geração de planilhas não carregou. Verifique a internet.'); return; }
  const aoa=[[titulo],['Partida de '+X.fmtDataHora(data)+' · '+tot+' perguntas'],[],['Posição','Aluno','Pontos','Acertos','Total de perguntas','Aproveitamento']];
  rk.forEach((r,i)=>aoa.push([i+1,r.nome,r.pontos,r.acertos,tot,tot?r.acertos/tot:0]));
  const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:9},{wch:28},{wch:10},{wch:9},{wch:18},{wch:15}];
  for(let i=0;i<rk.length;i++){ const c=ws[XLSX.utils.encode_cell({r:4+i,c:5})]; if(c) c.z='0%'; }
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Resultado');
  baixar('resultado_'+slug(titulo)+'_'+new Date(data||Date.now()).toISOString().slice(0,10)+'.xlsx',new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:MIME_XLSX}));
}

/* ---------- Editor ---------- */
function abrirEditor(id,idx){ const q=quizObj(id); if(!q) return; if(!q.perguntas.length) q.perguntas.push(X.blankQ());
  S.edit={quiz:q,idx:Math.max(0,Math.min(idx||0,q.perguntas.length-1))}; $('#ed-titulo').value=q.titulo; $('#ed-status').textContent='Salvo';
  renderThumbs(); renderQ(); show('editor'); }
const cur=()=>S.edit.quiz.perguntas[S.edit.idx];
let tSalva=null;
function salvarQuiz(){ const q=S.edit.quiz; clearTimeout(tSalva); tSalva=null;
  return DB.set(`${S.base}/quizzes/${q.id}`,{titulo:q.titulo,pasta:q.pasta,atualizado:Date.now(),perguntas:q.perguntas})
    .then(()=>{ $('#ed-status').textContent='Salvo'; }).catch(e=>{ $('#ed-status').textContent='Não salvo'; erroBanco(e); }); }
function mexeu(){ $('#ed-status').textContent='Salvando…'; clearTimeout(tSalva); tSalva=setTimeout(salvarQuiz,700); }
function renderThumbs(rolar){ const qs=S.edit.quiz.perguntas;
  $('#thumbs').innerHTML=qs.map((q,i)=>`<button class="thumb${i===S.edit.idx?' ativo':''}" data-i="${i}" aria-label="Pergunta ${i+1}">
    <span class="t-num">${i+1}${X.valida(q)?'':' <b class="t-alerta" title="Pergunta incompleta">!</b>'}</span>
    <span class="t-txt">${esc(q.q||'Pergunta sem texto')}</span>
    <span class="t-mini">${[0,1,2,3].map(k=>`<i class="${q.a[k].trim()?(q.c.includes(k)?'certo':''):'vazio'}"></i>`).join('')}</span></button>`).join('');
  if(rolar){ const a=$('#thumbs .ativo'); if(a) a.scrollIntoView({block:'nearest',inline:'nearest'}); } }
const cont=()=>{ $('#ed-q-cont').textContent=`${$('#ed-q').value.length}/120`; };
function renderImg(){ const q=cur(); $('#ed-img').innerHTML=q.img?`<div class="img-prev"><img src="${q.img}" alt="Imagem da pergunta"><button class="lnk perigo" id="ed-img-rem">Remover imagem</button></div>`
  :'<label class="drop" for="ed-img-file" id="ed-drop"><b>+</b>Inserir imagem<small>clique ou arraste um arquivo aqui</small></label>'; }
function renderQ(){ const q=cur(), i=S.edit.idx;
  $('#ed-num').textContent=`Pergunta ${i+1} de ${S.edit.quiz.perguntas.length}`; $('#ed-q').value=q.q; cont(); renderImg();
  $('#ed-respostas').innerHTML=[0,1,2,3].map(k=>`<div class="resp-ed r${k}${q.a[k].trim()?' cheia':''}">
    <span class="resp-naipe" title="${X.SUITS[k].nome}">${X.naipe(k)}</span>
    <label class="sr" for="ed-a${k}">Resposta ${k+1} (${X.SUITS[k].nome})</label>
    <input id="ed-a${k}" data-k="${k}" maxlength="75" placeholder="Resposta ${k+1}${k>1?' (opcional)':''}" value="${esc(q.a[k])}">
    <button class="marcar${q.c.includes(k)?' on':''}" data-k="${k}" aria-pressed="${q.c.includes(k)}" aria-label="Marcar resposta ${k+1} como correta"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`).join('');
  $('#ed-exp').value=q.exp||''; $('#ed-tempo').value=String(q.t); $('#ed-pontos').value=q.p; }
function irPara(i){ S.edit.idx=i; renderThumbs(true); renderQ(); }
$('#thumbs').addEventListener('click',e=>{ const b=e.target.closest('.thumb'); if(b) irPara(+b.dataset.i); });
$('#ed-q').addEventListener('input',e=>{ cur().q=e.target.value; cont(); renderThumbs(); mexeu(); });
$('#ed-respostas').addEventListener('input',e=>{ const k=+e.target.dataset.k; if(isNaN(k)) return; cur().a[k]=e.target.value; e.target.closest('.resp-ed').classList.toggle('cheia',!!e.target.value.trim()); renderThumbs(); mexeu(); });
$('#ed-respostas').addEventListener('click',e=>{ const b=e.target.closest('.marcar'); if(!b) return; const k=+b.dataset.k, q=cur();
  q.c=q.c.includes(k)?q.c.filter(x=>x!==k):[...q.c,k].sort(); b.classList.toggle('on',q.c.includes(k)); b.setAttribute('aria-pressed',q.c.includes(k)); renderThumbs(); mexeu(); });
$('#ed-exp').addEventListener('input',e=>{ cur().exp=e.target.value; mexeu(); });
$('#ed-tempo').addEventListener('change',e=>{ cur().t=+e.target.value; mexeu(); });
$('#ed-pontos').addEventListener('change',e=>{ cur().p=e.target.value; mexeu(); });
$('#ed-titulo').addEventListener('input',e=>{ S.edit.quiz.titulo=e.target.value; mexeu(); });
$('#ed-add').addEventListener('click',()=>{ S.edit.quiz.perguntas.splice(S.edit.idx+1,0,X.blankQ()); mexeu(); irPara(S.edit.idx+1); $('#ed-q').focus(); });
$('#ed-dup').addEventListener('click',()=>{ S.edit.quiz.perguntas.splice(S.edit.idx+1,0,JSON.parse(JSON.stringify(cur()))); mexeu(); irPara(S.edit.idx+1); toast('Pergunta duplicada.'); });
function mover(d){ const qs=S.edit.quiz.perguntas, i=S.edit.idx, j=i+d; if(j<0||j>=qs.length) return; [qs[i],qs[j]]=[qs[j],qs[i]]; mexeu(); irPara(j); }
$('#ed-up').addEventListener('click',()=>mover(-1)); $('#ed-down').addEventListener('click',()=>mover(1));
$('#ed-del').addEventListener('click',e=>X.confirmar2(e.currentTarget,'Confirmar exclusão',()=>{ const qs=S.edit.quiz.perguntas; qs.splice(S.edit.idx,1); if(!qs.length) qs.push(X.blankQ()); mexeu(); irPara(Math.min(S.edit.idx,qs.length-1)); toast('Pergunta excluída.'); }));
$('#ed-voltar').addEventListener('click',async()=>{ if(tSalva) await salvarQuiz(); show('painel'); renderLista(); });
$('#ed-jogar').addEventListener('click',async()=>{ await salvarQuiz(); S.quizzes[S.edit.quiz.id]={titulo:S.edit.quiz.titulo,pasta:S.edit.quiz.pasta,atualizado:Date.now(),perguntas:S.edit.quiz.perguntas}; iniciarJogo(S.edit.quiz.id); });
$('#ed-xlsx').addEventListener('click',()=>exportarKahoot(S.edit.quiz));
function lerImagem(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>{ const im=new Image(); im.onload=()=>{ const M=900, s=Math.min(1,M/Math.max(im.width,im.height));
  const cv=document.createElement('canvas'); cv.width=Math.round(im.width*s); cv.height=Math.round(im.height*s); const cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height); cx.drawImage(im,0,0,cv.width,cv.height); res(cv.toDataURL('image/jpeg',.8)); }; im.onerror=rej; im.src=fr.result; }; fr.onerror=rej; fr.readAsDataURL(file); }); }
async function usarImagem(f){ if(!f||!/^image\//.test(f.type)){ toast('Escolha um arquivo de imagem (PNG ou JPG).'); return; }
  try{ cur().img=await lerImagem(f); renderImg(); mexeu(); }catch(e){ toast('Não consegui abrir esta imagem.'); } }
$('#ed-img-file').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; usarImagem(f); });
$('#ed-img').addEventListener('click',e=>{ if(e.target.id==='ed-img-rem'){ cur().img=null; renderImg(); mexeu(); } });
$('#ed-img').addEventListener('dragover',e=>{ e.preventDefault(); const d=$('#ed-drop'); if(d) d.classList.add('sobre'); });
$('#ed-img').addEventListener('dragleave',()=>{ const d=$('#ed-drop'); if(d) d.classList.remove('sobre'); });
$('#ed-img').addEventListener('drop',e=>{ e.preventDefault(); usarImagem(e.dataTransfer.files[0]); });

/* =========================================================
   JOGO AO VIVO (tela do projetor)
   ========================================================= */
let H=null;
const palco=html=>{ $('#palco').innerHTML=html; };
const sala=p=>'salas/'+H.pin+(p?'/'+p:'');
function limparTimer(){ if(H&&H.tm){ clearTimeout(H.tm); clearInterval(H.tm); H.tm=null; } }
function setHud(){ $('#hud-pin').textContent=H?'PIN '+H.pin:''; $('#hud-prog').textContent=H&&H.qs&&['intro','pergunta','revela','placar'].includes(H.fase)?`${H.i+1} / ${H.qs.length}`:''; }
const nJog=()=>H?Object.keys(H.jog).length:0;
function ranking(){ return Object.entries(H.jog).map(([pid,j])=>({pid,nome:String(j.nome||'Aluno'),pontos:j.pontos||0,acertos:j.acertos||0,seq:j.seq||0}))
  .sort((a,b)=>b.pontos-a.pontos||b.acertos-a.acertos||a.nome.localeCompare(b.nome,'pt-BR')); }

async function iniciarJogo(id){
  const q=quizObj(id); if(!q) return; const validas=q.perguntas.filter(X.valida);
  if(!validas.length){ toast('Este quiz não tem perguntas completas: cada uma precisa de texto, duas respostas e uma correta.'); return; }
  let pin='', t=0;
  try{ do{ pin=String(Math.floor(100000+Math.random()*900000)); t++; } while(t<8 && await DB.get('salas/'+pin+'/dono'));
    await DB.set('salas/'+pin,{dono:S.user.uid,titulo:q.titulo,criado:DB.TS,estado:'lobby',total:validas.length}); }
  catch(e){ erroBanco(e); return; }
  H={pin,quiz:q,validas,jog:{},unsubs:[],tm:null,i:-1,fase:'lobby',cfg:{embQ:false,embA:false,resol:true},seq:{},res:{},resp:{}};
  H.unsubs.push(DB.on(sala('jogadores'),v=>{ const antes=nJog(); H.jog=v||{}; if(nJog()>antes) X.som.entrada();
    if(H.fase==='lobby') renderJogadores(); else if(H.fase==='pergunta') contarRespostas(); }));
  show('host'); lobby();
}
function lobby(){
  H.fase='lobby'; setHud(); const url=X.urlAluno();
  palco(`<div class="lobby">
    <div class="lobby-topo">
      <div class="pin-box"><p class="url">Entre em <b>${esc(url.replace(/^https?:\/\//,''))}</b></p><p class="eyebrow">PIN do jogo</p><p class="pin">${H.pin.slice(0,3)} ${H.pin.slice(3)}</p></div>
      <div class="qr" id="qr" role="img" aria-label="QR Code para entrar no jogo"></div>
    </div>
    <div class="config-jogo"><b>Opções do professor:</b>
      <label for="cf-embq"><input type="checkbox" id="cf-embq"${H.cfg.embQ?' checked':''}> Embaralhar perguntas</label>
      <label for="cf-emba"><input type="checkbox" id="cf-emba"${H.cfg.embA?' checked':''}> Embaralhar alternativas</label>
      <label for="cf-resol"><input type="checkbox" id="cf-resol"${H.cfg.resol?' checked':''}> Mostrar resolução após cada pergunta</label>
    </div>
    <div class="lobby-meio"><div class="contador"><b id="n-jog">0</b> jogadores</div><span class="dica">Clique num nome para remover o aluno.</span>
      <div class="linha-btn"><button class="btn btn-prim btn-gde" id="bt-iniciar" disabled>Iniciar</button></div></div>
    <div class="jogadores" id="jogadores"></div>
  </div>`);
  try{ if(window.QRCode) new QRCode($('#qr'),{text:url+'?pin='+H.pin,width:170,height:170,colorDark:'#003366',colorLight:'#ffffff'}); else $('#qr').hidden=true; }catch(e){ $('#qr').hidden=true; }
  renderJogadores();
}
function renderJogadores(){
  const el=$('#jogadores'); if(!el) return;
  const L=Object.entries(H.jog).sort((a,b)=>(a[1].entrou||0)-(b[1].entrou||0));
  $('#n-jog').textContent=L.length; $('#bt-iniciar').disabled=!L.length;
  el.innerHTML=L.length?L.map(([pid,j])=>`<button class="chip" data-pid="${pid}" title="Remover ${esc(j.nome)}">${esc(j.nome)}</button>`).join('')
    :'<p class="esperando">Aguardando os alunos entrarem com o PIN…</p>';
}
$('#palco').addEventListener('click',e=>{
  if(!H) return; const t=e.target;
  const chip=t.closest('.chip'); if(chip&&H.fase==='lobby'){ const nm=chip.textContent; DB.remove(sala('jogadores/'+chip.dataset.pid)).then(()=>toast(nm+' foi removido.')).catch(erroBanco); return; }
  if(t.closest('#bt-iniciar')) comecar();
  else if(t.closest('#bt-encerrar-tempo')) encerrarPergunta();
  else if(t.closest('#bt-avancar')) avancar();
  else if(t.closest('#bt-exportar')) exportarResultado(H.quiz.titulo,H.data,ranking(),H.qs.length);
  else if(t.closest('#bt-voltar-painel')) encerrarSala();
});
$('#palco').addEventListener('change',e=>{ if(!H) return; if(e.target.id==='cf-embq') H.cfg.embQ=e.target.checked; if(e.target.id==='cf-emba') H.cfg.embA=e.target.checked; if(e.target.id==='cf-resol') H.cfg.resol=e.target.checked; });

async function comecar(){
  if(!nJog()) return;
  let ordem=H.validas.slice(); if(H.cfg.embQ) ordem=X.embaralhar(ordem);
  H.qs=ordem.map(q=>{ let alts=q.a.map((txt,orig)=>({txt,orig})).filter(x=>x.txt.trim()); if(H.cfg.embA) alts=X.embaralhar(alts);
    return {q,alts,certas:alts.map((a,k)=>q.c.includes(a.orig)?k:-1).filter(k=>k>=0)}; });
  try{ await DB.update(sala(),{estado:'jogo',total:H.qs.length}); }catch(e){ erroBanco(e); return; }
  X.som.beep(1,.01,'sine',.0001); contagem(3);
}
function contagem(n){ H.fase='contagem'; setHud(); if(n===0){ intro(0); return; } const s=(3-n)%4;
  palco(`<div class="contagem"><div class="carta-gde"><span class="canto a n${s}">${X.naipe(s)}</span>${n}<span class="canto b n${s}">${X.naipe(s)}</span></div><p>Prepare-se!</p></div>`);
  X.som.beep(520,.12); H.tm=setTimeout(()=>contagem(n-1),900); }
async function intro(i){
  limparTimer(); H.i=i; H.chave='q'+i; H.fase='intro'; setHud(); const it=H.qs[i];
  try{ await DB.update(sala(),{atual:{chave:H.chave,i,total:H.qs.length,fase:'intro',q:it.q.q,alts:it.alts.map(a=>a.txt),tempo:it.q.t,img:it.q.img||null,dobro:it.q.p==='double',semPontos:it.q.p==='none'}}); }catch(e){ erroBanco(e); }
  palco(`<div class="intro"><p class="eyebrow">Pergunta ${i+1} de ${H.qs.length}${it.q.p==='double'?' · pontos em dobro':''}</p><h2>${esc(it.q.q)}</h2><div class="barra"><span id="barra"></span></div></div>`);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ const b=$('#barra'); if(b) b.style.width='100%'; }));
  H.tm=setTimeout(perguntar,3000);
}
async function perguntar(){
  limparTimer(); const it=H.qs[H.i], T=it.q.t; H.fase='pergunta'; H.resp={}; H.fechando=false; H.inicio=DB.agora(); setHud();
  try{ await DB.update(sala('atual'),{fase:'pergunta',inicio:H.inicio}); }catch(e){ erroBanco(e); }
  palco(`<div class="pergunta"><div class="q-barra"><h2>${esc(it.q.q)}</h2></div>
    <div class="q-meio"><div class="relogio" id="relogio"><span id="seg">${T}</span></div>
      <div class="q-midia">${it.q.img?`<img src="${it.q.img}" alt="Imagem da pergunta">`:`<div class="q-sem-img">${X.naipes4()}</div>`}</div>
      <div class="q-lado"><div class="respostas-cont"><b id="n-resp">0</b><span>respostas</span></div><button class="btn btn-ghost" id="bt-encerrar-tempo">Encerrar tempo</button></div></div>
    <div class="alts">${it.alts.map((a,k)=>`<div class="alt c${k}">${X.naipe(k)}<span>${esc(a.txt)}</span></div>`).join('')}</div></div>`);
  if(H.unResp) H.unResp();
  H.unResp=DB.on(sala('respostas/'+H.chave),v=>{ H.resp=v||{}; contarRespostas(); });
  let ult=T;
  H.tm=setInterval(()=>{ const rest=Math.max(0,T-(DB.agora()-H.inicio)/1000), s=Math.ceil(rest); const sg=$('#seg'), rl=$('#relogio'); if(!sg) return;
    sg.textContent=s; rl.style.setProperty('--p',rest/T); rl.classList.toggle('fim',s<=5);
    if(s!==ult){ ult=s; if(s<=5&&s>0) X.som.tick(); }
    if(rest<=0) encerrarPergunta(); },100);
}
function contarRespostas(){
  const n=Object.keys(H.resp).filter(pid=>H.jog[pid]).length, el=$('#n-resp'); if(el) el.textContent=n;
  if(H.fase==='pergunta'&&nJog()>0&&n>=nJog()&&!H.fechando){ H.fechando=true; setTimeout(encerrarPergunta,700); }
}
async function encerrarPergunta(){
  if(!H||H.fase!=='pergunta') return; H.fase='revela'; limparTimer(); if(H.unResp){ H.unResp(); H.unResp=null; }
  let resp=H.resp; try{ resp=(await DB.get(sala('respostas/'+H.chave)))||resp||{}; }catch(e){}
  const it=H.qs[H.i], T=it.q.t, dist=it.alts.map(()=>0), upd={}; H.res={};
  for(const pid in H.jog){ const j=H.jog[pid], r=resp[pid]; let certo=false, ganho=0, k=null;
    if(r&&typeof r.k==='number'&&r.k>=0&&r.k<it.alts.length){ k=r.k; dist[k]++; certo=it.certas.includes(k); }
    const seq=certo?(H.seq[pid]||0)+1:0; H.seq[pid]=seq;
    if(certo&&it.q.p!=='none'){ const rt=Math.max(0,((r.t||H.inicio)-H.inicio)/1000); ganho=X.pontos(rt,T,it.q.p)+X.bonusSeq(seq); }
    j.pontos=(j.pontos||0)+ganho; j.acertos=(j.acertos||0)+(certo?1:0); j.seq=seq;
    upd[`jogadores/${pid}/pontos`]=j.pontos; upd[`jogadores/${pid}/acertos`]=j.acertos; upd[`jogadores/${pid}/seq`]=seq;
    H.res[pid]={certo,ganho,k}; }
  ranking().forEach((r,idx)=>{ const x=H.res[r.pid]; upd[`resultados/${H.chave}/${r.pid}`]={certo:x.certo,ganho:x.ganho,k:x.k,pos:idx+1,pontos:r.pontos,seq:r.seq,total:nJog()}; });
  upd['atual/fase']='revela'; upd['atual/certas']=it.certas; upd['atual/dist']=dist; if(H.cfg.resol&&it.q.exp) upd['atual/exp']=it.q.exp;
  try{ await DB.update(sala(),upd); }catch(e){ erroBanco(e); }
  X.som.acerto(); setHud();
  const max=Math.max(1,...dist);
  palco(`<div class="pergunta"><div class="q-barra"><h2>${esc(it.q.q)}</h2></div>
    <div class="dist">${it.alts.map((a,k)=>`<div class="col c${k} ${it.certas.includes(k)?'certa':'errada'}"><span class="rot">${X.naipe(k)} ${dist[k]}${it.certas.includes(k)?' ✓':''}</span><div class="bar" style="height:${Math.round(100*dist[k]/max)}%"></div></div>`).join('')}</div>
    <div class="alts revelado">${it.alts.map((a,k)=>`<div class="alt c${k} ${it.certas.includes(k)?'certa':'errada'}">${X.naipe(k)}<span>${esc(a.txt)}</span><em>${it.certas.includes(k)?'✓':'✗'}</em></div>`).join('')}</div>
    ${H.cfg.resol&&it.q.exp?`<div class="explica"><b>Resolução</b><p>${esc(it.q.exp)}</p></div>`:''}
    <div class="linha-btn"><button class="btn btn-prim btn-gde" id="bt-avancar">Ver placar</button></div></div>`);
}
async function placar(){
  H.fase='placar'; setHud(); try{ await DB.update(sala('atual'),{fase:'placar'}); }catch(e){}
  const rk=ranking().slice(0,5), ultima=H.i+1>=H.qs.length;
  palco(`<div class="centro"><h2 style="font-size:clamp(2rem,5vw,3rem);color:var(--marinho)">Placar</h2>
    <ol class="placar-lista">${rk.map((r,i)=>`<li style="animation-delay:${i*.08}s"><span class="pos">${i+1}º</span><span>${esc(r.nome)}${r.seq>1?`<span class="seq">${r.seq} seguidas</span>`:''}</span><span class="pts">${X.fmt(r.pontos)}</span></li>`).join('')||'<li><span></span><span>Sem jogadores</span><span></span></li>'}</ol>
    <div class="linha-btn"><button class="btn btn-prim btn-gde" id="bt-avancar">${ultima?'Ver pódio':'Próxima pergunta'}</button></div></div>`);
}
function avancar(){ if(!H) return; if(H.fase==='revela') placar(); else if(H.fase==='placar'){ if(H.i+1<H.qs.length) intro(H.i+1); else fim(); } }
async function fim(){
  H.fase='fim'; limparTimer(); setHud(); H.data=Date.now(); const rk=ranking();
  const upd={estado:'fim','atual/fase':'fim',podio:rk.slice(0,3).map(r=>({nome:r.nome,pontos:r.pontos}))};
  rk.forEach((r,i)=>{ upd['final/'+r.pid]={pos:i+1,pontos:r.pontos,acertos:r.acertos,total:H.qs.length,jogadores:rk.length}; });
  try{ await DB.update(sala(),upd); await DB.set(`${S.base}/historico/${DB.chave()}`,{titulo:H.quiz.titulo,data:H.data,perguntas:H.qs.length,ranking:rk.map(r=>({nome:r.nome,pontos:r.pontos,acertos:r.acertos}))}); }catch(e){ erroBanco(e); }
  const d=n=>rk[n]?`<div class="degrau p${n+1}" id="dg${n+1}"><span class="nome">${esc(rk[n].nome)}</span><span class="pts">${X.fmt(rk[n].pontos)} pts · ${rk[n].acertos}/${H.qs.length}</span><div class="bloco">${n+1}º</div></div>`:'';
  palco(`<div class="centro" style="max-width:900px"><h2 style="font-size:clamp(2rem,5vw,3rem);color:var(--marinho)">Pódio</h2>
    <div class="podio">${d(1)}${d(0)}${d(2)}</div>
    <details class="hcard fim-lista" open><summary><b>Ranking completo</b><span class="meta">${rk.length} jogadores · salvo em “Resultados das partidas”</span></summary><div class="corpo"><div class="tabela-wrap">${tabelaRanking(rk,H.qs.length)}</div></div></details>
    <div class="linha-btn"><button class="btn btn-sec" id="bt-exportar">Exportar resultado (.xlsx)</button><button class="btn btn-ghost" id="bt-voltar-painel">Encerrar sala e voltar</button></div></div>`);
  [[3,600],[2,1600],[1,2800]].forEach(([p,ms])=>setTimeout(()=>{ const el=$('#dg'+p); if(el){ el.classList.add('vis'); if(p===1) X.som.fanfarra(); else X.som.beep(600,.15); } },ms));
}
async function encerrarSala(){
  if(!H) return; limparTimer(); H.unsubs.forEach(f=>{ try{f();}catch(e){} }); if(H.unResp) H.unResp();
  const pin=H.pin; H=null; try{ await DB.remove('salas/'+pin); }catch(e){}
  if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch(e){} }
  if(S.user){ show('painel'); renderLista(); } else show('login');
}
$('#bt-encerrar').addEventListener('click',e=>X.confirmar2(e.currentTarget,'Encerrar a sala?',encerrarSala));
$('#bt-som').addEventListener('click',e=>{ X.som.on=!X.som.on; e.currentTarget.setAttribute('aria-pressed',X.som.on); e.currentTarget.textContent=X.som.on?'Som ligado':'Som desligado'; });
$('#bt-tela').addEventListener('click',()=>{ try{ if(document.fullscreenElement) document.exitFullscreen(); else{ const p=document.documentElement.requestFullscreen(); if(p&&p.catch) p.catch(()=>{}); } }catch(e){} });
document.addEventListener('keydown',e=>{ if(S.view!=='host'||!H) return; if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if(e.key===' '||e.key==='Enter'||e.key==='ArrowRight'){ const b=$('#bt-avancar')||(H.fase==='lobby'?$('#bt-iniciar'):null); if(b&&!b.disabled){ e.preventDefault(); b.click(); } } });
window.addEventListener('beforeunload',e=>{ if(H&&H.fase!=='lobby'&&H.fase!=='fim'){ e.preventDefault(); e.returnValue=''; } });
})();
