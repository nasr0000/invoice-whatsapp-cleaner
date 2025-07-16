const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";

app.get("/clean-invoice", async (req, res) => {
  const invoiceId = req.query.invoice_id;
  if (!invoiceId) return res.status(400).send("❌ Не передан invoice_id");

  try {
    // Получаем смарт-счёт
    const invoiceRes = await axios.post(`${WEBHOOK}crm.item.get`, {
      entityTypeId: 31,
      id: invoiceId
    });
    const invoice = invoiceRes.data?.result?.item;
    if (!invoice) return res.status(404).send("❌ Счёт не найден");

    const contactId = invoice.contactId;
    if (!contactId) return res.send("❗ Контакт не привязан к счёту");

    // Получаем контакт
    const contactRes = await axios.post(`${WEBHOOK}crm.contact.get`, {
      id: contactId
    });
    const contact = contactRes.data?.result;
    if (!contact?.PHONE?.length) return res.send("❗ У контакта нет телефона");

    const rawPhone = contact.PHONE.find(p => typeof p.VALUE === "string")?.VALUE;
    if (!rawPhone) return res.send("❗ Номер телефона пустой");

    const cleanedPhone = rawPhone.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanedPhone}`;

    // Обновляем поле WhatsApp в счёте
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: {
        UF_CRM_SMART_INVOICE_1729361040: whatsappLink
      }
    });

    res.send(`${whatsappLink}`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обновлении счёта");
  }
});

// Проверка сервера
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
