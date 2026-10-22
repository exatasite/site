(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 let user=null,questions=[],pin=null,roomRef=null,selectedQuiz=null,quizCatalog=[],timerHandle=null,advanceHandle=null,scoredIndex=null;
 const esc=window.escapeHtml;
 const db=window.db,auth=window.auth;
 const show=(id,msg,error=false)=>window.showMessage($(id),msg,error);

 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();show('login-msg','Entrando...');
  try{await auth.signInWithEmailAndPassword($('email').value.trim(),$('password').value);}
  catch(err){console.error(err);show('login-msg','Não foi possível entrar. Confira e-mail e senha.',true);}
 });
 auth.onAuthStateChanged(async u=>{
  if(u&&!u.isAnonymous){user=u;$('login-panel').hidden=true;$('dashboard').hidden=false;await loadQuizCatalog();}
  else{user=null;$('login-panel').hidden=false;$('dashboard').hidden=true;}
 });
 $('logout').onclick=()=>auth.signOut();

 async function loadQuizCatalog(){
  const sel=$('quiz-select');sel.innerHTML='<option value="">Carregando quizzes...</option>';
  try{
   const [mineSnap,libSnap]=await Promise.all([
    db.ref('professores/'+user.uid+'/quizzes').once('value'),
    db.ref('biblioteca').once('value')
   ]);
   const mine=mineSnap.val()||{},lib=libSnap.val()||{};quizCatalog=[];
   Object.entries(mine).forEach(([id,q])=>quizCatalog.push({key:'meus:'+id,origem:'meus',id,titulo:q.titulo||'Quiz sem título',perguntas:q.perguntas||[]}));
   Object.entries(lib).forEach(([id,q])=>quizCatalog.push({key:'biblioteca:'+id,origem:'biblioteca',id,titulo:q.titulo||'Quiz sem título',perguntas:q.perguntas||[]}));
   sel.innerHTML='<option value="">Selecione um quiz...</option>';
   const mineList=quizCatalog.filter(q=>q.origem==='meus'),libList=quizCatalog.filter(q=>q.origem==='biblioteca');
   if(mineList.length){const g=document.createElement('optgroup');g.label='Meus quizzes';mineList.forEach(q=>g.append(new Option(q.titulo+' ('+countUsable(q.perguntas)+' perguntas utilizáveis)',q.key)));sel.append(g);}
   if(libList.length){const g=document.createElement('optgroup');g.label='Biblioteca compartilhada';libList.forEach(q=>g.append(new Option(q.titulo+' ('+countUsable(q.perguntas)+' perguntas utilizáveis)',q.key)));sel.append(g);}
   if(!quizCatalog.length)sel.innerHTML='<option value="">Nenhum quiz encontrado nesta conta</option>';
   show('q-msg',quizCatalog.length?'Selecione um quiz e clique em “Carregar quiz selecionado”.':'Não há quizzes particulares nem quizzes na biblioteca.');
  }catch(err){console.error(err);sel.innerHTML='<option value="">Não foi possível carregar os quizzes</option>';show('q-msg','Erro ao ler os quizzes. Confira as regras do Firebase para professores e biblioteca.',true);}
 }
 function normalizeQuizQuestion(q){
  if(!q||typeof q!=='object')return null;
  const text=String(q.q||q.pergunta||q.texto||'').trim();
  const raw=Array.isArray(q.a)?q.a:(Array.isArray(q.opcoes)?q.opcoes:[]);
  const correctRaw=Array.isArray(q.c)?q.c:(Number.isInteger(q.correta)?[q.correta]:[]);
  const opts=[];let mappedCorrect=[];
  raw.forEach((v,originalIndex)=>{const txt=String(v==null?'':v).trim();if(txt){const newIndex=opts.length;opts.push(txt);if(correctRaw.some(c=>Number(c)===originalIndex||Number(c)===originalIndex+1&&q.c1based===true))mappedCorrect.push(newIndex);}});
  if(!text||opts.length<2||!mappedCorrect.length)return null;
  // Cabo de Guerra é de resposta única; questões com várias alternativas corretas são excluídas.
  if(mappedCorrect.length!==1)return null;
  return {texto:text,opcoes:opts,correta:mappedCorrect[0],explicacao:String(q.exp||q.resolucao||''),imagem:q.img||null};
 }
 function countUsable(raw){const a=Array.isArray(raw)?raw:Object.values(raw||{});return a.map(normalizeQuizQuestion).filter(Boolean).length;}
 $('load-quiz').onclick=()=>{
  if(pin){show('q-msg','A seleção do quiz fica bloqueada depois que a sala é criada.',true);return;}
  const item=quizCatalog.find(q=>q.key===$('quiz-select').value);
  if(!item){show('q-msg','Selecione um quiz.',true);return;}
  const raw=Array.isArray(item.perguntas)?item.perguntas:Object.values(item.perguntas||{});
  const valid=raw.map(normalizeQuizQuestion).filter(Boolean);
  const total=raw.length,skipped=total-valid.length;
  if(!valid.length){questions=[];selectedQuiz=null;renderQuestions();show('q-msg','Este quiz não possui perguntas de resposta única utilizáveis no Cabo de Guerra. Confira se há enunciados, alternativas e uma única resposta correta.',true);return;}
  selectedQuiz={id:item.id,titulo:item.titulo,origem:item.origem};questions=valid;
  $('game-title').value=item.titulo;
  $('selected-quiz-info').hidden=false;
  $('selected-quiz-info').innerHTML='<b>'+esc(item.titulo)+'</b><p>'+valid.length+' pergunta(s) carregada(s)'+(skipped?' · '+skipped+' pergunta(s) ignorada(s) por estarem incompletas ou terem mais de uma resposta correta':'')+'</p><small>Origem: '+(item.origem==='meus'?'Meus quizzes':'Biblioteca compartilhada')+'. O quiz original não será modificado.</small>';
  renderQuestions();show('q-msg','Quiz carregado. Agora você pode criar a partida.');
 };
 function renderQuestions(){
  $('question-list').innerHTML=questions.map((q,i)=>'<div class="q-item"><div><b>'+String(i+1)+'. '+esc(q.texto)+'</b><small>'+q.opcoes.map((o,j)=>String.fromCharCode(65+j)+': '+esc(o)).join(' · ')+'</small></div></div>').join('');
  $('create-room').disabled=!!pin||!questions.length;
  $('start-game').disabled=!pin||!questions.length;
 }
 $('create-room').onclick=async()=>{
  if(!user)return;if(!selectedQuiz||!questions.length){show('room-msg','Primeiro selecione e carregue um quiz do Exata Quiz.',true);return;}
  show('room-msg','Criando sala...');
  try{
   let found=false;
   for(let i=0;i<12;i++){const candidate=newPin(),snap=await db.ref('cabos/'+candidate).once('value');if(!snap.exists()){pin=candidate;found=true;break;}}
   if(!found)throw new Error('Não foi possível gerar um PIN livre.');
   roomRef=db.ref('cabos/'+pin);
   await roomRef.set({dono:user.uid,titulo:$('game-title').value.trim()||selectedQuiz.titulo,origemQuiz:{id:selectedQuiz.id,titulo:selectedQuiz.titulo,tipo:selectedQuiz.origem},estado:'lobby',criado:firebase.database.ServerValue.TIMESTAMP,segundos:Number($('seconds').value),modoForca:$('force-mode').value,indice:-1,perguntas:questions,forca:0,pontos:{azul:0,vermelha:0}});
   $('room-pin').textContent=pin;$('room-info').hidden=false;$('open-screen').href='tela.html?pin='+pin;
   const joinUrl=new URL('index.html?pin='+encodeURIComponent(pin),window.location.href).href;
   $('join-link').href=joinUrl;$('join-link').textContent=joinUrl;
   $('join-qr').innerHTML='';
   if(window.QRCode){new QRCode($('join-qr'),{text:joinUrl,width:150,height:150,colorDark:'#082f49',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}
   else $('join-qr').textContent='QR Code indisponível; use o link ao lado.';
   $('create-room').disabled=true;$('start-game').disabled=false;$('end-game').disabled=false;
   show('room-msg','Sala criada. Compartilhe o PIN com os alunos.');show('control-msg','Sala aberta. Aguardando participantes.');
   roomRef.on('value',snap=>updateHost(snap.val()));
  }catch(e){console.error(e);show('room-msg','Falha ao criar sala. Confira as regras do Firebase.',true);pin=null;roomRef=null;renderQuestions();}
 };
 $('copy-pin').onclick=async()=>{try{await navigator.clipboard.writeText(pin);show('room-msg','PIN copiado.');}catch(e){show('room-msg','PIN: '+pin);}};
 $('start-game').onclick=async()=>{if(!roomRef||!questions.length)return;$('start-game').disabled=true;await launchQuestion(0);};
 // Botão do professor: durante a pergunta encerra a rodada na hora; no resultado passa para a próxima.
 $('next-question').onclick=async()=>{
  if(!roomRef)return;
  const r=(await roomRef.once('value')).val();if(!r)return;
  if(r.estado==='pergunta')await scoreRound(r,r.indice);
  else if(r.estado==='resultado')await goNext();
 };
 function autoDelay(){const v=Number(($('auto-next')||{}).value);return Number.isFinite(v)?v:5;}
 function clearTimers(){if(timerHandle){clearTimeout(timerHandle);timerHandle=null;}if(advanceHandle){clearTimeout(advanceHandle);advanceHandle=null;}}
 async function goNext(){
  clearTimers();
  const r=(await roomRef.once('value')).val();if(!r||r.estado==='fim')return;
  const total=(r.perguntas&&r.perguntas.length)||questions.length;
  if(r.indice+1<total)await launchQuestion(r.indice+1);else await finishGame();
 }
 async function launchQuestion(i){
  clearTimers();scoredIndex=null;
  const q=questions[i];
  await roomRef.update({indice:i,indiceTexto:String(i),estado:'pergunta',atual:q,perguntaInicio:Date.now(),respostas:null,proximaEm:null});
  $('next-question').disabled=false;$('next-question').textContent='Encerrar esta rodada agora';
  show('control-msg','Pergunta '+(i+1)+' de '+questions.length+' iniciada.');
  timerHandle=setTimeout(async()=>{const r=(await roomRef.once('value')).val();await scoreRound(r,i);},Number($('seconds').value)*1000+500);
 }
 async function scoreRound(r,i){
  if(!r||r.estado!=='pergunta'||r.indice!==i||scoredIndex===i)return;
  scoredIndex=i;clearTimers();
  try{
   const players=r.jogadores||{},answers=(r.respostas&&r.respostas[i])||{},teams={azul:{n:0,correct:0},vermelha:{n:0,correct:0}};
   Object.values(players).forEach(p=>{if(p&&teams[p.equipe])teams[p.equipe].n++;});
   Object.values(answers).forEach(a=>{if(a&&teams[a.equipe]&&Number(a.opcao)===Number(r.perguntas[i].correta))teams[a.equipe].correct++;});
   const mode=r.modoForca||'percentual';let delta=0;
   if(mode==='acertos')delta=teams.azul.correct-teams.vermelha.correct;
   else{const pa=teams.azul.n?teams.azul.correct/teams.azul.n:0,pv=teams.vermelha.n?teams.vermelha.correct/teams.vermelha.n:0;delta=Math.round((pa-pv)*3);}
   const old=Number(r.forca)||0,force=Math.max(-10,Math.min(10,old+delta));
   const prev=r.pontos||{},pontos={azul:(Number(prev.azul)||0)+teams.azul.correct,vermelha:(Number(prev.vermelha)||0)+teams.vermelha.correct};
   const ultima=i+1>=((r.perguntas&&r.perguntas.length)||questions.length);
   const delay=autoDelay();
   await roomRef.update({estado:'resultado',forca:force,pontos,ultimaRodada:{indice:i,azul:teams.azul,vermelha:teams.vermelha,delta},proximaEm:delay>0?Date.now()+delay*1000:null});
   $('next-question').disabled=false;$('next-question').textContent=ultima?'Encerrar / ver resultado':'Próxima pergunta';
   show('control-msg','Rodada '+(i+1)+': azul '+teams.azul.correct+' acertos; vermelha '+teams.vermelha.correct+' acertos.'+(delay>0?' Avançando em '+delay+' s...':''));
   if(delay>0)advanceHandle=setTimeout(()=>goNext().catch(console.error),delay*1000);
  }catch(err){console.error(err);scoredIndex=null;show('control-msg','Erro ao calcular a rodada: '+(err.message||err),true);}
 }
 $('end-game').onclick=finishGame;
 async function finishGame(){if(!roomRef)return;clearTimers();await roomRef.update({estado:'fim',proximaEm:null,encerrado:firebase.database.ServerValue.TIMESTAMP});$('next-question').disabled=true;$('start-game').disabled=true;$('end-game').disabled=true;show('control-msg','Partida encerrada.');}
 function updateHost(r){
  if(!r)return;
  const entries=Object.entries(r.jogadores||{}).filter(([,p])=>p),players=entries.map(([,p])=>p),blue=players.filter(p=>p.equipe==='azul').length,red=players.filter(p=>p.equipe==='vermelha').length;
  const answers=(r.estado==='pergunta'&&r.respostas&&r.respostas[r.indice])||{};
  const nAns=Object.keys(answers).length;
  $('results').innerHTML='<p>Participantes: <b>'+players.length+'</b> · Azul: <b>'+blue+'</b> · Vermelha: <b>'+red+'</b>'+(r.estado==='pergunta'?' · Responderam: <b>'+nAns+'</b>':'')+'</p>'+(r.ultimaRodada?'<p><b>Última rodada:</b> Azul '+r.ultimaRodada.azul.correct+'/'+r.ultimaRodada.azul.n+' · Vermelha '+r.ultimaRodada.vermelha.correct+'/'+r.ultimaRodada.vermelha.n+'</p>':'');
  // Todos que escolheram equipe responderam? Fecha a rodada na hora (sem esperar o cronômetro).
  if(r.estado==='pergunta'&&Number.isInteger(r.indice)&&scoredIndex!==r.indice){
   const active=entries.filter(([,p])=>p.equipe==='azul'||p.equipe==='vermelha');
   if(active.length>0&&active.every(([uid])=>Object.prototype.hasOwnProperty.call(answers,uid)))scoreRound(r,r.indice);
  }
 }
})();
