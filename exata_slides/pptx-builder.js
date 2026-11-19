// Monta o PowerPoint a partir do plano devolvido pela IA.
// Funciona no navegador (PptxGenJS global) e no Node (para testes).
(function (root) {
  var COR = { azul: "1F4E79", azulClaro: "DCE9F5", texto: "222222", cinza: "6B7280", branco: "FFFFFF" };

  function construirPptx(PptxGenJS, plano, info) {
    info = info || {};
    var pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE"; // 13,33 x 7,5 pol.
    pptx.title = plano.titulo || "Aula";

    // Capa
    var capa = pptx.addSlide();
    capa.background = { color: COR.azul };
    capa.addText(plano.titulo || "Aula", {
      x: 0.8, y: 2.3, w: 11.7, h: 1.6, fontFace: "Calibri", fontSize: 40, bold: true, color: COR.branco, valign: "middle",
    });
    var sub = [info.disciplina, info.serie].filter(Boolean).join(" • ");
    if (sub) capa.addText(sub, { x: 0.8, y: 4.0, w: 11.7, h: 0.6, fontFace: "Calibri", fontSize: 22, color: COR.azulClaro });
    if (info.professor) capa.addText("Prof. " + info.professor, { x: 0.8, y: 6.5, w: 11.7, h: 0.5, fontFace: "Calibri", fontSize: 16, color: COR.azulClaro });

    // Slides de conteúdo
    (plano.slides || []).forEach(function (s, i) {
      var sl = pptx.addSlide();
      sl.background = { color: COR.branco };
      sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.2, fill: { color: COR.azul } });
      sl.addText(s.titulo || "", { x: 0.6, y: 0.1, w: 12.1, h: 1.0, fontFace: "Calibri", fontSize: 30, bold: true, color: COR.branco, valign: "middle" });

      var topicos = (s.topicos || []).map(function (t) {
        return { text: t, options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } };
      });
      if (topicos.length) {
        sl.addText(topicos, { x: 0.8, y: 1.6, w: 11.8, h: 5.0, fontFace: "Calibri", fontSize: 26, color: COR.texto, valign: "top", fit: "shrink" });
      }
      sl.addText(String(i + 2), { x: 12.3, y: 7.0, w: 0.7, h: 0.3, fontSize: 12, color: COR.cinza, align: "right" });
      if (s.notas) sl.addNotes(s.notas);
    });

    // Slide final: avaliação
    var av = plano.avaliacao || {};
    var itens = (av.instrumentos || []).concat(av.criterios || []);
    if (itens.length) {
      var f = pptx.addSlide();
      f.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.2, fill: { color: COR.azul } });
      f.addText("Como vamos avaliar", { x: 0.6, y: 0.1, w: 12.1, h: 1.0, fontFace: "Calibri", fontSize: 30, bold: true, color: COR.branco, valign: "middle" });
      f.addText(
        itens.map(function (t) { return { text: t, options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } }; }),
        { x: 0.8, y: 1.6, w: 11.8, h: 5.0, fontFace: "Calibri", fontSize: 24, color: COR.texto, valign: "top", fit: "shrink" }
      );
    }
    return pptx;
  }

  root.construirPptx = construirPptx;
  if (typeof module !== "undefined" && module.exports) module.exports = { construirPptx: construirPptx };
})(typeof window !== "undefined" ? window : globalThis);
