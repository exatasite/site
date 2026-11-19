/* Tratamento comum de texto (Markdown + fórmulas) — usado na tela e no Word */
window.Tx=(function(){
  const CUR=/(^|[^A-Za-z$\\])(R|US|A|C)\$(?=\s*\d|\))/g;           // "R$ 12,00" = dinheiro, nao formula
  function protect(s){
    const maths=[];
    s=s.replace(/^(\s*)(\d+)([.)])(\s|$)/,'$1$2\\$3$4').replace(/^(\s*)([-+*>#])(\s)/,'$1\\$2$3'); // "10." nao vira lista
    s=s.replace(CUR,'$1$2');
    s=s.replace(/\[\[FIG(\d+)\]\]/g,(m,n)=>''+n+'');
    s=s.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g,(m,a,b)=>{maths.push({tex:(a!==undefined?a:b).trim(),display:a!==undefined});return ''+(maths.length-1)+''});
    return {s:s,maths:maths};
  }
  function html(src,inline,figs){
    const p=protect(src);
    let h=marked.parse(p.s);
    if(inline)h=h.replace(/^<p>|<\/p>\s*$/g,'');
    h=h.replace(/(\d+)/g,(m,i)=>{const x=p.maths[i];return katex.renderToString(x.tex,{displayMode:x.display,throwOnError:false})});
    h=h.replace(/(\d+)/g,(m,n)=>{const f=figs&&figs[n-1];return f?'<img src="'+f+'" alt="figura">':''});
    return h.replace(//g,'$');
  }
  return {protect:protect,html:html};
})();
