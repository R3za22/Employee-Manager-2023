/* Demo banner. Fixed, dismissible. Persian copy when the page is RTL/fa. */
(function () {
  var fa = /^fa/i.test(document.documentElement.lang || '') || document.documentElement.dir === 'rtl';
  var text = fa ? 'نسخه نمایشی · داده‌های نمونه · ← rezaghamar.ir' : 'Demo · sample data · ← rezaghamar.ir';
  var href = fa ? '/fa/' : '/';
  function mount() {
    if (document.getElementById('demo-banner')) return;
    var s = document.createElement('style');
    s.textContent = '#demo-banner{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;background:#111;color:#fff;font:600 13px/1.2 system-ui,sans-serif;border-radius:999px;box-shadow:0 4px 18px rgba(0,0,0,.35);direction:ltr}#demo-banner a{color:#fff;text-decoration:none}#demo-banner a:hover{text-decoration:underline}#demo-banner button{all:unset;cursor:pointer;width:22px;height:22px;text-align:center;border-radius:50%;background:#333;font-size:14px;line-height:22px}';
    document.head.appendChild(s);
    var d = document.createElement('div');
    d.id = 'demo-banner';
    d.setAttribute('role', 'note');
    d.innerHTML = '<a href="' + href + '"></a><button type="button" aria-label="Dismiss">×</button>';
    d.firstChild.textContent = text;
    d.lastChild.onclick = function () { d.remove(); };
    document.body.appendChild(d);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
