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
    // Получаем смарт-счёт
    const invoiceRes = await axios.post(`${WEBHOOK}crm.item.get`, {
      entityTypeId: 31,
      id: invoiceId
    });
    const invoice = invoiceRes.data?.result?.item;
    if (!invoice) return res.status(404).send("❌ Смарт-счёт не найден");

    const currentValue = invoice[WHATSAPP_FIELD];
    if (!currentValue) return res.send("❗ Поле WhatsApp пустое");

    const phoneMatch = currentValue.match(/(\d[\d\s+().-]+)/);
    if (!phoneMatch) return res.send("❗ В поле WhatsApp не найден номер");

    const cleanedPhone = phoneMatch[0].replace(/\D/g, "");
    const newLink = `https://wa.me/${cleanedPhone}`;

    // 1. Очистка (для надёжности)
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: {
        [WHATSAPP_FIELD]: ""
      }
    });

    // 2. Установка очищенного значения
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: {
        [WHATSAPP_FIELD]: newLink
      }
    });

    res.send(`✅ WhatsApp очищен: <a href="${newLink}" target="_blank">${newLink}</a>`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при очистке поля WhatsApp");
  }
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
