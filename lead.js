(() => {
  // FormToMail public form key. Configure the recipient in its dashboard.
  const apiKey = "";
  const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  document.querySelectorAll("form[data-lead-project]").forEach(form => {
    const button = form.querySelector("button[type=submit]");
    const error = form.querySelector(".err");
    const buttonText = button.textContent;
    button.disabled = false;

    function showError(message, withPhone = false) {
      error.textContent = message;
      if (withPhone) {
        const phone = document.createElement("a");
        phone.href = "tel:88005503654";
        phone.textContent = "8 800 550-36-54";
        error.append(" Позвоните нам: ", phone, ".");
      }
      error.hidden = false;
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (button.disabled || form.classList.contains("sent")) return;
      error.hidden = true;

      const fields = form.elements;
      const name = fields.namedItem("name").value.trim();
      const phone = fields.namedItem("phone").value.trim();
      const phoneDigits = phone.replace(/\D/g, "").length;
      if (name.length < 2 || name.length > 120 || !/^[+\d\s().-]+$/.test(phone) ||
          phoneDigits < 10 || phoneDigits > 15 || phone.length > 32 || !fields.namedItem("consent").checked) {
        showError("Укажите имя, корректный номер телефона и подтвердите согласие.");
        return;
      }

      if (!apiKey) {
        showError("Отправка через форму пока недоступна.", true);
        return;
      }

      button.disabled = true;
      button.textContent = "Отправляем…";
      try {
        const project = form.dataset.leadProject;
        const response = await fetch("https://api.formtomail.ru/send", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: "Новая заявка: " + project,
            body: { "Объект": project, "Имя": escapeHtml(name), "Телефон": escapeHtml(phone) },
            honeypot: fields.namedItem("company_website").value
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (!response.ok || (await response.json()).statusCode !== 200) {
          throw new Error("Form submission failed");
        }
        form.reset();
        form.classList.add("sent");
        form.querySelector(".done").focus();
      } catch {
        showError("Не удалось отправить заявку. Попробуйте ещё раз.", true);
      } finally {
        button.textContent = buttonText;
        button.disabled = false;
      }
    });
  });
})();
