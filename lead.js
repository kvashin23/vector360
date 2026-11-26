(() => {
  const feedbackSite = location.hostname === "vector360.test.devnuts.ru"
    ? "pk_zbidAMMjvy4sKD8b"
    : "pk_v91K6pDttItY4I5";

  function reachGoal(goal) {
    if (goal && typeof window.ym === "function") {
      try {
        window.ym(114577757, "reachGoal", goal);
      } catch {
        // Analytics must never interrupt a lead submission or a phone call.
      }
    }
  }

  document.addEventListener("click", event => {
    if (event.target.closest?.('a[href^="tel:"]')) reachGoal("phone_click");
  });

  function formatPhone(value) {
    const digits = value.replace(/\D/g, "");
    const hasPrefix = value.startsWith("+7") || (digits.length === 11 && /^[78]/.test(digits));
    const number = (hasPrefix ? digits.slice(1) : digits).slice(0, 10);
    const groups = [number.slice(0, 3), number.slice(3, 6), number.slice(6, 8), number.slice(8)];
    return ["+7", ...groups.filter(Boolean)].join(" ");
  }

  function bindForm(form, submitGoal) {
    const button = form.querySelector("button[type=submit]");
    const error = form.querySelector(".err");
    const buttonText = button.textContent;
    const fields = form.elements;
    const nameField = fields.namedItem("name");
    const phoneField = fields.namedItem("phone");
    const emailField = fields.namedItem("email");
    const consentField = fields.namedItem("consent");
    if (phoneField) {
      phoneField.defaultValue = "+7";
      phoneField.value = "+7";
      phoneField.inputMode = "numeric";
      phoneField.addEventListener("beforeinput", event => {
        if (phoneField.selectionStart === 0 && phoneField.selectionEnd === phoneField.value.length) return;
        if (event.inputType === "deleteContentBackward" && phoneField.selectionEnd <= 2) {
          event.preventDefault();
        }
        if (phoneField.selectionStart < 2) {
          phoneField.setSelectionRange(2, Math.max(2, phoneField.selectionEnd));
        }
      });
      phoneField.addEventListener("input", () => {
        const raw = phoneField.value;
        const caret = phoneField.selectionStart;
        const formatted = formatPhone(raw);
        if (formatted === raw) return;
        phoneField.value = formatted;
        const position = caret === raw.length ? formatted.length : formatPhone(raw.slice(0, caret)).length;
        phoneField.setSelectionRange(position, position);
      });
    }
    button.disabled = false;

    form.addEventListener("input", event => {
      if (event.target.getAttribute("aria-invalid") !== "true") return;
      event.target.removeAttribute("aria-invalid");
      error.hidden = true;
    });

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

    function invalid(field, message) {
      field.setAttribute("aria-invalid", "true");
      showError(message);
      field.focus();
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (button.disabled || form.classList.contains("sent")) return;
      error.hidden = true;

      const name = nameField.value.trim();
      if (name.length < 2 || name.length > 120 || !/^[\p{L}\p{M}]+(?:[ .’'\p{Pd}]+[\p{L}\p{M}]+)*\.?$/u.test(name)) {
        return invalid(nameField, "Введите имя буквами, от 2 до 120 символов.");
      }
      const email = emailField?.value.trim();
      if (emailField && (!emailField.validity.valid || email.length > 254 || !/@[^@]+\.[^@.]+$/.test(email))) {
        return invalid(emailField, "Введите действующий адрес электронной почты.");
      }
      const phone = phoneField?.value.replace(/\D/g, "");
      if (phoneField && !/^7[0-9]{10}$/.test(phone)) {
        return invalid(phoneField, "Введите 10 цифр номера после +7.");
      }
      if (!consentField.checked) return invalid(consentField, "Подтвердите согласие на обработку персональных данных.");

      button.disabled = true;
      button.textContent = "Отправляем…";
      try {
        const project = form.dataset.leadProject;
        const purpose = form.dataset.purpose || (emailField ? "Расчёт по лоту" : "Консультация");
        const body = new FormData(form);
        body.set("site", feedbackSite);
        body.set("form", "main");
        body.set("page", location.href);
        body.set("name", name);
        if (phoneField) body.set("phone", "+" + phone);
        if (emailField) body.set("email", email);
        body.set("project", project);
        body.set("message", purpose);
        body.set("consent_document", [...form.querySelectorAll("[data-consent-document]")].map(link => link.href).join(" "));
        const response = await fetch("https://feedback.nuts-agency.ru/api/submit/", {
          method: "POST",
          body,
          signal: AbortSignal.timeout(12000)
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error("Form submission failed");
        }
        const message = form.querySelector(".done p");
        message.textContent = emailField
          ? "Менеджер подготовит индивидуальный расчёт и пришлёт его на указанную почту."
          : "Менеджер свяжется с вами по указанному телефону.";
        form.reset();
        form.classList.add("sent");
        reachGoal(submitGoal);
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
  bindForm(original, original.dataset.submitGoal);

  document.querySelectorAll(".plan-link, .photo-link").forEach(link => {
    const viewer = document.createElement("dialog");
    viewer.className = "plan-dialog";
    const caption = link.dataset.imageCaption ||
      (link.textContent.includes("генплан") ? "Генплан комплекса" : "Карта расположения");
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
      const isEstimate = link.hasAttribute("data-estimate");
      form.dataset.purpose = purpose;
      const email = form.elements.namedItem("email");
      if (email && !isEstimate) {
        // Show and call requests only need a phone: drop the e-mail field and its consent.
        email.closest("label").remove();
        form.querySelector("[data-consent-email]")?.remove();
        form.querySelector("[data-consent-document]").href = "/files/consent-viewing.pdf";
      }
      form.querySelector("button[type=submit]").textContent = isEstimate ? "Запросить расчёт на почту" : "Отправить заявку";
      dialog.append(form);
      bindForm(form, isEstimate ? "estimate_popup_submit" : link.dataset.submitGoal);
      dialog.showModal();
      if (isEstimate) reachGoal("estimate_popup_open");
      form.elements.namedItem("name").focus();
    });
  });
})();
