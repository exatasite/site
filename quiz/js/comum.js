/* =========================================================
   EXATA QUIZ — funções compartilhadas (professor e aluno)
   ========================================================= */
(function(){
'use strict';
const X = window.EXQ = {};

X.$ = s => document.querySelector(s);
X.TIMES = [5,10,20,30,60,90,120,240];
X.SUITS = [{id:'spade',nome:'Espadas'},{id:'heart',nome:'Copas'},{id:'diamond',nome:'Ouros'},{id:'club',nome:'Paus'}];
const SHAPE = {
  spade:'<path d="M12 2C9.5 5.5 3 9.2 3 13.6 3 16.4 5.2 18.4 7.7 18.4c1.5 0 2.8-.6 3.6-1.6-.3 1.9-1.1 3.3-2.6 4.7h6.6c-1.5-1.4-2.3-2.8-2.6-4.7.8 1 2.1 1.6 3.6 1.6 2.5 0 4.7-2 4.7-4.8C21 9.2 14.5 5.5 12 2z"/>',
  heart:'<path d="M12 21.3l-1.4-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.3z"/>',
  diamond:'<path d="M12 1.5C14.3 5 17 8.6 20 12c-3 3.4-5.7 7-8 10.5C9.7 19 7 15.4 4 12c3-3.4 5.7-7 8-10.5z"/>',
  club:'<circle cx="12" cy="6.8" r="4.3"/><circle cx="6.8" cy="13" r="4.3"/><circle cx="17.2" cy="13" r="4.3"/><circle cx="12" cy="12" r="2.6"/><path d="M10.7 12.5h2.6c.2 3.5 1 6.2 3 8.9H7.7c2-2.7 2.8-5.4 3-8.9z"/>'
};
X.injetarNaipes = function(){
  document.body.insertAdjacentHTML('afterbegin','<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+
    Object.entries(SHAPE).map(([k,v])=>`<symbol id="s-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')+'</defs></svg>');
  const pos=[['spade',10,10],['heart',90,30],['diamond',30,100],['club',110,110]];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><g fill="#003366" fill-opacity="0.045">${pos.map(([k,x,y])=>`<g transform="translate(${x} ${y}) scale(1.7)">${SHAPE[k]}</g>`).join('')}</g></svg>`;
  document.documentElement.style.setProperty('--padrao',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
};
X.naipe = (i,cls='') => `<svg class="naipe ${cls}" aria-hidden="true"><use href="#s-${X.SUITS[i].id}"/></svg>`;
X.naipes4 = () => [0,1,2,3].map(i=>X.naipe(i,'n'+i)).join('');

X.esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
X.fmt = n => Number(n||0).toLocaleString('pt-BR');
X.uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
X.fmtData = t => new Date(t||Date.now()).toLocaleDateString('pt-BR');
X.fmtDataHora = t => new Date(t||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
X.embaralhar = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
/* O Firebase às vezes devolve listas como objetos; isto sempre devolve uma lista */
X.toArr = v => Array.isArray(v) ? v : (v && typeof v==='object' ? Object.keys(v).sort((a,b)=>a-b).map(k=>v[k]) : []);

X.toast = function(msg){
  let t=X.$('#toast'); if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('vis'); clearTimeout(X.toast.t); X.toast.t=setTimeout(()=>t.classList.remove('vis'),3400);
};
/* Botão que pede um segundo clique para confirmar */
X.confirmar2 = function(btn,txt,acao){
  if(btn.dataset.conf){ delete btn.dataset.conf; btn.textContent=btn.dataset.orig; btn.classList.remove('confirmar'); acao(); return; }
  btn.dataset.orig=btn.textContent; btn.dataset.conf='1'; btn.textContent=txt; btn.classList.add('confirmar');
  setTimeout(()=>{ if(btn.isConnected&&btn.dataset.conf){ delete btn.dataset.conf; btn.textContent=btn.dataset.orig; btn.classList.remove('confirmar'); } },4000);
};

/* ---------- Perguntas ---------- */
X.blankQ = () => ({q:'',a:['','','',''],c:[],t:20,p:'std',img:null,exp:''});
X.normQ = function(o){
  o=o||{}; const aa=X.toArr(o.a); const a=[0,1,2,3].map(i=>String(aa[i]||'').slice(0,75));
  return { q:String(o.q||'').slice(0,120), a,
    c:X.toArr(o.c).map(Number).filter(x=>x>=0&&x<4),
    t:X.TIMES.includes(Number(o.t))?Number(o.t):20,
    p:['std','double','none'].includes(o.p)?o.p:'std',
    img:typeof o.img==='string'&&o.img.startsWith('data:image')?o.img:null,
    exp:String(o.exp||'').slice(0,300) };
};
X.valida = q => !!(q.q.trim() && q.a.filter(x=>x.trim()).length>=2 && q.c.some(i=>q.a[i]&&q.a[i].trim()));
/* Pontuação no estilo Kahoot: até 1000 pontos, mais rápido = mais pontos */
X.pontos = function(rt,T,p){ if(p==='none') return 0; const f=Math.max(0,Math.min(1,rt/T)); return Math.round(1000*(1-f/2))*(p==='double'?2:1); };
X.bonusSeq = seq => seq>1 ? Math.min(100*(seq-1),500) : 0;

/* ---------- Som ---------- */
let ac=null;
X.som = {
  on:true,
  beep(f,d,type,v){ if(!X.som.on) return; try{ ac=ac||new(window.AudioContext||window.webkitAudioContext)(); if(ac.state==='suspended') ac.resume();
    const o=ac.createOscillator(),g=ac.createGain(); o.type=type||'sine'; o.frequency.value=f; g.gain.setValueAtTime(v||.08,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+d);}catch(e){} },
  acerto(){ X.som.beep(660,.15); setTimeout(()=>X.som.beep(880,.25),120); },
  erro(){ X.som.beep(170,.4,'sawtooth',.05); },
  tick(){ X.som.beep(1000,.05,'square',.03); },
  fanfarra(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>X.som.beep(f,i===3?.5:.18),i*150)); },
  entrada(){ X.som.beep(740,.08); }
};

/* =========================================================
   BANCO DE DADOS
   - Com o Firebase configurado: jogo real entre aparelhos.
   - Sem configuração: modo de teste local (abas do mesmo navegador).
   ========================================================= */
function limpo(v){ return v===undefined ? null : JSON.parse(JSON.stringify(v)); }

function criarFirebase(cfg){
  firebase.initializeApp(cfg);
  const db=firebase.database(), auth=firebase.auth();
  let off=0; db.ref('.info/serverTimeOffset').on('value',s=>{off=s.val()||0;});
  return {
    modo:'firebase',
    TS: firebase.database.ServerValue.TIMESTAMP,
    agora: ()=>Date.now()+off,
    uid: ()=>auth.currentUser&&auth.currentUser.uid,
    onAuth: cb=>auth.onAuthStateChanged(u=>cb(u?{uid:u.uid,email:u.email,anon:u.isAnonymous}:null)),
    entrar: (e,s)=>auth.signInWithEmailAndPassword(e,s),
    criarConta: async (e,s,n)=>{
      const cred=await auth.createUserWithEmailAndPassword(e,s);
      if(cred.user && n) await cred.user.updateProfile({displayName:n});
      return cred;
    },
    sair: ()=>auth.signOut(),
    redefinirSenha: e=>auth.sendPasswordResetEmail(e),
    anonimo: async ()=>{
      /* espera o Firebase recuperar a sessão anterior (para o aluno não "virar outra pessoa" ao recarregar) */
      const u=await new Promise(res=>{ const un=auth.onAuthStateChanged(x=>{ un(); res(x); }); });
      if(u) return {uid:u.uid};
      const c=await auth.signInAnonymously(); return {uid:c.user.uid}; },
    get: async p=>(await db.ref(p).get()).val(),
    set: (p,v)=>db.ref(p).set(limpo(v)),
    update: (p,o)=>db.ref(p).update(limpo(o)),
    remove: p=>db.ref(p).remove(),
    on: (p,cb)=>{ const r=db.ref(p),h=s=>cb(s.val());
      r.on('value',h,err=>{ console.error(err); X.toast('O banco recusou a leitura. Confira as regras do Firebase (guia, passo 3).'); });
      return ()=>r.off('value',h); },
    chave: ()=>db.ref().push().key,
    porCampo: async (p,campo,valor)=>(await db.ref(p).orderByChild(campo).equalTo(valor).get()).val()
  };
}

function criarLocal(){
  const K='exq.localdb';
  const ler=()=>{ try{ return JSON.parse(localStorage.getItem(K))||{}; }catch(e){ return {}; } };
  const gravar=t=>{ try{ localStorage.setItem(K,JSON.stringify(t)); }catch(e){ X.toast('Sem espaço neste navegador para o modo de teste.'); } };
  const partes=p=>String(p||'').split('/').filter(Boolean);
  const pegar=(t,p)=>{ let n=t; for(const k of partes(p)){ if(n==null||typeof n!=='object') return null; n=n[k]; } return n===undefined?null:n; };
  const resolver=v=>{ if(v&&typeof v==='object'){ if(v['.sv']==='timestamp') return Date.now(); const o=Array.isArray(v)?[]:{}; for(const k in v){ const r=resolver(v[k]); if(r!==null&&r!==undefined) o[k]=r; } return o; } return v; };
  const colocar=(t,p,v)=>{ const ks=partes(p); if(!ks.length) return v==null?{}:v; let n=t;
    for(let i=0;i<ks.length-1;i++){ if(n[ks[i]]==null||typeof n[ks[i]]!=='object') n[ks[i]]={}; n=n[ks[i]]; }
    if(v==null) delete n[ks[ks.length-1]]; else n[ks[ks.length-1]]=v; return t; };
  const ouvintes=new Set();
  const avisar=()=>{ const t=ler(); ouvintes.forEach(o=>{ const v=pegar(t,o.p); const j=JSON.stringify(v); if(j!==o.ult){ o.ult=j; o.cb(v==null?null:JSON.parse(j)); } }); };
  window.addEventListener('storage',e=>{ if(e.key===K) avisar(); });
  const escrever=fn=>{ const r=fn(ler()); gravar(r); setTimeout(avisar,0); return Promise.resolve(); };
  let usuario=null; const cbs=[];
  try{ if(localStorage.getItem('exq.localprof')) usuario={uid:'prof_local',email:localStorage.getItem('exq.localprof'),anon:false}; }catch(e){}
  const emitir=()=>cbs.forEach(cb=>cb(usuario));
  const uidAba=()=>{ let u=null; try{ u=sessionStorage.getItem('exq.uid'); if(!u){ u='al_'+X.uid(); sessionStorage.setItem('exq.uid',u); } }catch(e){ u='al_'+X.uid(); } return u; };
  return {
    modo:'local',
    TS:{'.sv':'timestamp'},
    agora:()=>Date.now(),
    uid:()=>usuario&&usuario.uid,
    onAuth:cb=>{ cbs.push(cb); setTimeout(()=>cb(usuario),0); },
    entrar:async (e)=>{ usuario={uid:'prof_local',email:e||'professor@teste',anon:false}; try{ localStorage.setItem('exq.localprof',usuario.email); }catch(_){} emitir(); },
    criarConta:async (e,s,n)=>{ usuario={uid:'prof_local',email:e,displayName:n,anon:false}; try{ localStorage.setItem('exq.localprof',usuario.email); }catch(_){} emitir(); },
    sair:async()=>{ usuario=null; try{ localStorage.removeItem('exq.localprof'); }catch(_){} emitir(); },
    redefinirSenha:async()=>{},
    anonimo:async()=>({uid:uidAba()}),
    get:async p=>{ const v=pegar(ler(),p); return v==null?null:JSON.parse(JSON.stringify(v)); },
    set:(p,v)=>escrever(t=>colocar(t,p,resolver(limpo(v)))),
    update:(p,o)=>escrever(t=>{ o=limpo(o); for(const k in o) t=colocar(t,partes(p).concat(partes(k)).join('/'),resolver(o[k])); return t; }),
    remove:p=>escrever(t=>colocar(t,p,null)),
    on:(p,cb)=>{ const o={p,cb,ult:undefined}; ouvintes.add(o); setTimeout(()=>{ if(!ouvintes.has(o)) return; const v=pegar(ler(),p); o.ult=JSON.stringify(v); cb(v==null?null:JSON.parse(o.ult)); },0); return ()=>ouvintes.delete(o); },
    chave:()=>X.uid(),
    porCampo:async(p,campo,valor)=>{ const v=pegar(ler(),p)||{}; const r={}; for(const k in v) if(v[k]&&v[k][campo]===valor) r[k]=v[k]; return r; }
  };
}

const cfg=window.EXATA_FIREBASE||{};
const temFb=!!(cfg.apiKey&&cfg.databaseURL);
if(temFb && !window.firebase){
  X.DB=criarLocal(); X.erroFirebase='Não foi possível carregar o Firebase. Verifique a conexão com a internet e recarregue a página.';
}else{
  X.DB=temFb?criarFirebase(cfg):criarLocal();
}
X.PROF_EMAIL='';

/* Endereço da página dos alunos (mesma pasta) */
X.urlAluno = () => { const u=new URL('index.html',location.href); return u.href; };
})();
