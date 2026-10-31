/* Motor da partida: fecha a rodada (tempo esgotado ou todos responderam) e avança para a próxima pergunta.
   Roda no painel do professor E na tela projetada (quando ela está aberta com a conta do professor).
   As mudanças usam transação do Firebase, então mesmo com as duas abas abertas nada é contado duas vezes. */
(function(){
 window.CaboMotor=function(roomRef){
  let timer=null,ultimo=null;
  const souDono=r=>!!(r&&auth.currentUser&&auth.currentUser.uid===r.dono);
  function todosResponderam(r){
   const ativos=Object.entries(r.jogadores||{}).filter(([,p])=>p&&(p.equipe==='azul'||p.equipe==='vermelha'));
   const ans=(r.respostas&&r.respostas[r.indice])||{};
   return ativos.length>0&&ativos.every(([uid])=>ans[uid]);
  }
  function agendar(r){
   ultimo=r;clearTimeout(timer);timer=null;
   if(!souDono(r))return;
   if(r.estado==='pergunta'){
    const fim=(Number(r.perguntaInicio)||Date.now())+(Number(r.segundos)||20)*1000+500;
    const espera=todosResponderam(r)?0:Math.max(0,fim-Date.now());
    timer=setTimeout(()=>fecharRodada(r.indice).catch(console.error),espera);
   }else if(r.estado==='resultado'&&r.proximaEm){
    timer=setTimeout(()=>avancar(r.indice).catch(console.error),Math.max(0,Number(r.proximaEm)-Date.now()));
   }
  }
  // Rede de segurança: a cada 2 s confere se algo ficou para trás (ex.: aba em segundo plano).
  setInterval(()=>{if(!ultimo||!souDono(ultimo))return;
   if(ultimo.estado==='pergunta'&&(todosResponderam(ultimo)||Date.now()>(Number(ultimo.perguntaInicio)||0)+(Number(ultimo.segundos)||20)*1000+1500))fecharRodada(ultimo.indice).catch(console.error);
   else if(ultimo.estado==='resultado'&&ultimo.proximaEm&&Date.now()>Number(ultimo.proximaEm)+1000)avancar(ultimo.indice).catch(console.error);
  },2000);
  async function fecharRodada(i){
   return roomRef.transaction(r=>{
    if(r===null)return null;
    if(r.estado!=='pergunta'||r.indice!==i)return; // já fechada por outra aba: não faz nada
    const players=r.jogadores||{},answers=(r.respostas&&r.respostas[i])||{},teams={azul:{n:0,correct:0},vermelha:{n:0,correct:0}};
    Object.values(players).forEach(p=>{if(p&&teams[p.equipe])teams[p.equipe].n++;});
    const certa=Number(r.perguntas[i].correta);
    Object.values(answers).forEach(a=>{if(a&&teams[a.equipe]&&Number(a.opcao)===certa)teams[a.equipe].correct++;});
    let delta=0;
    if((r.modoForca||'percentual')==='acertos')delta=teams.azul.correct-teams.vermelha.correct;
    else{const pa=teams.azul.n?teams.azul.correct/teams.azul.n:0,pv=teams.vermelha.n?teams.vermelha.correct/teams.vermelha.n:0;delta=Math.round((pa-pv)*3);}
    r.forca=Math.max(-10,Math.min(10,(Number(r.forca)||0)+delta));
    const pts=r.pontos||{};r.pontos={azul:(Number(pts.azul)||0)+teams.azul.correct,vermelha:(Number(pts.vermelha)||0)+teams.vermelha.correct};
    r.ultimaRodada={indice:i,azul:teams.azul,vermelha:teams.vermelha,delta};
    r.estado='resultado';
    const auto=Number(r.autoAvanco);
    if(auto>0)r.proximaEm=Date.now()+auto*1000;else delete r.proximaEm;
    return r;
   });
  }
  async function avancar(i){
   return roomRef.transaction(r=>{
    if(r===null)return null;
    if(r.estado!=='resultado'||r.indice!==i)return;
    const total=(r.perguntas&&r.perguntas.length)||0;
    delete r.proximaEm;
    if(i+1<total){
     r.indice=i+1;r.indiceTexto=String(i+1);r.estado='pergunta';r.atual=r.perguntas[i+1];r.perguntaInicio=Date.now();delete r.respostas;
    }else{r.estado='fim';r.encerrado=Date.now();}
    return r;
   });
  }
  return {agendar,fecharRodada,avancar};
 };
})();
