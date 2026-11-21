(() => {
  // FormToMail public form key. Configure the recipient in its dashboard.
  const apiKey = "QyBcj54FVocDeHPO";
  const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function bindForm(form) {
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
      const phone = fields.namedItem("phone")?.value.trim() || "";
      const emailField = fields.namedItem("email");
      const phoneDigits = phone.replace(/\D/g, "").length;
      const validContact = emailField ? emailField.validity.valid :
        /^[+\d\s().-]+$/.test(phone) && phoneDigits >= 10 && phoneDigits <= 15 && phone.length <= 32;
      if (name.length < 2 || name.length > 120 || !validContact || !fields.namedItem("consent").checked) {
        showError("Укажите имя, " + (emailField ? "электронную почту" : "номер телефона") + " и подтвердите согласие.");
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
        const purpose = form.dataset.purpose || (emailField ? "Расчёт по лоту" : "Консультация");
        const contact = emailField ? { "Почта": escapeHtml(emailField.value.trim()), "Пример расчёта": "https://vector-360.ru/files/karluu-example.pdf" } : { "Телефон": escapeHtml(phone) };
        const response = await fetch("https://api.formtomail.ru/send", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: project + " — " + purpose,
            body: { "Объект": project, "Запрос": escapeHtml(purpose), "Имя": escapeHtml(name), ...contact, "Согласие": form.querySelector("[data-consent-document]").href },
            honeypot: fields.namedItem("company_website").value
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (!response.ok || (await response.json()).statusCode !== 200) {
          throw new Error("Form submission failed");
        }
        const message = form.querySelector(".done p");
        if (emailField) {
          message.textContent = "Менеджер подготовит индивидуальный расчёт и пришлёт его на указанную почту. ";
          const download = document.createElement("a");
          download.href = "/files/karluu-example.pdf";
          download.download = "karluu-example.pdf";
          download.textContent = "Скачать пример расчёта (PDF)";
          message.append(download);
        } else {
          message.textContent = "Менеджер свяжется с вами по указанному телефону.";
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
  }

  const original = document.querySelector("form[data-lead-project]");
  if (!original) return;
  const template = original.cloneNode(true);
  bindForm(original);

  document.querySelectorAll(".plan-link").forEach(link => {
    const viewer = document.createElement("dialog");
    viewer.className = "plan-dialog";
    const caption = link.textContent.includes("генплан") ? "Генплан комплекса" : "Карта расположения";
    viewer.setAttribute("aria-label", caption);
    viewer.innerHTML = '<form method="dialog"><button aria-label="Закрыть">Закрыть</button></form><img><a target="_blank" rel="noopener">Открыть в полном размере</a>';
    const image = viewer.querySelector("img");
    image.alt = caption;
    viewer.querySelector("a").href = link.href;
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      image.src = link.href;
      viewer.showModal();
    });
    document.body.append(viewer);
  });

  const dialog = document.createElement("dialog");
  dialog.className = "inquiry-dialog";
  dialog.setAttribute("aria-labelledby", "inquiry-title");
  dialog.innerHTML = '<button type="button" class="dialog-close" aria-label="Закрыть">×</button><h2 id="inquiry-title"></h2>';
  document.body.append(dialog);
  dialog.querySelector(".dialog-close").onclick = () => dialog.close();
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });

  document.querySelectorAll('a[href="#lead"]').forEach(link => {
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", event => {
      event.preventDefault();
      const title = link.textContent.trim();
      const unit = link.closest("tr")?.cells[0]?.textContent || link.closest(".lay")?.querySelector("h3")?.textContent;
      const purpose = unit ? title + " — " + unit : title;
      dialog.querySelector("h2").textContent = purpose;
      dialog.querySelector("form")?.remove();
      const form = template.cloneNode(true);
      form.dataset.purpose = purpose;
      const email = form.elements.namedItem("email");
      if (email && !link.hasAttribute("data-estimate")) {
        email.type = "tel";
        email.name = "phone";
        email.autocomplete = "tel";
        email.placeholder = "+7";
        email.maxLength = 32;
        email.closest("label").querySelector("span").textContent = "Телефон";
        form.querySelector("[data-consent-document]").href = "/files/consent-viewing.pdf";
      }
      form.querySelector("button[type=submit]").textContent = link.hasAttribute("data-estimate") ? "Запросить расчёт на почту" : "Отправить заявку";
      dialog.append(form);
      bindForm(form);
      dialog.showModal();
      form.elements.namedItem("name").focus();
    });
  });
})();
