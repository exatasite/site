(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 let user=null,questions=[],pin=null,roomRef=null,selectedQuiz=null,quizCatalog=[],timerHandle=null,scoring=false;
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
 $('start-game').onclick=async()=>{if(!roomRef||!questions.length)return;await launchQuestion(0);};
 $('next-question').onclick=async()=>{if(!roomRef)return;const snap=await roomRef.once('value'),r=snap.val();if(r.indice+1<r.perguntas.length)await launchQuestion(r.indice+1);else await finishGame();};
 async function launchQuestion(i){
  if(timerHandle)clearTimeout(timerHandle);scoring=false;
  const q=questions[i];await roomRef.update({indice:i,indiceTexto:String(i),estado:'pergunta',atual:q,perguntaInicio:Date.now(),respostas:null});
  $('next-question').disabled=true;show('control-msg','Pergunta '+(i+1)+' iniciada.');
  timerHandle=setTimeout(async()=>{if(scoring)return;scoring=true;const snap=await roomRef.once('value'),r=snap.val();if(r&&r.estado==='pergunta'&&r.indice===i)await scoreRound(r,i);},Number($('seconds').value)*1000);
 }
 async function scoreRound(r,i){
  if(!r || r.estado!=='pergunta' || r.indice!==i) return;
  scoring=true;
  if(timerHandle){clearTimeout(timerHandle);timerHandle=null;}
  const players=r.jogadores||{},answers=(r.respostas&&r.respostas[i])||{},teams={azul:{n:0,correct:0},vermelha:{n:0,correct:0}};
  Object.values(players).forEach(p=>{if(teams[p.equipe])teams[p.equipe].n++;});
  Object.entries(answers).forEach(([id,a])=>{if(teams[a.equipe]&&Number(a.opcao)===Number(r.perguntas[i].correta))teams[a.equipe].correct++;});
  const mode=r.modoForca||'percentual';let delta=0;
  if(mode==='acertos')delta=teams.azul.correct-teams.vermelha.correct;
  else{const pa=teams.azul.n?teams.azul.correct/teams.azul.n:0,pv=teams.vermelha.n?teams.vermelha.correct/teams.vermelha.n:0;delta=Math.round((pa-pv)*3);}
  const old=Number(r.forca)||0,force=Math.max(-10,Math.min(10,old+delta));
  await roomRef.update({estado:'resultado',forca:force,pontos:{azul:teams.azul.correct,vermelha:teams.vermelha.correct},ultimaRodada:{indice:i,azul:teams.azul,vermelha:teams.vermelha,delta}});
  $('next-question').disabled=false;$('next-question').textContent=i+1>=questions.length?'Encerrar / ver resultado':'Próxima pergunta';
  show('control-msg','Rodada '+(i+1)+': azul '+teams.azul.correct+' acertos; vermelha '+teams.vermelha.correct+' acertos.');
 }
 $('end-game').onclick=finishGame;
 async function finishGame(){if(!roomRef)return;if(timerHandle)clearTimeout(timerHandle);await roomRef.update({estado:'fim',encerrado:firebase.database.ServerValue.TIMESTAMP});$('next-question').disabled=true;$('start-game').disabled=true;$('end-game').disabled=true;show('control-msg','Partida encerrada.');}
 function updateHost(r){
  if(!r)return;
  const entries=Object.entries(r.jogadores||{}),players=entries.map(([,p])=>p),blue=players.filter(p=>p.equipe==='azul').length,red=players.filter(p=>p.equipe==='vermelha').length;
  $('control-msg').textContent='Participantes: '+players.length+' · Azul: '+blue+' · Vermelha: '+red+'. Estado: '+r.estado+'.';
  $('results').innerHTML=r.ultimaRodada?'<p><b>Última rodada:</b> Azul '+r.ultimaRodada.azul.correct+'/'+r.ultimaRodada.azul.n+' · Vermelha '+r.ultimaRodada.vermelha.correct+'/'+r.ultimaRodada.vermelha.n+'</p>':'';
  // Quando todos os participantes que escolheram equipe respondem, calcula a rodada imediatamente.
  // Se alguém não responder, o cronômetro continua sendo o limite da rodada.
  if(r.estado==='pergunta' && Number.isInteger(r.indice) && !scoring){
   const active=entries.filter(([,p])=>p.equipe==='azul'||p.equipe==='vermelha');
   const answers=(r.respostas&&r.respostas[r.indice])||{};
   if(active.length>0 && active.every(([uid])=>Object.prototype.hasOwnProperty.call(answers,uid))){
    scoring=true;
    if(timerHandle){clearTimeout(timerHandle);timerHandle=null;}
    scoreRound(r,r.indice).catch(err=>{console.error(err);scoring=false;show('control-msg','Erro ao calcular a rodada. Confira as regras do Firebase.',true);});
   }
  }
 }
})();
