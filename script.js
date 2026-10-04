'use strict';
const dialog = document.getElementById('lightbox');
const closeButton = document.getElementById('lightbox-close');
let previousFocus;
document.querySelectorAll('.polaroid').forEach(card => {
  const open = () => {
    previousFocus = card;
    const source = card.querySelector('img');
    document.getElementById('lightbox-img').src = source.dataset.full || source.src;
    document.getElementById('lightbox-img').alt = source.alt;
    document.getElementById('lightbox-caption').textContent = card.querySelector('p').textContent;
    dialog.showModal();
    closeButton.focus();
  };
  card.addEventListener('click', open);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
  });
});
closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
dialog.addEventListener('close', () => previousFocus?.focus());
function revealLetter() {
  const target = document.getElementById(location.hash.slice(1));
  if (target?.matches('details.letter')) {
    target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
}
document.querySelectorAll('a[href="#carta-aniversario"], a[href="#dois-meses"], a[href="#um-mes"], a[href="#carta-bethania"]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector(link.getAttribute('href')).open = true;
    if (location.hash === link.getAttribute('href')) revealLetter();
  });
});
window.addEventListener('hashchange', revealLetter);
revealLetter();
function updateTogether() {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'America/Sao_Paulo',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(part => [part.type, part.value]));
  const year = Number(values.year), month = Number(values.month), day = Number(values.day);
  const now = Date.UTC(year, month - 1, day), start = Date.UTC(2026, 6, 7);
  const stamp = document.getElementById('together-value');
  if (now < start) { stamp.textContent = 'Nossa história começa em 7 de julho de 2026'; return; }
  const months = (year - 2026) * 12 + month - 7 - (day < 7 ? 1 : 0);
  const anniversary = new Date(Date.UTC(2026, 6 + months, 7));
  const days = Math.floor((now - anniversary.getTime()) / 86400000);
  const parts = [];
  if (months >= 12) parts.push(`${Math.floor(months / 12)} ${months < 24 ? 'ano' : 'anos'}`);
  if (months % 12) parts.push(`${months % 12} ${months % 12 === 1 ? 'mês' : 'meses'}`);
  if (days || !parts.length) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  stamp.textContent = `Juntos há ${parts.join(', ')}, ${values.hour}h ${values.minute}m ${values.second}s`;
}
updateTogether();
setInterval(updateTogether, 1000);
