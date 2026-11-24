/* EXATA CLASS — funções compartilhadas (aluno e professor) */
(function(){
'use strict';
const C = window.CLASS = {};
C.$ = (s,r)=>(r||document).querySelector(s);
C.esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
C.TIPOS = {
  prova:['📝','Prova'], gabarito:['✅','Gabarito'], resolucao:['🧮','Resolução'],
  slides:['📽️','Slides'], lista:['📄','Lista de exercícios'], material:['📚','Material de aula'], outro:['🔗','Outro']
};
C.fmt = t => new Date(t||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
C.toast = function(m){
  let t=C.$('#toast'); if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=m; t.classList.add('vis'); clearTimeout(C.toast.t); C.toast.t=setTimeout(()=>t.classList.remove('vis'),3200);
};
/* Código da turma: 6 caracteres sem letras/números parecidos (0/O, 1/I) */
C.codigo = function(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b=new Uint8Array(6); crypto.getRandomValues(b);
  return Array.from(b,x=>A[x%A.length]).join('');
};
/* Códigos têm de 6 a 12 letras/números (os gerados pelo sistema têm 6) */
C.normCodigo = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
C.linkOk = u => /^https:\/\/[^\s]{4,}$/i.test(String(u||'').trim());
C.confirmar2 = function(btn,txt,acao){
  if(btn.dataset.conf){ delete btn.dataset.conf; btn.textContent=btn.dataset.orig; btn.classList.remove('confirmar'); acao(); return; }
  btn.dataset.orig=btn.textContent; btn.dataset.conf='1'; btn.textContent=txt; btn.classList.add('confirmar');
  setTimeout(()=>{ if(btn.isConnected&&btn.dataset.conf){ delete btn.dataset.conf; btn.textContent=btn.dataset.orig; btn.classList.remove('confirmar'); } },4000);
};
/* Liga ao Firebase (mesmo projeto do Exata Quiz). Devolve false se faltar configuração. */
C.iniciar = function(){
  const cfg = window.EXATA_FIREBASE;
  if(!cfg || !cfg.apiKey || typeof firebase==='undefined') return false;
  if(!firebase.apps.length) firebase.initializeApp(cfg);
  C.db = firebase.database(); C.auth = firebase.auth();
  C.TS = firebase.database.ServerValue.TIMESTAMP;
  C.persist = C.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  return true;
};
/* Aluno: entra anonimamente e mantém o mesmo UID neste navegador */
C.alunoUid = async function(){
  await C.persist;
  if(C.auth.currentUser) return C.auth.currentUser.uid;
  const u = await new Promise(res=>{ const un=C.auth.onAuthStateChanged(x=>{un();res(x);}); });
  if(u) return u.uid;
  return (await C.auth.signInAnonymously()).user.uid;
};
/* Converte o objeto de materiais em lista ordenada (mais recentes primeiro) */
C.lista = function(obj){
  return Object.keys(obj||{}).map(id=>Object.assign({id},obj[id])).sort((a,b)=>(b.publicado||b.criado||0)-(a.publicado||a.criado||0));
};
})();
