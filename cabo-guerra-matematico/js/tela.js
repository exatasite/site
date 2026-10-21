(function(){
 const $=id=>document.getElementById(id),pin=new URLSearchParams(location.search).get("pin");let roomRef=null,timerInt=null;
 if(!pin){$("screen-question").textContent="Abra esta tela pelo link gerado no painel do professor.";return;}
 $("screen-pin").textContent="PIN "+pin;$("pin-bottom").textContent=pin;
 signInAnonymous().then(()=>{roomRef=db.ref("cabos/"+pin);roomRef.on("value",s=>render(s.val()));}).catch(console.error);
 function render(r){if(!r)return;const players=Object.values(r.jogadores||{}),blue=players.filter(p=>p.equipe==="azul"),red=players.filter(p=>p.equipe==="vermelha");
  $("count-blue").textContent=blue.length+" participantes";$("count-red").textContent=red.length+" participantes";
  $("blue-players").innerHTML=blue.map(p=>avatar(p,"blue")).join("");$("red-players").innerHTML=red.map(p=>avatar(p,"red")).join("");
  $("score-blue").textContent=r.pontos?.azul||0;$("score-red").textContent=r.pontos?.vermelha||0;
  $("correct-blue").textContent=r.pontos?.azul||0;$("correct-red").textContent=r.pontos?.vermelha||0;
  const f=Math.max(-10,Math.min(10,Number(r.forca)||0));$("marker").style.left=(50+f*4)+"%";$("knot").style.left=(50+f*4)+"%";
  if(r.estado==="lobby"){$("round").textContent="AGUARDANDO O INÍCIO";$("screen-question").textContent=r.titulo||"Cabo de Guerra Matemático";$("screen-options").innerHTML="";$("screen-status").textContent="Acesse o jogo pelo PIN "+pin+" e escolha uma equipe.";$("timer").textContent="—";}
  else if(r.estado==="pergunta"&&r.atual){$("round").textContent=`PERGUNTA ${r.indice+1} DE ${r.perguntas.length}`;$("screen-question").textContent=r.atual.texto;$("screen-options").innerHTML=r.atual.opcoes.map((o,i)=>`<div class="screen-option option-${i}"><b>${"ABCD"[i]}</b>${escapeHtml(o)}</div>`).join("");$("screen-status").textContent="Responda no seu dispositivo!";startTimer(r);}
  else if(r.estado==="resultado"){$("round").textContent="RESULTADO DA RODADA";$("timer").textContent="✓";$("screen-status").textContent=r.ultimaRodada?`Azul: ${r.ultimaRodada.azul.correct} acertos · Vermelha: ${r.ultimaRodada.vermelha.correct} acertos`:"Rodada concluída";$("screen-options").innerHTML="";}
  else if(r.estado==="fim"){$("round").textContent="FIM DE JOGO";$("timer").textContent="🏁";$("screen-question").textContent=(Number(r.forca)||0)>0?"VITÓRIA DA EQUIPE AZUL!":(Number(r.forca)||0)<0?"VITÓRIA DA EQUIPE VERMELHA!":"EMPATE!";$("screen-options").innerHTML="";$("screen-status").textContent="Obrigado por participar!";$("finish-message").hidden=false;$("finish-message").textContent=$("screen-question").textContent;}
 }
 function avatar(p,side){return `<div class="player ${side}"><div class="avatar">${escapeHtml(p.avatar||"🧑‍🎓")}</div><div class="player-name">${escapeHtml(p.nome||"Aluno")}</div></div>`;}
 function startTimer(r){clearInterval(timerInt);const end=(Number(r.perguntaInicio)||Date.now())+(Number(r.segundos)||20)*1000;const tick=()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));$("timer").textContent=left+"s";if(left===0)clearInterval(timerInt);};tick();timerInt=setInterval(tick,250);}
})();