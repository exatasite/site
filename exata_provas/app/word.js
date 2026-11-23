/* Exportação da prova para Word (.docx) – fórmulas viram equações do Word (editáveis) */
window.WordExport=(function(){
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const unesc=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  const CM=360000; // EMU por cm

  /* ---------- imagens ---------- */
  async function loadBytes(path){
    if(location.protocol!=='file:'){const r=await fetch(path);if(!r.ok)throw new Error('Imagem não encontrada: '+path);return new Uint8Array(await r.arrayBuffer())}
    if(!(window.IMG&&window.IMG[path])){
      await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='app/img/'+path.split('/').pop()+'.js';sc.onload=res;sc.onerror=()=>rej(new Error('Imagem não encontrada: '+path));document.head.appendChild(sc)});
    }
    const bin=atob(window.IMG[path].split(',')[1]);const u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;
  }
  const pngSize=b=>({w:(b[16]<<24|b[17]<<16|b[18]<<8|b[19])>>>0,h:(b[20]<<24|b[21]<<16|b[22]<<8|b[23])>>>0});

  /* ---------- fórmulas ---------- */
  function omml(tex,display){
    try{
      const h=katex.renderToString(tex,{output:'mathml',throwOnError:false,displayMode:false});
      let m=h.match(/<math[\s\S]*<\/math>/)[0].replace(/<annotation[\s\S]*?<\/annotation>/g,'').replace(/<\/?semantics>/g,'');
      let o=window.MML2OMML(m).replace(/ xmlns:\w+="[^"]*"/g,'').replace(/(<m:t(?: [^>]*)?>)([\s\S]*?)(<\/m:t>)/g,(x,a,t,c)=>a+t.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+c);
      if(!/<m:oMath/.test(o))throw 0;
      return display?'<m:oMathPara>'+o+'</m:oMathPara>':o;
    }catch(e){return '<w:r><w:t xml:space="preserve">'+esc(tex)+'</w:t></w:r>'}
  }

  /* ---------- construção de XML ---------- */
  function rpr(f){
    let x='';
    if(f.b)x+='<w:b/>';if(f.i)x+='<w:i/>';if(f.mono)x+='<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
    if(f.sz)x+='<w:sz w:val="'+f.sz+'"/>';
    return x?'<w:rPr>'+x+'</w:rPr>':'';
  }
  function run(t,f){return '<w:r>'+rpr(f)+'<w:t xml:space="preserve">'+esc(t)+'</w:t></w:r>'}

  function P(runs,o){
    o=o||{};
    let pp='';
    if(o.keepNext)pp+='<w:keepNext/>';
    if(o.keepLines)pp+='<w:keepLines/>';
    pp+='<w:spacing w:before="'+(o.before||0)+'" w:after="'+(o.after==null?80:o.after)+'"'+(o.line?' w:line="'+o.line+'" w:lineRule="auto"':'')+'/>';
    if(o.ind)pp+='<w:ind w:left="'+o.ind+'"'+(o.hang?' w:hanging="'+o.hang+'"':'')+'/>';
    if(o.jc)pp+='<w:jc w:val="'+o.jc+'"/>';
    if(o.sect)pp+=o.sect;
    return '<w:p><w:pPr>'+pp+'</w:pPr>'+runs+'</w:p>';
  }

  function Doc(){this.media=[];this.imgs={};this.docPr=0}

  Doc.prototype.drawing=function(path,maxW,maxH){
    const im=this.imgs[path];if(!im)return '';
    let cx=im.w/220*914400,cy=im.h/220*914400;
    const k=Math.min(1,maxW/cx,maxH/cy);cx=Math.round(cx*k);cy=Math.round(cy*k);
    const rid=im.rid;this.docPr++;
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+this.docPr+'" name="Figura '+this.docPr+'"/>'+
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
      '<pic:nvPicPr><pic:cNvPr id="0" name="'+esc(path.split('/').pop())+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  };

  /* texto com placeholders -> runs */
  Doc.prototype.txt=function(s,f,ctx){
    let out='';
    s=unesc(s);
    s.split(/(\d+|\d+)/).forEach(part=>{
      if(!part)return;
      let m;
      if(m=part.match(/^(\d+)$/)){const x=ctx.maths[m[1]];out+=omml(x.tex,false)}
      else if(m=part.match(/^(\d+)$/)){const p=ctx.figs[m[1]-1];if(p)out+=this.drawing(p,ctx.maxW,ctx.maxH)}
      else out+=run(part.replace(//g,'$'),f);
    });
    return out;
  };
  Doc.prototype.runs=function(tokens,f,ctx){
    let out='';
    (tokens||[]).forEach(t=>{
      switch(t.type){
        case 'strong':out+=this.runs(t.tokens,Object.assign({},f,{b:1}),ctx);break;
        case 'em':out+=this.runs(t.tokens,Object.assign({},f,{i:1}),ctx);break;
        case 'codespan':out+=this.txt(t.text,Object.assign({},f,{mono:1}),ctx);break;
        case 'br':out+='<w:r><w:br/></w:r>';break;
        case 'link':out+=this.runs(t.tokens,f,ctx);break;
        case 'html':break;
        default:out+=t.tokens?this.runs(t.tokens,f,ctx):this.txt(t.text!=null?t.text:t.raw,f,ctx);
      }
    });
    return out;
  };

  const onlyDisplay=(tokens,ctx)=>{
    if(!tokens||tokens.length!==1||tokens[0].type!=='text')return null;
    const m=tokens[0].text.trim().match(/^(\d+)$/);
    return m&&ctx.maths[m[1]].display?ctx.maths[m[1]]:null;
  };
  const onlyFig=(tokens)=>tokens&&tokens.length===1&&tokens[0].type==='text'&&/^\s*\d+\s*$/.test(tokens[0].text);

  Doc.prototype.blocks=function(tokens,ctx,o){
    o=o||{};let out='';
    tokens.forEach(t=>{
      switch(t.type){
        case 'paragraph':{
          const dm=onlyDisplay(t.tokens,ctx);
          if(dm)out+=P(omml(dm.tex,true),{jc:'center',after:100,keepLines:1});
          else out+=P(this.runs(t.tokens,{},ctx),Object.assign({after:100,keepLines:1,jc:onlyFig(t.tokens)?'center':null},o));
          break}
        case 'text':out+=P(this.runs(t.tokens||[t],{},ctx),Object.assign({after:100},o));break;
        case 'list':
          t.items.forEach((it,i)=>{
            const pre=(t.ordered?((t.start||1)+i)+'.':'•')+'\t';
            const inl=[];it.tokens.forEach(x=>{if(x.type==='text'||x.type==='paragraph')inl.push.apply(inl,x.tokens||[x])});
            const lv=(o.lvl||0)*400;
            out+=P(run(pre,{})+this.runs(inl,{},ctx),{ind:567+lv,hang:283,after:40});
            it.tokens.forEach(x=>{if(x.type==='list')out+=this.blocks([x],ctx,{lvl:(o.lvl||0)+1})});
          });break;
        case 'table':out+=this.table(t,ctx);break;
        case 'blockquote':out+=this.blocks(t.tokens,ctx,{ind:340});break;
        case 'code':out+=P(run(t.text,{mono:1}),{after:80});break;
        default:break;
      }
    });
    return out;
  };
  Doc.prototype.table=function(t,ctx){
    const cell=(c,hd)=>'<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>'+(hd?'<w:shd w:val="clear" w:color="auto" w:fill="E8EDF7"/>':'')+'</w:tcPr>'+P(this.runs(c.tokens,hd?{b:1}:{},ctx),{after:0,jc:'center'})+'</w:tc>';
    let x='<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:jc w:val="center"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(b=>'<w:'+b+' w:val="single" w:sz="4" w:space="0" w:color="666666"/>').join('')+'</w:tblBorders><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr>';
    x+='<w:tr><w:trPr><w:cantSplit/></w:trPr>'+t.header.map(c=>cell(c,true)).join('')+'</w:tr>';
    t.rows.forEach(r=>{x+='<w:tr><w:trPr><w:cantSplit/></w:trPr>'+r.map(c=>cell(c,false)).join('')+'</w:tr>'});
    return x+'</w:tbl>'+P('',{after:80});
  };

  /* markdown -> blocos Word */
  Doc.prototype.md=function(src,figs,o){
    const p=Tx.protect(src);
    const ctx={maths:p.maths,figs:figs||[],maxW:o.maxW,maxH:o.maxH};
    return this.blocks(marked.lexer(p.s),ctx);
  };

  /* uma questão */
  Doc.prototype.questao=function(q,n,opt){
    const o={maxW:opt.col2?7.6*CM:15*CM,maxH:opt.col2?7*CM:9.5*CM};
    let x=P(run('QUESTÃO '+n,{b:1})+(opt.origem?run('  ('+q.origem+')',{sz:17}):''),{keepNext:1,before:120,after:60});
    x+=this.md(q.enunciado,q.figuras,o);
    if(q.alternativas){
      Object.keys(q.alternativas).forEach(k=>{
        const p=Tx.protect(q.alternativas[k]);
        const ctx={maths:p.maths,figs:[],maxW:o.maxW,maxH:o.maxH};
        const tk=marked.lexer(p.s);const inl=[];tk.forEach(t=>{if(t.type==='paragraph'||t.type==='text')inl.push.apply(inl,t.tokens||[t])});
        x+=P(run(k+') ',{b:1})+this.runs(inl,{},ctx),{ind:340,hang:340,after:60,keepLines:1});
      });
    }
    if(q.alternativas_imagem){
      const ctx={maths:[],figs:[q.alternativas_imagem],maxW:o.maxW,maxH:o.maxH};
      x+=P(this.drawing(q.alternativas_imagem,o.maxW,o.maxH),{jc:'center',after:100});
    }
    return x;
  };

  const SECT=(cols,type)=>'<w:sectPr>'+(type?'<w:type w:val="'+type+'"/>':'')+'<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="600" w:footer="600" w:gutter="0"/>'+(cols>1?'<w:cols w:num="2" w:space="567" w:sep="1"/>':'<w:cols w:space="708"/>')+'</w:sectPr>';

  function cabecalho(d,o){
    let x=P(run(o.titulo||'Avaliação',{b:1,sz:32}),{jc:'center',after:40});
    if(o.inst)x+=P(run(o.inst,{sz:24}),{jc:'center',after:80});
    const bd='<w:tcBorders>'+['top','left','bottom','right'].map(b=>'<w:'+b+' w:val="single" w:sz="8" w:space="0" w:color="000000"/>').join('')+'</w:tcBorders>';
    const c=(t,w)=>'<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+bd+'</w:tcPr>'+P(run(t,{sz:21}),{after:40,before:40})+'</w:tc>';
    x+='<w:tbl><w:tblPr><w:tblW w:w="9900" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="7400"/><w:gridCol w:w="2500"/></w:tblGrid>'+
      '<w:tr>'+c('Aluno(a): ',7400)+c('Nº: ',2500)+'</w:tr></w:tbl>'+
      '<w:tbl><w:tblPr><w:tblW w:w="9900" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3600"/><w:gridCol w:w="2400"/><w:gridCol w:w="2000"/><w:gridCol w:w="1900"/></w:tblGrid>'+
      '<w:tr>'+c('Professor(a): '+(o.prof||''),3600)+c('Turma: '+(o.turma||''),2400)+c('Data: '+(o.data||''),2000)+c('Nota: ',1900)+'</w:tr></w:tbl>';
    if((o.instr||'').trim())x+=P(run(o.instr.trim(),{i:1,sz:19}),{before:120,after:120});
    else x+=P('',{after:80});
    return x;
  }

  function gabarito(qs,o){
    let x=P(run('Gabarito – '+(o.titulo||''),{b:1,sz:28}),{jc:'center',after:160});
    const bd='<w:tcBorders>'+['top','left','bottom','right'].map(b=>'<w:'+b+' w:val="single" w:sz="6" w:space="0" w:color="000000"/>').join('')+'</w:tcBorders>';
    const c=(t,f,w,fill)=>'<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+bd+(fill?'<w:shd w:val="clear" w:color="auto" w:fill="'+fill+'"/>':'')+'</w:tcPr>'+P(run(t,f||{}),{jc:'center',after:30,before:30})+'</w:tc>';
    x+='<w:tbl><w:tblPr><w:jc w:val="center"/></w:tblPr><w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="1800"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr>'+c('Questão',{b:1},1500,'D9E2F3')+c('Resposta',{b:1},1800,'D9E2F3')+c('Origem',{b:1},3000,'D9E2F3')+'</w:tr>';
    qs.forEach((q,i)=>{x+='<w:tr>'+c(String(i+1),{},1500)+c(q.anulada?'ANULADA':(q.gabarito||'—'),{b:1},1800)+c(q.origem+' Q'+q.numero_original,{},3000)+'</w:tr>'});
    x+='</w:tbl>';
    if(qs.some(q=>q.gabarito_oficial===false))x+=P(run('Atenção: há respostas de 2026 calculadas, ainda não oficiais.',{i:1,sz:18}),{before:120});
    return x;
  }

  function resolucoes(qs,o,doc){
    let x=P(run('Resolução detalhada – '+(o.titulo||''),{b:1,sz:28}),{jc:'center',after:160});
    qs.forEach((q,i)=>{
      const r=(q.resol_txt!==undefined)?q.resol_txt:(window.RESOL||{})[q.id];
      x+=P(run('QUESTÃO '+(i+1),{b:1})+(o.origem?run('  ('+q.origem+')',{sz:17}):'')+run(q.anulada?'  –  ANULADA':(q.gabarito?'  –  Resposta: '+q.gabarito:''),{b:1}),{keepNext:1,before:200,after:60});
      x+=r?doc.md(r,[],{maxW:15*CM,maxH:9.5*CM}):P(run('Resolução não disponível para esta questão.',{i:1,sz:18}),{after:80});
    });
    return x;
  }

  const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';

  async function pacote(body,doc,nome){
    const z=new JSZip();
    z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    let rels='<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    Object.keys(doc.imgs).forEach(p=>{const im=doc.imgs[p];rels+='<Relationship Id="'+im.rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+im.name+'"/>';z.file('word/media/'+im.name,im.bytes)});
    z.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels+'</Relationships>');
    z.file('word/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>');
    z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+'</w:body></w:document>');
    return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
  }

  async function carregaImagens(doc,qs){
    const paths=[];qs.forEach(q=>{(q.figuras||[]).forEach(f=>paths.push(f));if(q.alternativas_imagem)paths.push(q.alternativas_imagem)});
    let n=0;
    for(const p of [...new Set(paths)]){
      const b=await loadBytes(p);const sz=pngSize(b);n++;
      doc.imgs[p]={bytes:b,w:sz.w,h:sz.h,rid:'rIdI'+n,name:'img'+n+'.png'};
    }
  }

  /* api: opts = {titulo,inst,prof,turma,data,instr,origem,col2,gab,gabSep,questoes} -> [{nome,blob}] */
  async function gerar(o){
    const qs=o.questoes,out=[];
    const doc=new Doc();await carregaImagens(doc,qs);
    const base=(o.titulo||'prova').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')||'prova';
    let body=cabecalho(doc,o);
    let qx='';qs.forEach((q,i)=>{qx+=doc.questao(q,i+1,o)});
    let gx=o.gab?gabarito(qs,o):'';
    let rx=o.resol?resolucoes(qs,o,doc):'';
    const comGab=o.gab&&!o.gabSep;
    const sep=o.gabSep&&(o.gab||o.resol);
    const pgb='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    const extra=(comGab?gx:'')+((o.resol&&!o.gabSep)?((comGab?pgb:'')+rx):'');
    if(o.col2){
      body+=P('',{after:0,sect:SECT(1)})+qx;                       // cabeçalho em 1 coluna; questões em 2 colunas
      if(extra)body+=P('',{after:0,sect:SECT(2,'continuous')})+(comGab?'':pgb)+extra+SECT(1);
      else body+=SECT(2,'continuous');
    }else{
      body+=qx;
      if(extra)body+=pgb+extra;
      body+=SECT(1);
    }
    out.push({nome:base+'.docx',blob:await pacote(body,doc,base)});
    if(sep){
      const d2=new Doc();
      const gx2=o.gab?gabarito(qs,o):'';
      const rx2=o.resol?resolucoes(qs,o,d2):'';
      out.push({nome:base+'_GABARITO.docx',blob:await pacote(gx2+(gx2&&rx2?pgb:'')+rx2+SECT(1),d2,base)});
    }
    return out;
  }
  return {gerar:gerar};
})();
