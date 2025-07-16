const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// 🔑 Замените на свой вебхук Bitrix24
const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";

// 💬 Очистка и обновление WhatsApp-ссылки в смарт-счете
app.get("/clean-whatsapp-field", async (req, res) => {
  const invoiceId = req.query.invoice_id;
  if (!invoiceId) return res.status(400).send("❌ Не передан invoice_id");

  try {
    // 1. Получаем смарт-счёт
    const invoiceRes = await axios.post(`${WEBHOOK}crm.item.get`, {
      entityTypeId: 31,
      id: invoiceId,
    });

    const invoice = invoiceRes.data?.result?.item;
    if (!invoice) return res.status(404).send("❌ Счёт не найден");

    const originalValue = invoice.UF_CRM_SMART_INVOICE_1729361040;
    if (!originalValue) return res.send("❗ Поле WhatsApp пустое");

    console.log("📦 Исходное значение:", originalValue);

    // 2. Очищаем номер телефона от всего, кроме цифр
    const cleanedPhone = originalValue.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanedPhone}`;

    // 3. Обновляем поле в смарт-счёте
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: {
        "UF_CRM_SMART_INVOICE_1729361040": whatsappLink,
      },
    });

    res.send(`✅ Обновлено: <a href="${whatsappLink}" target="_blank">${whatsappLink}</a>`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обработке");
  }
});

// Пинг
app.get("/ping", (req, res) => res.send("pong"));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
