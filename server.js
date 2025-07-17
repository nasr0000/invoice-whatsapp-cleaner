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

    // Логируем все поля
    console.log("📦 Все ключи в invoice:", Object.keys(invoice));

    // Ищем поле WhatsApp без учёта регистра
    const key = Object.keys(invoice).find(k =>
      k.toLowerCase() === WHATSAPP_FIELD.toLowerCase()
    );

    console.log("🔍 Найденный ключ:", key);

    const currentValue = key ? invoice[key] : null;
    console.log("📥 Значение поля:", currentValue);

    if (!currentValue) return res.send("❗ Поле WhatsApp пустое");

    // Извлекаем номер из ссылки
    const phoneMatch = currentValue.match(/(\d[\d\s+().-]+)/);
    if (!phoneMatch) return res.send("❗ В поле WhatsApp не найден номер");

    const cleanedPhone = phoneMatch[0].replace(/\D/g, "");
    const newLink = `https://wa.me/${cleanedPhone}`;
    console.log("🔗 Очищенная ссылка:", newLink);

    // 1. Очистка поля (на всякий случай)
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: {
        [WHATSAPP_FIELD]: ""
      }
    });

    // 2. Установка нового значения
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

// Пинг
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
