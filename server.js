const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";
const WHATSAPP_FIELD = "UF_CRM_SMART_INVOICE_1729361040";

app.get("/clean-wa-field", async (req, res) => {
  const invoiceId = req.query.invoice_id;
  if (!invoiceId) return res.status(400).send("❌ Не передан invoice_id");

  try {
    const invoiceRes = await axios.post(`${WEBHOOK}crm.item.get`, {
      entityTypeId: 31,
      id: invoiceId
    });
    const invoice = invoiceRes.data?.result?.item;
    if (!invoice) return res.status(404).send("❌ Смарт-счёт не найден");

    console.log("📦 Ключи:", Object.keys(invoice));

    // Ищем ключ без учёта регистра и подчёркиваний
    const normalize = str => str.toLowerCase().replace(/_/g, "");
    const targetKey = Object.keys(invoice).find(k =>
      normalize(k) === normalize(WHATSAPP_FIELD)
    );

    console.log("🔍 Найденный ключ:", targetKey);
    const currentValue = targetKey ? invoice[targetKey] : null;
    console.log("📥 Текущее значение:", currentValue);

    if (!currentValue) return res.send("❗ Поле WhatsApp пустое");

    // Извлекаем номер
    const phoneMatch = currentValue.match(/(\d[\d\s+().-]+)/);
    if (!phoneMatch) return res.send("❗ В поле WhatsApp не найден номер");

    const cleanedPhone = phoneMatch[0].replace(/\D/g, "");
    const newLink = `https://wa.me/${cleanedPhone}`;
    console.log("🔗 Новая ссылка:", newLink);

    // Очистка
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: { [targetKey]: "" }
    });

    // Установка нового значения
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: { [targetKey]: newLink }
    });

    res.send(`✅ WhatsApp обновлён: <a href="${newLink}" target="_blank">${newLink}</a>`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обновлении поля WhatsApp");
  }
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
