(function(){
 const $=id=>document.getElementById(id); let pin="",pid="",team="",roomRef=null,playerRef=null,answeredKey=null;
 const params=new URLSearchParams(location.search);
 if(params.get("pin")) $("pin").value=params.get("pin");
 $("join-form").addEventListener("submit",async e=>{
  e.preventDefault(); pin=$("pin").value.trim(); const name=$("name").value.trim(),avatar=$("avatar").value;
  showMessage($("msg"),"Conectando à partida...");
  try{
   await signInAnonymous(); roomRef=db.ref("cabos/"+pin);
   const snap=await roomRef.once("value"), room=snap.val();
   if(!room){showMessage($("msg"),"PIN não encontrado. Confira o código com o professor.",true);return;}
   if(room.estado==="fim"){showMessage($("msg"),"Esta partida já foi encerrada.",true);return;}
   pid=auth.currentUser.uid; playerRef=roomRef.child("jogadores/"+pid);
   await playerRef.set({nome:name,avatar,entrou:firebase.database.ServerValue.TIMESTAMP});
   $("join-form").closest(".panel").hidden=true; $("team-panel").hidden=false; $("welcome").textContent="Olá, "+name+"!";
   roomRef.on("value",snap=>renderRoom(snap.val()));
  }catch(err){showMessage($("msg"),"Não foi possível entrar. Verifique a configuração do Firebase e tente novamente.",true);console.error(err);}
 });
 document.querySelectorAll("[data-team]").forEach(btn=>btn.addEventListener("click",async()=>{
  if(!playerRef)return; team=btn.dataset.team;
  try{await playerRef.update({equipe:team});$("waiting").hidden=false;$("waiting").textContent="Você está na equipe "+(team==="azul"?"AZUL":"VERMELHA")+". Aguarde o professor iniciar a disputa.";$("team-msg").textContent="Equipe escolhida. Você pode trocar enquanto a partida não começar.";}catch(e){console.error(e);showMessage($("team-msg"),"Não foi possível escolher a equipe.",true);}
 }));
 function renderRoom(room){
  if(!room)return;
  const p=room.jogadores&&room.jogadores[pid];
  if(room.estado==="fim"){$("waiting").hidden=false;$("waiting").textContent="Partida encerrada. Confira o resultado na tela projetada.";return;}
  if(room.estado==="pergunta" && room.atual){
   $("answer-area").hidden=false;$("waiting").hidden=true;
   $("q-count").textContent="PERGUNTA "+(room.indice+1)+" DE "+room.perguntas.length;
   $("question").textContent=room.atual.texto;
   const already=room.respostas&&room.respostas[room.indice]&&room.respostas[room.indice][pid];
   $("answers").innerHTML=room.atual.opcoes.map((op,i)=>`<button class="answer-btn" data-i="${i}" ${already?"disabled":""}>${String.fromCharCode(65+i)} · ${escapeHtml(op)}</button>`).join("");
   if(already){$("answer-msg").textContent="Resposta registrada. Aguarde a próxima rodada.";answeredKey=room.indice;}
   $("answers").querySelectorAll("button").forEach(b=>b.addEventListener("click",async()=>{
    if(!p?.equipe){showMessage($("answer-msg"),"Escolha uma equipe antes de responder.",true);return;}
    try{await roomRef.child("respostas/"+room.indice+"/"+pid).set({opcao:Number(b.dataset.i),equipe:p.equipe,tempo:firebase.database.ServerValue.TIMESTAMP});$("answers").querySelectorAll("button").forEach(x=>x.disabled=true);showMessage($("answer-msg"),"Resposta registrada. Aguarde!");}catch(e){console.error(e);showMessage($("answer-msg"),"Não foi possível registrar a resposta.",true);}
   }));
  }else if(room.estado==="resultado"){$("answer-area").hidden=true;$("waiting").hidden=false;$("waiting").textContent="Rodada encerrada! Olhe o resultado na tela projetada e aguarde a próxima pergunta.";$("answer-msg").textContent="";
  }else if(room.estado==="lobby"){$("answer-area").hidden=true;$("waiting").hidden=false;$("waiting").textContent=p?.equipe?"Você está na equipe "+p.equipe.toUpperCase()+". Aguarde o início.":"Escolha uma equipe para entrar na disputa.";}
 }
})();