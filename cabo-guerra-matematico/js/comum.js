(function(){
 const c=window.EXATA_FIREBASE;
 if(!firebase.apps.length && c && c.apiKey) firebase.initializeApp(c);
 window.db = firebase.database();
 window.auth = firebase.auth();
 window.isLocalMode = !c || !c.apiKey || String(c.apiKey).includes("COLE_AQUI");
 window.escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 window.newPin = () => String(Math.floor(1000+Math.random()*9000));
 window.showMessage = (el, text, error=false) => { if(el){el.textContent=text;el.classList.toggle("error",!!error);} };
 window.authReady = new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
 window.signInAnonymous = async () => { await window.authReady; if(!auth.currentUser) await auth.signInAnonymously(); return auth.currentUser; };
})();