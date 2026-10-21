(function(){
 const $=id=>document.getElementById(id);let user=null,questions=[],pin=null,roomRef=null;
 $("login-form").addEventListener("submit",async e=>{e.preventDefault();showMessage($("login-msg"),"Entrando...");try{await auth.signInWithEmailAndPassword($("email").value.trim(),$("password").value); }catch(err){showMessage($("login-msg"),"Não foi possível entrar. Confira e-mail e senha.",true);}});
 auth.onAuthStateChanged(u=>{if(u&&!u.isAnonymous){user=u;$("login-panel").hidden=true;$("dashboard").hidden=false;}else{$("login-panel").hidden=false;$("dashboard").hidden=true;}});
 $("logout").onclick=()=>auth.signOut();
 $("question-form").addEventListener("submit",e=>{e.preventDefault();if(pin){showMessage($("q-msg"),"A lista de perguntas fica bloqueada depois que a sala é criada.");return;}
 questions.push({texto:$("q-text").value.trim(),opcoes:[$("opt-a").value.trim(),$("opt-b").value.trim(),$("opt-c").value.trim(),$("opt-d").value.trim()],correta:Number($("correct").value)});
 $("question-form").reset();$("correct").value="0";renderQuestions();showMessage($("q-msg"),"Pergunta adicionada.");});
 function renderQuestions(){$("question-list").innerHTML=questions.map((q,i)=>`<div class="q-item"><div><b>${i+1}. ${escapeHtml(q.texto)}</b><small>${q.opcoes.map((o,j)=>`${String.fromCharCode(65+j)}: ${escapeHtml(o)}`).join(" · ")}</small></div><button class="remove-q" data-remove="${i}" aria-label="Remover pergunta">×</button></div>`).join("");$("question-list").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{questions.splice(Number(b.dataset.remove),1);renderQuestions();});$("start-game").disabled=!pin||!questions.length;}
 $("create-room").onclick=async()=>{
  if(!user)return;if(!questions.length){showMessage($("room-msg"),"Adicione pelo menos uma pergunta antes de criar a sala.",true);return;}
  showMessage($("room-msg"),"Criando sala...");
  try{
   let found=false;
   for(let i=0;i<8;i++){const candidate=newPin(),snap=await db.ref("cabos/"+candidate).once("value");if(!snap.exists()){pin=candidate;found=true;break;}}
   if(!found)throw new Error("PIN");
   roomRef=db.ref("cabos/"+pin);
   await roomRef.set({dono:user.uid,titulo:$("game-title").value.trim()||"Desafio Matemático",estado:"lobby",criado:firebase.database.ServerValue.TIMESTAMP,segundos:Number($("seconds").value),modoForca:$("force-mode").value,indice:-1,perguntas:questions,forca:0,pontos:{azul:0,vermelha:0}});
   $("room-pin").textContent=pin;$("room-info").hidden=false;$("open-screen").href="tela.html?pin="+pin;$("screen-pin")?.textContent;
   $("create-room").disabled=true;$("start-game").disabled=false;$("end-game").disabled=false;
   $("room-msg").textContent="Sala criada. Compartilhe o PIN com os alunos.";
   $("control-msg").textContent="Sala aberta. Aguardando participantes.";
   roomRef.on("value",snap=>updateHost(snap.val()));
  }catch(e){console.error(e);showMessage($("room-msg"),"Falha ao criar sala. Confira as regras do Firebase.",true);}
 };
 $("copy-pin").onclick=async()=>{try{await navigator.clipboard.writeText(pin);showMessage($("room-msg"),"PIN copiado.");}catch(e){showMessage($("room-msg"),"PIN: "+pin);}};
 $("start-game").onclick=async()=>{if(!roomRef||!questions.length)return;await launchQuestion(0);};
 $("next-question").onclick=async()=>{if(!roomRef)return;const snap=await roomRef.once("value"),r=snap.val();if(r.indice+1<r.perguntas.length)await launchQuestion(r.indice+1);else await finishGame();};
 async function launchQuestion(i){
  const q=questions[i];const updates={indice:i,estado:"pergunta",atual:q,perguntaInicio:Date.now(),respostas:null};
  await roomRef.update(updates);$("next-question").disabled=true;showMessage($("control-msg"),"Pergunta "+(i+1)+" iniciada.");
  setTimeout(async()=>{const snap=await roomRef.once("value"),r=snap.val();if(r&&r.estado==="pergunta"&&r.indice===i){await scoreRound(r,i);$("next-question").disabled=i+1>=questions.length;$("next-question").textContent=i+1>=questions.length?"Encerrar / ver resultado":"Próxima pergunta";}},Number($("seconds").value)*1000);
 }
 async function scoreRound(r,i){
  const players=r.jogadores||{},answers=(r.respostas&&r.respostas[i])||{},teams={azul:{n:0,correct:0},vermelha:{n:0,correct:0}};
  Object.keys(players).forEach(id=>{const t=players[id].equipe;if(teams[t])teams[t].n++;});
  Object.entries(answers).forEach(([id,a])=>{if(teams[a.equipe]){if(Number(a.opcao)===Number(r.perguntas[i].correta))teams[a.equipe].correct++;}});
  const mode=r.modoForca||"percentual";
  let delta=0;
  if(mode==="acertos")delta=teams.azul.correct-teams.vermelha.correct;
  else {const pa=teams.azul.n?teams.azul.correct/teams.azul.n:0,pv=teams.vermelha.n?teams.vermelha.correct/teams.vermelha.n:0;delta=Math.round((pa-pv)*3);}
  const old=Number(r.forca)||0, force=Math.max(-10,Math.min(10,old+delta));
  await roomRef.update({estado:"resultado",forca:force,pontos:{azul:teams.azul.correct,vermelha:teams.vermelha.correct},ultimaRodada:{indice:i,azul:teams.azul,vermelha:teams.vermelha,delta}});
  $("next-question").disabled=false;$("next-question").textContent=i+1>=questions.length?"Encerrar / ver resultado":"Próxima pergunta";
  showMessage($("control-msg"),`Rodada ${i+1}: azul ${teams.azul.correct} acertos; vermelha ${teams.vermelha.correct} acertos.`);
 }
 $("end-game").onclick=finishGame;
 async function finishGame(){if(!roomRef)return;await roomRef.update({estado:"fim",encerrado:firebase.database.ServerValue.TIMESTAMP});$("next-question").disabled=true;$("start-game").disabled=true;$("end-game").disabled=true;showMessage($("control-msg"),"Partida encerrada.");}
 function updateHost(r){if(!r)return;const players=Object.values(r.jogadores||{});const blue=players.filter(p=>p.equipe==="azul").length,red=players.filter(p=>p.equipe==="vermelha").length;$("control-msg").textContent=`Participantes: ${players.length} · Azul: ${blue} · Vermelha: ${red}. Estado: ${r.estado}.`;$("results").innerHTML=r.ultimaRodada?`<p><b>Última rodada:</b> Azul ${r.ultimaRodada.azul.correct}/${r.ultimaRodada.azul.n} · Vermelha ${r.ultimaRodada.vermelha.correct}/${r.ultimaRodada.vermelha.n}</p>`:"";}
})();