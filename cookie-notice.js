(() => {
  const key = "vector360.cookie-notice.accepted";
  try {
    if (localStorage.getItem(key) === "yes") return;
  } catch { /* Storage can be unavailable in private browsing. */ }

  const notice = document.createElement("aside");
  notice.className = "cookie-notice";
  notice.setAttribute("aria-label", "Файлы cookie");
  notice.innerHTML = `<p>Наш сайт использует файлы cookie для стабильной работы. Продолжая, вы соглашаетесь с Политикой обработки персональных данных.</p>
    <div><button type="button">Принять</button><a href="/files/privacy-policy.pdf" target="_blank" rel="noopener">Подробнее</a></div>`;
  notice.querySelector("button").addEventListener("click", () => {
    notice.remove();
    try { localStorage.setItem(key, "yes"); } catch { /* Dismiss for this page. */ }
  });
  document.body.append(notice);
})();
