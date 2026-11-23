/* Modelos de questões com dados variáveis (autorais) – Exata Provas
   Cada modelo sorteia números, calcula a resposta, monta as alternativas e escreve a resolução. */
(function(root){
  const T=String.raw;
  function rng(seed){let h=(seed>>>0)||1;return function(){h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function R(seed){
    const g=rng(seed);
    return {n:g,int:(a,b)=>a+Math.floor(g()*(b-a+1)),pick:a=>a[Math.floor(g()*a.length)],
      shuffle:a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(g()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}};
  }
  /* formatação brasileira */
  function f(x){
    x=Math.round(x*100)/100;const neg=x<0;x=Math.abs(x);
    let [i,d]=x.toFixed(2).split('.');d=d.replace(/0+$/,'');
    i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    return (neg?'−':'')+i+(d?','+d:'');
  }
  function brl(x){x=Math.round(x*100)/100;const [i,d]=Math.abs(x).toFixed(2).split('.');return 'R$ '+i.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+d}
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const fat=n=>n<=1?1:n*fat(n-1);
  const comb=(n,k)=>fat(n)/(fat(k)*fat(n-k));

  const M=[];
  function def(o){M.push(o)}

  /* ================= MATEMÁTICA ================= */
  def({id:'mat-desc-sucessivo',disc:'Matemática',area:'Aritmética e proporcionalidade',assunto:'Porcentagem',topico:'descontos sucessivos',serie:1,dif:'Fácil',
    gen:r=>{let v;do{v={P:r.pick([200,400,600,800,1000,1200]),a:r.pick([10,20,25,30]),b:r.pick([10,20,25,50])}}while(v.a===v.b);return v},
    enun:v=>T`Uma loja anuncia um produto de ${brl(v.P)} com dois descontos seguidos: o primeiro de ${v.a}% e, sobre o novo preço, outro de ${v.b}%.

Qual é o preço final do produto?`,
    resp:v=>({ok:v.P*(1-v.a/100)*(1-v.b/100),bad:[v.P*(1-(v.a+v.b)/100),v.P*(1-v.b/100),v.P*(1-v.a/100),v.P*(v.a+v.b)/100,v.P*(1-v.a/100)*(1+v.b/100)],fmt:brl}),
    resol:v=>{const p1=v.P*(1-v.a/100),p2=p1*(1-v.b/100);return T`**Ideia:** o segundo desconto incide sobre o preço **já descontado**, e não sobre o preço original.

**Passo 1 – Primeiro desconto.** Pagar ${100-v.a}% do preço: $${v.P}\cdot ${f((100-v.a)/100)}=${f(p1)}$ reais.

**Passo 2 – Segundo desconto.** Pagar ${100-v.b}% do valor anterior: $${f(p1)}\cdot ${f((100-v.b)/100)}=${f(p2)}$ reais.

**Passo 3 – Conferir.** Somar os descontos (${v.a}% + ${v.b}% = ${v.a+v.b}%) daria outro valor, porque os descontos não se somam: eles se multiplicam.

O preço final é ${brl(p2)}.`}});

  def({id:'mat-juros-simples',disc:'Matemática',area:'Aritmética e proporcionalidade',assunto:'Matemática financeira',topico:'juros simples – montante',serie:2,dif:'Fácil',
    gen:r=>({C:r.pick([1000,1500,2000,2500,3000,4000,5000]),i:r.pick([2,3,4,5]),n:r.pick([3,4,5,6,8,10])}),
    enun:v=>T`Um capital de ${brl(v.C)} é aplicado a juros **simples**, à taxa de ${v.i}% ao mês, durante ${v.n} meses.

Qual é o montante ao final da aplicação?`,
    resp:v=>({ok:v.C*(1+v.i*v.n/100),bad:[v.C*v.i*v.n/100,v.C*Math.pow(1+v.i/100,v.n),v.C*(1+v.i/100),v.C*(1+v.i/100)*v.n,v.C*(1+v.i*v.n/100)+v.C*v.i/100],fmt:brl}),
    resol:v=>{const J=v.C*v.i*v.n/100;return T`**Ideia:** nos juros simples, o juro de cada mês é sempre o mesmo, calculado sobre o capital inicial.

**Passo 1 – Juro de um mês.** $${v.C}\cdot ${f(v.i/100)}=${f(v.C*v.i/100)}$ reais.

**Passo 2 – Juro total.** $${f(v.C*v.i/100)}\cdot ${v.n}=${f(J)}$ reais.

**Passo 3 – Montante** (capital + juros): $${v.C}+${f(J)}=${f(v.C+J)}$ reais.

O montante é ${brl(v.C+J)}.`}});

  def({id:'mat-juros-compostos',disc:'Matemática',area:'Aritmética e proporcionalidade',assunto:'Matemática financeira',topico:'juros compostos – montante',serie:2,dif:'Média',
    gen:r=>{const [i,n]=r.pick([[10,2],[20,2],[10,3],[50,2]]);return {C:r.pick([1000,2000,3000,4000,5000]),i,n}},
    enun:v=>T`Um capital de ${brl(v.C)} é aplicado a juros **compostos**, à taxa de ${v.i}% ao ano, durante ${v.n} anos.

Qual é o montante ao final da aplicação?`,
    resp:v=>({ok:v.C*Math.pow(1+v.i/100,v.n),bad:[v.C*(1+v.i*v.n/100),v.C*Math.pow(1+v.i/100,v.n-1),v.C*Math.pow(1+v.i/100,v.n+1),v.C*Math.pow(1+v.i/100,v.n)-v.C,v.C*(1+v.i/100)*v.n],fmt:brl}),
    resol:v=>{const q=1+v.i/100;let s='';let c=v.C;for(let k=1;k<=v.n;k++){const nx=c*q;s+=T`- Ano ${k}: $${f(c)}\cdot ${f(q)}=${f(nx)}$ reais.
`;c=nx}
      return T`**Ideia:** nos juros compostos, os juros de cada ano são calculados sobre o montante do ano anterior. Fórmula: $M=C\,(1+i)^n$.

**Passo 1 – Fator de crescimento.** $1+${f(v.i/100)}=${f(q)}$.

**Passo 2 – Aplicar a fórmula.** $M=${v.C}\cdot ${f(q)}^{${v.n}}$. Ano a ano:

${s}
**Passo 3 – Resultado.** $M=${f(v.C*Math.pow(q,v.n))}$ reais.

O montante é ${brl(v.C*Math.pow(q,v.n))}.`}});

  def({id:'mat-regra-tres-composta',disc:'Matemática',area:'Aritmética e proporcionalidade',assunto:'Razão e proporção',topico:'regra de três composta (máquinas, horas, peças)',serie:1,dif:'Média',
    gen:r=>{let v;do{v={r:r.int(2,6),n:r.pick([2,3,4,5,6]),h:r.pick([2,3,4,5,6]),m:r.pick([2,3,4,5,6,8]),k:r.pick([2,3,4,5,6,8])}}while(v.m===v.n||v.k===v.h);v.p=v.r*v.n*v.h;return v},
    enun:v=>T`Em uma fábrica, ${v.n} máquinas idênticas produzem ${v.p} peças em ${v.h} horas de funcionamento. Mantendo o mesmo ritmo por máquina, ${v.m} dessas máquinas funcionando por ${v.k} horas produzirão quantas peças?`,
    resp:v=>({ok:v.r*v.m*v.k,bad:[v.r*v.m*v.h,v.r*v.n*v.k,v.p+v.m*v.k,v.r*v.m*(v.k-1),v.r*v.m*(v.k+1)],fmt:f}),
    resol:v=>T`**Ideia:** quanto mais máquinas e mais horas, mais peças: as duas grandezas são **diretamente proporcionais** à produção.

**Passo 1 – Produção de uma máquina em 1 hora.**
$$\frac{${v.p}}{${v.n}\cdot ${v.h}}=${v.r}\ \text{peças}$$

**Passo 2 – Para ${v.m} máquinas em ${v.k} horas.**
$$${v.r}\cdot ${v.m}\cdot ${v.k}=${v.r*v.m*v.k}\ \text{peças}$$

Serão produzidas ${v.r*v.m*v.k} peças.`});

  def({id:'mat-soma-quadrados-raizes',disc:'Matemática',area:'Álgebra e funções',assunto:'Função quadrática',topico:'soma e produto das raízes – x1² + x2²',serie:1,dif:'Média',
    gen:r=>{let v;do{const a=r.int(-6,9),b=r.int(-6,9);v={a,b,S:a+b,P:a*b}}while(!v.a||!v.b||v.a===v.b||!v.S);return v},
    enun:v=>{const t=(c,s)=>(c>0?' + ':' − ')+Math.abs(c)+s;return T`Sejam $x_1$ e $x_2$ as raízes da equação $x^2${t(-v.S,'x')}${t(v.P,'')} = 0$.

O valor de $x_1^2 + x_2^2$ é`},
    resp:v=>({ok:v.S*v.S-2*v.P,bad:[v.S*v.S,v.S*v.S-v.P,v.S*v.S+2*v.P,v.S-2*v.P,v.P*v.S],fmt:f}),
    resol:v=>T`**Ideia:** não precisamos achar as raízes. Pelas relações entre coeficientes e raízes (soma e produto), em $x^2-Sx+P=0$ temos $x_1+x_2=S$ e $x_1x_2=P$.

**Passo 1.** Aqui $S=${v.S}$ e $P=${v.P}$.

**Passo 2 – Identidade.** $(x_1+x_2)^2=x_1^2+x_2^2+2x_1x_2$, logo
$$x_1^2+x_2^2=(x_1+x_2)^2-2\,x_1x_2.$$

**Passo 3 – Substituir.**
$$(${v.S})^2-2\cdot(${v.P})=${v.S*v.S}${v.P>0?' − ':' + '}${Math.abs(2*v.P)}=${v.S*v.S-2*v.P}.$$

**Conferência.** As raízes são ${v.a} e ${v.b}: $${v.a}^2+${v.b}^2=${v.a*v.a}+${v.b*v.b}=${v.a*v.a+v.b*v.b}$.`});

  def({id:'mat-pa-soma',disc:'Matemática',area:'Álgebra e funções',assunto:'Progressões e sequências',topico:'soma dos termos de uma PA',serie:1,dif:'Média',
    gen:r=>({a1:r.int(1,10),r:r.int(2,6),n:r.pick([10,12,15,20])}),
    enun:v=>T`Uma progressão aritmética tem primeiro termo ${v.a1} e razão ${v.r}. A soma dos ${v.n} primeiros termos dessa progressão é`,
    resp:v=>{const an=v.a1+(v.n-1)*v.r;const S=v.n*(v.a1+an)/2;return {ok:S,bad:[v.n*an,v.n*(v.a1+an),an,S-an,S+v.r],fmt:f}},
    resol:v=>{const an=v.a1+(v.n-1)*v.r;return T`**Passo 1 – Último termo.** $a_n=a_1+(n-1)r=${v.a1}+${v.n-1}\cdot ${v.r}=${an}$.

**Passo 2 – Soma.** $S_n=\dfrac{n\,(a_1+a_n)}{2}=\dfrac{${v.n}\cdot(${v.a1}+${an})}{2}=\dfrac{${v.n*(v.a1+an)}}{2}=${v.n*(v.a1+an)/2}$.

A soma é ${v.n*(v.a1+an)/2}.`}});

  def({id:'mat-pg-termo',disc:'Matemática',area:'Álgebra e funções',assunto:'Progressões e sequências',topico:'termo geral de uma PG',serie:1,dif:'Fácil',
    gen:r=>{const q=r.pick([2,3]);return {a1:r.pick([1,2,3,4,5]),q,n:q===3?r.pick([4,5,6]):r.pick([5,6,7])}},
    enun:v=>T`Em uma progressão geométrica, o primeiro termo é ${v.a1} e a razão é ${v.q}. O ${v.n}º termo dessa progressão é`,
    resp:v=>({ok:v.a1*Math.pow(v.q,v.n-1),bad:[v.a1*Math.pow(v.q,v.n),v.a1*v.q*(v.n-1),v.a1*v.q*v.n,v.a1+(v.n-1)*v.q,v.a1*Math.pow(v.q,v.n-2)],fmt:f}),
    resol:v=>T`**Ideia:** numa PG, cada termo é o anterior multiplicado pela razão. O termo geral é $a_n=a_1\cdot q^{\,n-1}$.

**Passo 1.** $a_{${v.n}}=${v.a1}\cdot ${v.q}^{${v.n-1}}$.

**Passo 2.** $${v.q}^{${v.n-1}}=${Math.pow(v.q,v.n-1)}$, então $a_{${v.n}}=${v.a1}\cdot ${Math.pow(v.q,v.n-1)}=${v.a1*Math.pow(v.q,v.n-1)}$.

O ${v.n}º termo é ${v.a1*Math.pow(v.q,v.n-1)}.`});

  def({id:'mat-afim-taxi',disc:'Matemática',area:'Álgebra e funções',assunto:'Função afim',topico:'função afim – bandeirada e preço por km',serie:1,dif:'Fácil',
    gen:r=>({B:r.pick([4,5,6,7,8,10]),k:r.pick([2,3,4,5]),d:r.int(5,20)}),
    enun:v=>T`O preço de uma corrida de táxi é composto por uma bandeirada fixa de ${brl(v.B)} mais ${brl(v.k)} por quilômetro rodado. Um passageiro pagou ${brl(v.B+v.k*v.d)} por uma corrida.

Quantos quilômetros ele percorreu?`,
    resp:v=>({ok:v.d,bad:[(v.B+v.k*v.d)/v.k,(v.B+v.k*v.d+v.B)/v.k,v.k*v.d,v.d+v.B,v.d-1],fmt:n=>f(n)+' km'}),
    resol:v=>{const T0=v.B+v.k*v.d;return T`**Passo 1 – Função do preço.** Com $x$ km rodados: $p(x)=${v.B}+${v.k}x$.

**Passo 2 – Igualar ao valor pago.** $${v.B}+${v.k}x=${T0}$.

**Passo 3 – Resolver.** $${v.k}x=${T0}-${v.B}=${v.k*v.d}$, logo $x=\dfrac{${v.k*v.d}}{${v.k}}=${v.d}$.

Ele percorreu ${v.d} km.`}});

  def({id:'mat-prob-urna',disc:'Matemática',area:'Contagem, probabilidade e estatística',assunto:'Probabilidade',topico:'probabilidade simples (bolas em uma urna)',serie:2,dif:'Fácil',
    gen:r=>{const N=r.pick([20,25,40,50]);let a,b;do{a=r.int(2,Math.floor(N/2)-1);b=r.int(2,Math.floor(N/2)-1)}while(a+b>=N-2||a===b);return {N,a,b,c:N-a-b}},
    enun:v=>T`Uma urna contém ${v.N} bolas: ${v.a} azuis, ${v.b} verdes e ${v.c} vermelhas. Retira-se ao acaso uma bola.

Qual é a probabilidade de ela ser azul **ou** verde?`,
    resp:v=>({ok:(v.a+v.b)/v.N*100,bad:[v.a/v.N*100,v.b/v.N*100,v.c/v.N*100,(v.a/v.N)*(v.b/v.N)*100,(v.a+v.b)/v.c*100],fmt:n=>f(n)+'%'}),
    resol:v=>T`**Ideia:** probabilidade $=\dfrac{\text{casos favoráveis}}{\text{casos possíveis}}$. As cores azul e verde não acontecem juntas, então os casos favoráveis se somam.

**Passo 1.** Favoráveis: ${v.a}+${v.b}=${v.a+v.b}$. Possíveis: ${v.N}.

**Passo 2.** $P=\dfrac{${v.a+v.b}}{${v.N}}=${f((v.a+v.b)/v.N)}=${f((v.a+v.b)/v.N*100)}\%$.

A probabilidade é ${f((v.a+v.b)/v.N*100)}%.`});

  def({id:'mat-retangulo-area',disc:'Matemática',area:'Geometria',assunto:'Geometria plana',topico:'perímetro e área de retângulo',serie:2,dif:'Fácil',
    gen:r=>({x:r.int(3,15),d:r.int(2,9)}),
    enun:v=>T`O perímetro de um retângulo é ${4*v.x+2*v.d} cm e um dos lados excede o outro em ${v.d} cm.

A área desse retângulo, em cm², é`,
    resp:v=>({ok:v.x*(v.x+v.d),bad:[Math.pow((4*v.x+2*v.d)/4,2),Math.pow(v.x+v.d,2),v.x*v.x,v.x*v.d,(4*v.x+2*v.d)*v.d],fmt:f}),
    resol:v=>T`**Passo 1 – Lados.** Seja $x$ o lado menor; o maior é $x+${v.d}$.

**Passo 2 – Perímetro.** $2x+2(x+${v.d})=${4*v.x+2*v.d}\Rightarrow 4x+${2*v.d}=${4*v.x+2*v.d}\Rightarrow 4x=${4*v.x}\Rightarrow x=${v.x}$.

Os lados medem ${v.x} cm e ${v.x+v.d} cm.

**Passo 3 – Área.** $${v.x}\cdot ${v.x+v.d}=${v.x*(v.x+v.d)}$ cm².`});

  def({id:'mat-pitagoras-escada',disc:'Matemática',area:'Geometria',assunto:'Geometria plana',topico:'teorema de Pitágoras – escada apoiada na parede',serie:2,dif:'Fácil',
    gen:r=>{const [a,b,c]=r.pick([[3,4,5],[5,12,13],[8,15,17],[7,24,25]]);const k=c>13?1:r.int(1,3);return {h:b*k,d:a*k,L:c*k}},
    enun:v=>T`Uma escada de ${v.L} m de comprimento está apoiada em uma parede vertical. O pé da escada fica a ${v.d} m da parede, em piso horizontal.

A que altura, em metros, a escada toca a parede?`,
    resp:v=>({ok:v.h,bad:[v.L-v.d,v.L+v.d,v.L*v.L-v.d*v.d,(v.L+v.d)/2,v.h+v.d],fmt:f}),
    resol:v=>T`**Ideia:** a escada, a parede e o chão formam um triângulo retângulo; a escada é a hipotenusa.

**Passo 1 – Pitágoras.** $${v.L}^2=${v.d}^2+h^2$.

**Passo 2 – Calcular.** $h^2=${v.L*v.L}-${v.d*v.d}=${v.h*v.h}$, então $h=\sqrt{${v.h*v.h}}=${v.h}$.

A escada toca a parede a ${v.h} m de altura.`});

  def({id:'mat-cilindro-volume',disc:'Matemática',area:'Geometria',assunto:'Geometria espacial',topico:'volume do cilindro',serie:2,dif:'Fácil',
    gen:r=>({r:r.int(2,10),h:r.int(3,15)}),
    enun:v=>T`Um reservatório tem a forma de um cilindro circular reto com ${v.r} cm de raio da base e ${v.h} cm de altura.

O volume desse reservatório, em cm³, é`,
    resp:v=>({ok:v.r*v.r*v.h,bad:[v.r*v.r*v.h/3,2*v.r*v.h,v.r*v.h*v.h,4*v.r*v.r*v.h,v.r*v.h],fmt:n=>f(n)+'$\\pi$'}),
    resol:v=>T`**Ideia:** volume do cilindro $=$ área da base $\times$ altura $=\pi r^2h$.

**Passo 1.** $V=\pi\cdot ${v.r}^2\cdot ${v.h}$.

**Passo 2.** $${v.r}^2=${v.r*v.r}$, então $V=${v.r*v.r}\cdot ${v.h}\,\pi=${v.r*v.r*v.h}\,\pi$ cm³.`});

  def({id:'mat-media-ponderada',disc:'Matemática',area:'Contagem, probabilidade e estatística',assunto:'Estatística',topico:'média ponderada',serie:2,dif:'Fácil',
    gen:r=>{const w=r.pick([[2,3,5],[1,2,2],[3,3,4],[1,3,6],[2,2,6]]);return {w,n:[r.int(4,10),r.int(4,10),r.int(4,10)]}},
    enun:v=>T`Em uma disciplina, a nota final é a média ponderada de três avaliações, com pesos ${v.w[0]}, ${v.w[1]} e ${v.w[2]}, respectivamente. Um aluno obteve ${v.n[0]}, ${v.n[1]} e ${v.n[2]} nessas avaliações.

Qual é a nota final dele?`,
    resp:v=>{const S=v.w[0]*v.n[0]+v.w[1]*v.n[1]+v.w[2]*v.n[2],W=v.w[0]+v.w[1]+v.w[2];return {ok:S/W,bad:[(v.n[0]+v.n[1]+v.n[2])/3,S,S/3,Math.max(...v.n),(v.w[0]*v.n[2]+v.w[1]*v.n[1]+v.w[2]*v.n[0])/W],fmt:f}},
    resol:v=>{const S=v.w[0]*v.n[0]+v.w[1]*v.n[1]+v.w[2]*v.n[2],W=v.w[0]+v.w[1]+v.w[2];return T`**Ideia:** cada nota vale tantas vezes quanto seu peso.

**Passo 1 – Soma ponderada.** $${v.n[0]}\cdot ${v.w[0]}+${v.n[1]}\cdot ${v.w[1]}+${v.n[2]}\cdot ${v.w[2]}=${S}$.

**Passo 2 – Soma dos pesos.** $${v.w[0]}+${v.w[1]}+${v.w[2]}=${W}$.

**Passo 3 – Média.** $\dfrac{${S}}{${W}}=${f(S/W)}$.

A nota final é ${f(S/W)}.`}});

  def({id:'mat-idades',disc:'Matemática',area:'Álgebra e funções',assunto:'Conjuntos, números e equações',topico:'equação do 1º grau – idades',serie:1,dif:'Fácil',
    gen:r=>({f:r.int(4,15),k:r.pick([2,3,4])}),
    enun:v=>T`A soma das idades de um pai e de seu filho é ${(v.k+1)*v.f} anos, e o pai tem ${v.k} vezes a idade do filho.

Qual é a idade do pai?`,
    resp:v=>({ok:v.k*v.f,bad:[v.f,(v.k+1)*v.f/2,(v.k+1)*v.f-v.k,v.k*v.f+v.k,(v.k-1)*v.f],fmt:n=>f(n)+' anos'}),
    resol:v=>T`**Passo 1 – Equação.** Se o filho tem $x$ anos, o pai tem $${v.k}x$. Então $x+${v.k}x=${(v.k+1)*v.f}$.

**Passo 2 – Resolver.** $${v.k+1}x=${(v.k+1)*v.f}\Rightarrow x=${v.f}$ (idade do filho).

**Passo 3 – Pai.** $${v.k}\cdot ${v.f}=${v.k*v.f}$ anos.

**Conferência:** ${v.f}+${v.k*v.f}=${(v.k+1)*v.f}$ ✓.`});

  def({id:'mat-comb-comissao',disc:'Matemática',area:'Contagem, probabilidade e estatística',assunto:'Análise combinatória',topico:'combinação – formação de comissões',serie:2,dif:'Média',
    gen:r=>{const k=r.pick([2,3]);return {k,n:k===2?r.int(6,14):r.int(6,10)}},
    enun:v=>T`Uma turma tem ${v.n} alunos. De quantas maneiras diferentes é possível escolher uma comissão de ${v.k} alunos para representá-la?`,
    resp:v=>({ok:comb(v.n,v.k),bad:[fat(v.n)/fat(v.n-v.k),Math.pow(v.n,v.k),v.n*v.k,comb(v.n,v.k)+v.n,comb(v.n,v.k+1)],fmt:f}),
    resol:v=>{const num=v.k===2?`${v.n}\\cdot ${v.n-1}`:`${v.n}\\cdot ${v.n-1}\\cdot ${v.n-2}`;const den=v.k===2?'2':'3\\cdot 2';return T`**Ideia:** numa comissão a **ordem não importa** (Ana e Bia é igual a Bia e Ana), então usamos combinação: $C_{n,k}=\dfrac{n!}{k!\,(n-k)!}$.

**Passo 1.** $C_{${v.n},${v.k}}=\dfrac{${num}}{${den}}$.

**Passo 2.** $=\dfrac{${v.k===2?v.n*(v.n-1):v.n*(v.n-1)*(v.n-2)}}{${v.k===2?2:6}}=${comb(v.n,v.k)}$.

Há ${comb(v.n,v.k)} comissões possíveis.`}});

  /* ================= FÍSICA ================= */
  def({id:'fis-encontro-mru',disc:'Física',area:'Mecânica',assunto:'Cinemática',topico:'MRU – tempo de encontro',serie:1,dif:'Fácil',
    gen:r=>{let v;do{v={v1:r.pick([40,50,60,70,80]),v2:r.pick([30,40,50,60,70]),t:r.int(1,5)}}while(v.v1===v.v2);v.D=(v.v1+v.v2)*v.t;return v},
    enun:v=>T`Duas cidades distam ${v.D} km. No mesmo instante, dois carros partem uma ao encontro da outra, em linha reta, com velocidades constantes de ${v.v1} km/h e ${v.v2} km/h.

Depois de quanto tempo eles se encontram?`,
    resp:v=>({ok:v.t,bad:[v.D/Math.abs(v.v1-v.v2),v.D/v.v1,v.D/v.v2,2*v.t,v.t+1],fmt:n=>f(n)+' h'}),
    resol:v=>T`**Ideia:** quando os carros vão um **ao encontro do outro**, a distância entre eles diminui com a soma das velocidades.

**Passo 1 – Velocidade de aproximação.** $${v.v1}+${v.v2}=${v.v1+v.v2}$ km/h.

**Passo 2 – Tempo.** $t=\dfrac{\Delta s}{v}=\dfrac{${v.D}}{${v.v1+v.v2}}=${v.t}$ h.

Eles se encontram após ${v.t} h.`});

  def({id:'fis-mruv-distancia',disc:'Física',area:'Mecânica',assunto:'Cinemática',topico:'MRUV a partir do repouso – distância percorrida',serie:1,dif:'Fácil',
    gen:r=>{let v;do{v={a:r.pick([2,3,4,5,6]),t:r.pick([3,4,5,6,8,10])}}while((v.a*v.t*v.t)%2);return v},
    enun:v=>T`Um carro parte do repouso e mantém aceleração constante de ${v.a} m/s². Qual é a distância percorrida por ele em ${v.t} s?`,
    resp:v=>({ok:v.a*v.t*v.t/2,bad:[v.a*v.t*v.t,v.a*v.t/2,v.a*v.t,v.a*v.t*v.t/4,2*v.a*v.t*v.t],fmt:n=>f(n)+' m'}),
    resol:v=>T`**Ideia:** movimento uniformemente variado a partir do repouso ($v_0=0$): $\Delta s=\tfrac12 a\,t^2$.

**Passo 1.** $\Delta s=\tfrac12\cdot ${v.a}\cdot ${v.t}^2=\tfrac12\cdot ${v.a}\cdot ${v.t*v.t}$.

**Passo 2.** $\Delta s=${v.a*v.t*v.t/2}$ m.`});

  def({id:'fis-queda-livre',disc:'Física',area:'Mecânica',assunto:'Cinemática',topico:'queda livre – altura em função do tempo',serie:1,dif:'Fácil',
    gen:r=>({t:r.int(2,8)}),
    enun:v=>T`Um objeto é abandonado (parte do repouso) do alto de um prédio e leva ${v.t} s para atingir o solo. Desprezando a resistência do ar e adotando $g=10\ \text{m/s}^2$, a altura do prédio, em metros, é`,
    resp:v=>({ok:5*v.t*v.t,bad:[10*v.t,5*v.t,10*v.t*v.t,5*Math.pow(v.t+1,2),20*v.t],fmt:f}),
    resol:v=>T`**Ideia:** queda livre a partir do repouso: $h=\tfrac12 g\,t^2$.

**Passo 1.** $h=\tfrac12\cdot 10\cdot ${v.t}^2=5\cdot ${v.t*v.t}$.

**Passo 2.** $h=${5*v.t*v.t}$ m.`});

  def({id:'fis-velocidade-media',disc:'Física',area:'Mecânica',assunto:'Cinemática',topico:'velocidade média – metades do percurso',serie:1,dif:'Média',
    gen:r=>{const [a,b]=r.pick([[40,60],[30,60],[20,30],[60,90],[40,120],[30,45],[60,120],[50,75]]);return {v1:a,v2:b}},
    enun:v=>T`Um carro percorre a primeira metade de um trecho retilíneo com velocidade constante de ${v.v1} km/h e a segunda metade com velocidade constante de ${v.v2} km/h.

A velocidade média no percurso total é`,
    resp:v=>({ok:2*v.v1*v.v2/(v.v1+v.v2),bad:[(v.v1+v.v2)/2,v.v1*v.v2/(v.v1+v.v2),Math.abs(v.v2-v.v1),v.v1+v.v2,2*(v.v1+v.v2)],fmt:n=>f(n)+' km/h'}),
    resol:v=>T`**Ideia:** velocidade média é distância total dividida pelo tempo total. A média das velocidades **não** serve, porque o carro passa mais tempo na velocidade menor.

**Passo 1.** Seja $d$ a metade do trecho (o total é $2d$). Tempos: $t_1=\dfrac{d}{${v.v1}}$ e $t_2=\dfrac{d}{${v.v2}}$.

**Passo 2 – Tempo total.** $t_1+t_2=d\left(\dfrac1{${v.v1}}+\dfrac1{${v.v2}}\right)=d\cdot\dfrac{${v.v1+v.v2}}{${v.v1*v.v2}}$.

**Passo 3 – Velocidade média.**
$$v_m=\frac{2d}{d\cdot\frac{${v.v1+v.v2}}{${v.v1*v.v2}}}=\frac{2\cdot ${v.v1*v.v2}}{${v.v1+v.v2}}=${f(2*v.v1*v.v2/(v.v1+v.v2))}\ \text{km/h}.$$`});

  def({id:'fis-newton-atrito',disc:'Física',area:'Mecânica',assunto:'Dinâmica (leis de Newton)',topico:'2ª lei de Newton com atrito',serie:1,dif:'Fácil',
    gen:r=>{const m=r.pick([2,3,4,5,10]),a=r.pick([1,2,3,4]),fa=r.pick([4,6,8,10,12]);return {m,a,fa,F:m*a+fa}},
    enun:v=>T`Um bloco de massa ${v.m} kg está sobre uma superfície horizontal. Uma força horizontal de ${v.F} N o puxa, e a força de atrito entre o bloco e a superfície vale ${v.fa} N.

Qual é a aceleração do bloco, em m/s²?`,
    resp:v=>({ok:v.a,bad:[v.F/v.m,(v.F+v.fa)/v.m,v.F-v.fa,v.fa/v.m,(v.F-v.fa)*v.m],fmt:f}),
    resol:v=>T`**Ideia:** 2ª lei de Newton: $F_R=m\,a$, com a força **resultante** na direção do movimento.

**Passo 1 – Resultante.** $F_R=F-f_{at}=${v.F}-${v.fa}=${v.F-v.fa}$ N.

**Passo 2 – Aceleração.** $a=\dfrac{F_R}{m}=\dfrac{${v.F-v.fa}}{${v.m}}=${v.a}$ m/s².`});

  def({id:'fis-energia-cinetica',disc:'Física',area:'Mecânica',assunto:'Trabalho, energia e potência',topico:'energia cinética',serie:1,dif:'Fácil',
    gen:r=>({m:r.pick([2,4,5,10,20]),v:r.pick([2,4,6,10,20])}),
    enun:v=>T`Um corpo de massa ${v.m} kg se move com velocidade de ${v.v} m/s. A energia cinética desse corpo, em joules, é`,
    resp:v=>({ok:v.m*v.v*v.v/2,bad:[v.m*v.v*v.v,v.m*v.v/2,v.m*v.v,v.m*v.v*v.v/4,2*v.m*v.v*v.v],fmt:f}),
    resol:v=>T`**Ideia:** $E_c=\tfrac12 m v^2$ (a velocidade entra **ao quadrado**).

**Passo 1.** $E_c=\tfrac12\cdot ${v.m}\cdot ${v.v}^2=\tfrac12\cdot ${v.m}\cdot ${v.v*v.v}$.

**Passo 2.** $E_c=${v.m*v.v*v.v/2}$ J.`});

  def({id:'fis-potencia-elevador',disc:'Física',area:'Mecânica',assunto:'Trabalho, energia e potência',topico:'potência média ao elevar uma carga',serie:1,dif:'Média',
    gen:r=>{let v;do{v={m:r.pick([50,100,200,300,500]),h:r.pick([2,3,5,10,20]),t:r.pick([5,10,20,25,50])}}while((v.m*10*v.h)%v.t);return v},
    enun:v=>T`Um guincho eleva, com velocidade constante, uma carga de ${v.m} kg até ${v.h} m de altura em ${v.t} s. Adote $g=10\ \text{m/s}^2$.

A potência média desenvolvida pelo guincho, em watts, é`,
    resp:v=>({ok:v.m*10*v.h/v.t,bad:[v.m*v.h/v.t,v.m*10*v.h,v.m*10*v.h*v.t,v.m*10*v.t/v.h,v.m*10/v.t],fmt:f}),
    resol:v=>T`**Ideia:** potência é trabalho dividido pelo tempo: $P=\dfrac{\tau}{\Delta t}$. Com velocidade constante, o trabalho do guincho é igual à variação da energia potencial: $\tau=m g h$.

**Passo 1 – Trabalho.** $\tau=${v.m}\cdot 10\cdot ${v.h}=${v.m*10*v.h}$ J.

**Passo 2 – Potência.** $P=\dfrac{${v.m*10*v.h}}{${v.t}}=${v.m*10*v.h/v.t}$ W.`});

  def({id:'fis-pressao-profundidade',disc:'Física',area:'Mecânica',assunto:'Estática e hidrostática',topico:'pressão total em um líquido (lei de Stevin)',serie:1,dif:'Média',
    gen:r=>({h:r.pick([10,20,30,40,50])}),
    enun:v=>T`Um mergulhador está a ${v.h} m de profundidade na água. Considere a densidade da água $1\,000\ \text{kg/m}^3$, $g=10\ \text{m/s}^2$ e a pressão atmosférica de $1{,}0\times10^5$ Pa (1 atm).

A pressão total sobre o mergulhador, em atmosferas, é`,
    resp:v=>({ok:1+v.h/10,bad:[v.h/10,1+v.h,v.h,1+v.h/100,2*(1+v.h/10)],fmt:n=>f(n)+' atm'}),
    resol:v=>T`**Ideia:** pressão total = pressão atmosférica + pressão da coluna de água: $p=p_0+\rho g h$.

**Passo 1 – Pressão da água.** $\rho g h=1\,000\cdot 10\cdot ${v.h}=${1000*10*v.h}$ Pa $=${f(v.h/10)}\times10^5$ Pa $=${f(v.h/10)}$ atm.

**Passo 2 – Somar a atmosfera.** $p=1+${f(v.h/10)}=${f(1+v.h/10)}$ atm.`});

  def({id:'fis-calor-sensivel',disc:'Física',area:'Termologia',assunto:'Calorimetria e propagação de calor',topico:'calor sensível Q = m·c·ΔT',serie:2,dif:'Fácil',
    gen:r=>{const Ti=r.pick([15,20,25]);return {m:r.pick([100,200,250,500,1000]),Ti,Tf:Ti+r.pick([20,30,40,50,60])}},
    enun:v=>T`Qual é a quantidade de calor necessária para aquecer ${f(v.m)} g de água de ${v.Ti} °C até ${v.Tf} °C? Dado: calor específico da água $c=1\ \text{cal/(g·°C)}$.`,
    resp:v=>{const dT=v.Tf-v.Ti;return {ok:v.m*dT,bad:[v.m*v.Tf,v.m*v.Ti,v.m*(v.Tf+v.Ti),v.m*dT/1000,v.m*dT*2],fmt:n=>f(n)+' cal'}},
    resol:v=>{const dT=v.Tf-v.Ti;return T`**Ideia:** $Q=m\,c\,\Delta T$, onde $\Delta T$ é a **variação** de temperatura (final menos inicial).

**Passo 1.** $\Delta T=${v.Tf}-${v.Ti}=${dT}$ °C.

**Passo 2.** $Q=${v.m}\cdot 1\cdot ${dT}=${f(v.m*dT)}$ cal.`}});

  def({id:'fis-boyle',disc:'Física',area:'Termologia',assunto:'Gases e termodinâmica',topico:'transformação isotérmica (lei de Boyle)',serie:2,dif:'Fácil',
    gen:r=>{let v;do{v={P1:r.pick([1,2,3,4,6]),V1:r.pick([6,8,10,12,20,24]),V2:r.pick([2,3,4,5,6,8,10,12])}}while(v.V2>=v.V1||(v.P1*v.V1)%v.V2);return v},
    enun:v=>T`Um gás ideal, mantido à temperatura constante, ocupa ${v.V1} L sob pressão de ${v.P1} atm. O gás é comprimido até o volume de ${v.V2} L.

Qual é a nova pressão do gás?`,
    resp:v=>({ok:v.P1*v.V1/v.V2,bad:[v.P1*v.V2/v.V1,v.P1*v.V1,v.P1+v.V1-v.V2,v.P1*v.V2,v.P1*(v.V1-v.V2)],fmt:n=>f(n)+' atm'}),
    resol:v=>T`**Ideia:** a temperatura é constante, então $P_1V_1=P_2V_2$ (pressão e volume são inversamente proporcionais).

**Passo 1.** $${v.P1}\cdot ${v.V1}=P_2\cdot ${v.V2}$.

**Passo 2.** $P_2=\dfrac{${v.P1*v.V1}}{${v.V2}}=${v.P1*v.V1/v.V2}$ atm.

Comprimir o gás (menor volume) aumentou a pressão, como esperado.`});

  def({id:'fis-onda-velocidade',disc:'Física',area:'Óptica e ondas',assunto:'Ondulatória e acústica',topico:'equação fundamental da ondulatória v = λ·f',serie:2,dif:'Fácil',
    gen:r=>({f:r.pick([5,10,20,50,100,200]),l:r.pick([1,2,3,4,5,10])}),
    enun:v=>T`Uma onda se propaga em uma corda com frequência de ${v.f} Hz e comprimento de onda de ${v.l} m.

A velocidade de propagação dessa onda, em m/s, é`,
    resp:v=>({ok:v.f*v.l,bad:[v.f/v.l,v.f+v.l,v.l/v.f,2*v.f*v.l,v.f*v.l/2],fmt:f}),
    resol:v=>T`**Ideia:** equação fundamental da ondulatória: $v=\lambda\,f$.

**Passo 1.** $v=${v.l}\cdot ${v.f}$.

**Passo 2.** $v=${v.l*v.f}$ m/s.`});

  def({id:'fis-resistores-paralelo',disc:'Física',area:'Eletricidade e magnetismo',assunto:'Eletrodinâmica (circuitos e potência)',topico:'resistores em paralelo – corrente total',serie:3,dif:'Média',
    gen:r=>{const [a,b]=r.pick([[6,12],[20,30],[30,60],[12,24],[10,40],[15,30],[20,60],[30,45]]);const Re=a*b/(a+b);return {R1:a,R2:b,Re,U:Re*r.pick([2,3,4,5])}},
    enun:v=>T`Dois resistores de ${v.R1} Ω e ${v.R2} Ω são associados **em paralelo** e ligados a uma bateria de ${f(v.U)} V.

A corrente total fornecida pela bateria, em ampères, é`,
    resp:v=>({ok:v.U/v.Re,bad:[v.U/(v.R1+v.R2),v.U/v.R1,v.U/v.R2,v.U*v.Re,v.U/v.Re+1],fmt:n=>f(n)+' A'}),
    resol:v=>T`**Passo 1 – Resistência equivalente.** Em paralelo (dois resistores): $R_{eq}=\dfrac{R_1R_2}{R_1+R_2}=\dfrac{${v.R1}\cdot ${v.R2}}{${v.R1}+${v.R2}}=\dfrac{${v.R1*v.R2}}{${v.R1+v.R2}}=${f(v.Re)}\ \Omega$.

**Passo 2 – Lei de Ohm.** $i=\dfrac{U}{R_{eq}}=\dfrac{${f(v.U)}}{${f(v.Re)}}=${f(v.U/v.Re)}$ A.

**Conferência:** $\dfrac{${f(v.U)}}{${v.R1}}+\dfrac{${f(v.U)}}{${v.R2}}=${f(v.U/v.R1)}+${f(v.U/v.R2)}=${f(v.U/v.R1+v.U/v.R2)}$ A ✓.`});

  def({id:'fis-consumo-energia',disc:'Física',area:'Eletricidade e magnetismo',assunto:'Eletrodinâmica (circuitos e potência)',topico:'consumo de energia elétrica e custo (kWh)',serie:3,dif:'Fácil',
    gen:r=>({P:r.pick([1000,1500,2000,3000,4500]),t:r.pick([0.5,1,2,4]),tar:r.pick([0.5,0.6,0.8,0.9,1])}),
    enun:v=>T`Um chuveiro elétrico de potência ${f(v.P)} W é usado ${f(v.t)} hora(s) por dia, durante 30 dias. O preço do quilowatt-hora (kWh) é ${brl(v.tar)}.

O custo da energia consumida pelo chuveiro nesse período é`,
    resp:v=>({ok:v.P/1000*v.t*30*v.tar,bad:[v.P*v.t*30*v.tar,v.P/1000*v.t*v.tar,v.P/1000*30*v.tar,v.P/1000*v.t*30,v.P/1000*v.t*30*v.tar*2],fmt:brl}),
    resol:v=>{const kwh=v.P/1000*v.t*30;return T`**Ideia:** energia $=$ potência $\times$ tempo, em **kWh** (potência em kW, tempo em horas).

**Passo 1 – Potência em kW.** $${f(v.P)}\ \text{W}=${f(v.P/1000)}$ kW.

**Passo 2 – Energia em 30 dias.** $${f(v.P/1000)}\cdot ${f(v.t)}\cdot 30=${f(kwh)}$ kWh.

**Passo 3 – Custo.** $${f(kwh)}\cdot ${f(v.tar)}=${f(kwh*v.tar)}$ reais.

O custo é ${brl(kwh*v.tar)}.`}});

  def({id:'fis-gauss-lente',disc:'Física',area:'Óptica e ondas',assunto:'Óptica geométrica',topico:'equação de Gauss – lente convergente',serie:2,dif:'Média',
    gen:r=>{const f0=r.pick([6,8,10,12,15,20]);const ps=[];for(let p=f0+1;p<=60;p++)if((p*f0)%(p-f0)===0)ps.push(p);return {fo:f0,p:r.pick(ps),pl:0}},
    enun:v=>T`Uma lente convergente tem distância focal de ${v.fo} cm. Um objeto é colocado a ${v.p} cm da lente, sobre o eixo principal.

A que distância da lente se forma a imagem, em cm?`,
    resp:v=>{const pl=v.p*v.fo/(v.p-v.fo);return {ok:pl,bad:[v.p-v.fo,v.p+v.fo,v.p*v.fo/(v.p+v.fo),pl+v.fo,Math.abs(pl-v.fo)],fmt:f}},
    resol:v=>{const pl=v.p*v.fo/(v.p-v.fo);return T`**Ideia:** equação de Gauss: $\dfrac1f=\dfrac1p+\dfrac1{p'}$.

**Passo 1.** $\dfrac1{${v.fo}}=\dfrac1{${v.p}}+\dfrac1{p'}\Rightarrow\dfrac1{p'}=\dfrac1{${v.fo}}-\dfrac1{${v.p}}=\dfrac{${v.p}-${v.fo}}{${v.fo}\cdot ${v.p}}=\dfrac{${v.p-v.fo}}{${v.fo*v.p}}$.

**Passo 2.** $p'=\dfrac{${v.fo*v.p}}{${v.p-v.fo}}=${pl}$ cm.

Como $p'>0$, a imagem é real e se forma ${pl} cm depois da lente.`}});

  def({id:'fis-mcu-velocidade',disc:'Física',area:'Mecânica',assunto:'Movimento circular e gravitação',topico:'movimento circular uniforme – velocidade linear',serie:1,dif:'Fácil',
    gen:r=>{let v;do{v={R:r.pick([1,2,3,4,5,6,8,10]),T:r.pick([1,2,3,4,6,12])}}while((6*v.R)%v.T);return v},
    enun:v=>T`Uma roda-gigante tem ${v.R} m de raio e completa uma volta a cada ${v.T} s, em movimento circular uniforme. Adote $\pi=3$.

A velocidade linear de uma cadeira presa à borda da roda, em m/s, é`,
    resp:v=>({ok:6*v.R/v.T,bad:[6*v.R*v.T,3*v.R/v.T,v.R/v.T,12*v.R/v.T,6*v.R/v.T+v.T],fmt:f}),
    resol:v=>T`**Ideia:** em uma volta, a cadeira percorre o comprimento da circunferência $2\pi R$ no tempo de um período $T$.

**Passo 1.** $v=\dfrac{2\pi R}{T}=\dfrac{2\cdot 3\cdot ${v.R}}{${v.T}}=\dfrac{${6*v.R}}{${v.T}}$.

**Passo 2.** $v=${6*v.R/v.T}$ m/s.`});

  /* ===== variações de questões reais do ENEM (botão “outros números” na questão original) ===== */
  def({id:'fis-ar-condicionado',de:['enem-2026-92'],disc:'Física',area:'Termologia',assunto:'Calorimetria e propagação de calor',topico:'ar-condicionado – potência em Btu/h',serie:2,dif:'Média',
    gen:r=>{let v;do{v={a:r.pick([5,8,10,12]),b:r.pick([10,15,20,25]),c:r.pick([1,2,3]),d:r.pick([10,15,20,25])};v.W=v.a*100+v.b*150+v.c*500+v.d*200}while(Math.round(v.W/30)*30!==v.W);return v},
    enun:v=>T`Uma engenheira simulou as fontes de calor de um escritório: ${v.a} lâmpadas de 100 W cada, ${v.b} computadores de 150 W cada, ${v.c} geladeiras de 500 W cada e ${v.d} pessoas adultas que dissipam 200 W cada. Todos dissipam calor ao mesmo tempo. Para manter a temperatura constante, ela precisa de um ar-condicionado o mais econômico possível. Considere as paredes isolantes e o fator de conversão 1 Btu/h = 0,3 W.

Qual é a capacidade de refrigeração mínima, em Btu/h?`,
    resp:v=>({ok:v.W/0.3,bad:[v.W,v.W*0.3,(v.W-v.d*200)/0.3,(v.W+v.c*500)/0.3,v.W/3],fmt:n=>f(n)+' Btu/h'}),
    resol:v=>T`**Passo 1 – Potência de cada fonte.** Lâmpadas: ${v.a}·100 = ${v.a*100} W. Computadores: ${v.b}·150 = ${v.b*150} W. Geladeiras: ${v.c}·500 = ${v.c*500} W. Pessoas: ${v.d}·200 = ${v.d*200} W.

**Passo 2 – Total.** ${v.W} W.

**Passo 3 – Conversão.** Como 1 Btu/h = 0,3 W: $\dfrac{${v.W}}{0{,}3}=${f(v.W/0.3)}$ Btu/h.`});

  def({id:'fis-radar-ida-volta',de:['enem-2026-96'],disc:'Física',area:'Óptica e ondas',assunto:'Ondas eletromagnéticas',topico:'radar – tempo de ida e volta',serie:2,dif:'Fácil',
    gen:r=>({d:r.pick([30,45,60,75,90,150,300])}),
    enun:v=>T`Um radar emite ondas eletromagnéticas com velocidade de 300 mil quilômetros por segundo. Um avião foi localizado a ${v.d} km do radar. O operador mede o tempo entre o envio do sinal e a chegada do eco refletido no avião.

Qual é esse tempo, em milissegundos?`,
    resp:v=>({ok:2*v.d/300,bad:[v.d/300,4*v.d/300,2*v.d/300*1000,v.d/3,2*v.d/30],fmt:n=>f(n)+' ms'}),
    resol:v=>T`**Ideia:** o sinal vai até o avião e **volta**, então percorre o dobro da distância.

**Passo 1.** Distância total: $2\cdot${v.d}=${2*v.d}$ km.

**Passo 2.** $t=\dfrac{${2*v.d}}{300\,000}=${f(2*v.d/300)}\times10^{-3}$ s $=${f(2*v.d/300)}$ ms.`});

  def({id:'fis-corda-violao',de:['enem-2026-113'],disc:'Física',area:'Óptica e ondas',assunto:'Ondulatória e acústica',topico:'corda vibrante – frequência × comprimento',serie:2,dif:'Fácil',
    gen:r=>({f1:r.pick([220,330,440,660]),L2:r.pick([30,40,45,48])}),
    enun:v=>T`Em um violão, a corda livre tem 60 cm de comprimento vibrante e emite uma nota de ${v.f1} Hz no modo fundamental. A frequência é inversamente proporcional ao comprimento da parte que vibra. Ao pressionar a corda, a parte oscilante passa a ter ${v.L2} cm.

Qual é a nova frequência emitida?`,
    resp:v=>({ok:v.f1*60/v.L2,bad:[v.f1*v.L2/60,v.f1+(60-v.L2),v.f1*(60-v.L2)/60,v.f1*60/(60-v.L2),v.f1*2],fmt:n=>f(n)+' Hz'}),
    resol:v=>T`**Ideia:** $f\cdot L$ é constante.

$f_2=f_1\cdot\dfrac{L_1}{L_2}=${v.f1}\cdot\dfrac{60}{${v.L2}}=${f(v.f1*60/v.L2)}$ Hz.`});

  def({id:'fis-tv-espera',de:['enem-2026-133'],disc:'Física',area:'Mecânica',assunto:'Trabalho, energia e potência',topico:'energia em espera × energia total',serie:1,dif:'Média',
    gen:r=>({Pu:r.pick([100,120,158,200]),Pe:r.pick([1,2,3]),h:r.pick([2,3,4,5,6])}),
    enun:v=>T`Um aparelho de TV consome ${v.Pu} W em uso e ${v.Pe} W em espera. Uma pessoa assistiu à TV durante ${v.h} horas e, no restante das 24 horas do dia, o aparelho ficou em espera.

Qual é a porcentagem da energia gasta em espera em relação ao total de energia gasta no dia?`,
    resp:v=>{const e=v.Pe*(24-v.h),u=v.Pu*v.h;return {ok:e/(e+u)*100,bad:[e/u*100,v.Pe/v.Pu*100,v.Pe/(v.Pu+v.Pe)*100,e/(e+u)*10,(24-v.h)/24*100],fmt:n=>f(n)+'%'}},
    resol:v=>{const e=v.Pe*(24-v.h),u=v.Pu*v.h;return T`**Passo 1 – Uso.** ${v.Pu}·${v.h} = ${u} Wh.

**Passo 2 – Espera.** ${24-v.h} h a ${v.Pe} W: ${e} Wh.

**Passo 3 – Porcentagem.** $\dfrac{${e}}{${u+e}}\approx${f(e/(e+u)*100)}\%$.`}});

  def({id:'fis-lampada-folha',de:['enem-2026-121'],disc:'Física',area:'Óptica e ondas',assunto:'Óptica geométrica',topico:'intensidade luminosa e energia absorvida',serie:2,dif:'Difícil',
    gen:r=>({P:r.pick([4,6,8,12]),r:r.pick([1,2]),A:r.pick([2,4,5]),k:r.pick([40,50,60,70])}),
    enun:v=>T`Uma lâmpada puntiforme de ${v.P} W emite luz vermelha em um quarto escuro. A ${v.r} m dela há uma folha de planta com área de ${v.A} cm², que absorve ${v.k}% da luz incidente nesse comprimento de onda. A intensidade da luz é a razão entre a potência da fonte e a área da superfície esférica de raio $r$ ($4\pi r^2$). Use $\pi\approx3$.

Qual é a energia absorvida pela folha a cada segundo, em unidades de $10^{-4}$ J?`,
    resp:v=>{const E=v.P/(12*v.r*v.r)*v.A*v.k/100;return {ok:E,bad:[E*100/v.k,E*3,E/3,E*v.r*v.r/4,E*4],fmt:n=>f(n)+' × 10⁻⁴ J'}},
    resol:v=>{const I=v.P/(12*v.r*v.r);return T`**Passo 1 – Intensidade.** $I=\dfrac{${v.P}}{4\cdot3\cdot${v.r}^2}=${f(I)}$ W/m².

**Passo 2 – Potência incidente.** ${v.A} cm² $=${v.A}\times10^{-4}$ m², então $P_{inc}=${f(I*v.A)}\times10^{-4}$ W.

**Passo 3 – Absorvida (${v.k}%).** $${f(I*v.A)}\cdot${f(v.k/100)}=${f(I*v.A*v.k/100)}\times10^{-4}$ W, ou seja, ${f(I*v.A*v.k/100)}×10⁻⁴ J a cada segundo.`}});

  def({id:'fis-ponte-sensor',de:['enem-2026-95'],disc:'Física',area:'Eletricidade e magnetismo',assunto:'Eletrodinâmica (circuitos e potência)',topico:'ponte de resistores – tensão entre pontos',serie:3,dif:'Difícil',
    gen:r=>{let v;do{v={U:r.pick([12,24]),T:r.pick([550,800,1050]),Rc:r.pick([20,60])};v.Rs=20*(1+0.002*(v.T-300))}while(Math.abs(v.U*v.Rs/(40+v.Rs)-v.U*v.Rc/(40+v.Rc))<1e-6);return v},
    enun:v=>T`Um sensor de temperatura tem resistência $R_s=20\,[1+0{,}002\,(T-300)]$ (em ohm, com $T$ em kelvin). Ele está em série com um resistor de 40 Ω, formando um ramo ligado a uma bateria de ${v.U} V cuja outra ponta é o terra. Um segundo ramo, em paralelo ao primeiro, tem um resistor de 40 Ω em série com outro de ${v.Rc} Ω (na mesma ordem: 40 Ω ligado ao polo da bateria). O ponto A fica entre o 40 Ω e o sensor, e o ponto B, entre o 40 Ω e o de ${v.Rc} Ω. O sensor está a ${v.T} K.

Qual é o módulo da tensão entre A e B?`,
    resp:v=>{const VA=v.U*v.Rs/(40+v.Rs),VB=v.U*v.Rc/(40+v.Rc);return {ok:Math.abs(VA-VB),bad:[VA,VB,VA+VB,v.U/2,Math.abs(VA-VB)*2],fmt:n=>f(n)+' V'}},
    resol:v=>{const VA=v.U*v.Rs/(40+v.Rs),VB=v.U*v.Rc/(40+v.Rc);return T`**Passo 1 – Sensor.** $R_s=20[1+0{,}002(${v.T}-300)]=${f(v.Rs)}$ Ω.

**Passo 2 – Ponto A (divisor de tensão).** $V_A=${v.U}\cdot\dfrac{${f(v.Rs)}}{40+${f(v.Rs)}}=${f(VA)}$ V.

**Passo 3 – Ponto B.** $V_B=${v.U}\cdot\dfrac{${v.Rc}}{40+${v.Rc}}=${f(VB)}$ V.

**Passo 4.** $|V_A-V_B|=${f(Math.abs(VA-VB))}$ V.`}});

  def({id:'fis-fusao-neutron',de:['enem-2026-94'],disc:'Física',area:'Física moderna',assunto:'Física moderna e radioatividade',topico:'fusão – divisão da energia cinética',serie:3,dif:'Média',
    gen:r=>({E:r.pick([10,15,20,30,35])}),
    enun:v=>T`Em uma fusão nuclear, um núcleo de deutério e um de trítio formam uma partícula $\alpha$ (4 nucleons) e um nêutron (1 nucleon). O momento linear total antes da reação é nulo e a energia cinética total dos produtos é ${v.E} MeV. Considere as massas do próton e do nêutron iguais.

Qual é a energia cinética do nêutron?`,
    resp:v=>({ok:v.E*4/5,bad:[v.E/5,v.E/2,v.E*3/4,v.E/4,v.E*2/5],fmt:n=>f(n)+' MeV'}),
    resol:v=>T`**Ideia:** momentos de mesmo módulo $p$ e sentidos opostos; $E_c=p^2/2m$.

**Passo 1.** $E_\alpha=\dfrac{E_n}{4}$ (a massa do $\alpha$ é 4 vezes maior).

**Passo 2.** $E_n+\dfrac{E_n}{4}=${v.E}\Rightarrow E_n=${f(v.E*4/5)}$ MeV.`});

  /* ================= motor ================= */
  function numAlts(m,v,r){
    const o=m.resp(v);const ok=Math.round(o.ok*1e6)/1e6;
    const vistos=new Set([ok]);const fv=new Set([o.fmt(ok)]);const bad=[];
    for(const b of r.shuffle(o.bad)){const x=Math.round(b*1e6)/1e6;
      if(!isFinite(x)||x<=0&&ok>0||vistos.has(x)||fv.has(o.fmt(x)))continue;vistos.add(x);fv.add(o.fmt(x));bad.push(x);if(bad.length===4)break}
    let k=1;while(bad.length<4){const base=Math.abs(ok)>=10?Math.max(1,Math.round(Math.abs(ok)*0.1)):1;
      const x=Math.round((ok+(k%2?1:-1)*Math.ceil(k/2)*base)*1e6)/1e6;k++;
      if(!vistos.has(x)&&!fv.has(o.fmt(x))&&x>0){vistos.add(x);fv.add(o.fmt(x));bad.push(x)}}
    const todos=[ok].concat(bad).sort((a,b)=>a-b);
    const L='ABCDE',alts={};todos.forEach((x,i)=>alts[L[i]]=o.fmt(x));
    return {alts:alts,gab:L[todos.indexOf(ok)],ok:ok};
  }
  function gerar(id,seed){
    const m=M.find(x=>x.id===id);if(!m)return null;
    const r=R(seed*7919+13);
    const v=m.gen(r);
    const a=numAlts(m,v,r);
    const idx=M.indexOf(m)+1;
    return {id:'m-'+id+'@'+seed,mid:'m-'+id,modelo:true,seed:seed,
      origem:'Modelo Exata (autoral)',banca:'Modelo Exata',ano:null,aplicacao:'dados variáveis',numero_original:idx,
      disciplina:m.disc,area:m.area,assunto:m.assunto,topico:m.topico+' · dados variáveis',serie:m.serie,dificuldade:m.dif,
      classificacao_revisada:true,tipo:'objetiva',fonte_figura:null,figuras:[],alternativas_imagem:null,
      enunciado:m.enun(v).trim(),alternativas:a.alts,gabarito:a.gab,anulada:false,gabarito_oficial:true,
      _v:v,resol_txt:m.resol(v).trim().replace(/\n*$/,'')+'\n\n**Resposta: alternativa '+a.gab+'.**'};
  }
  root.Param={modelos:M,gerar:gerar,rng:rng,deBase:function(b){const m=M.find(x=>(x.de||[]).indexOf(b)>=0);return m?m.id:null}};
})(typeof window!=='undefined'?window:globalThis);
