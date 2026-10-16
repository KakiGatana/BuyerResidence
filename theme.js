// Chargé en premier, avant l'affichage.
// 1. Carnet ne s'affiche jamais à l'intérieur d'une autre page (protection contre le « clickjacking »).
if (window.top !== window.self) {
  try { window.top.location = window.self.location.href; } catch (e) { document.documentElement.style.display = 'none'; }
}
// 2. Thème appliqué avant l'affichage pour éviter un flash
try { var t = localStorage.getItem('carnet-theme') || (JSON.parse(localStorage.getItem('carnet-acquereurs-v1') || '{}').theme) || 'light';
      if (t !== 'auto') document.documentElement.dataset.theme = t; }
catch (e) { document.documentElement.dataset.theme = 'light'; }
