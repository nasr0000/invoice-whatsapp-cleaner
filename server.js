const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";
const WHATSAPP_FIELD = "UF_CRM_SMART_INVOICE_1729361040";

app.get("/clean-invoice", async (req, res) => {
  const invoiceId = req.query.invoice_id;
  if (!invoiceId) return res.status(400).send("❌ Не передан invoice_id");

  try {
    const invoiceRes = await axios.post(`${WEBHOOK}crm.item.get`, {
      entityTypeId: 31,
      id: invoiceId
    });
    const invoice = invoiceRes.data?.result?.item;

    console.log("📦 Ответ Bitrix24 crm.item.get:", JSON.stringify(invoiceRes.data, null, 2));
    if (!invoice) return res.status(404).send("❌ Смарт-счёт не найден");

    let rawPhone = null;

    // 1. Ищем номер в TITLE
    const titleMatch = invoice.TITLE?.match(/(?:\+?\d[\d\s\-().]{6,})/);
    if (titleMatch) {
      rawPhone = titleMatch[0];
      console.log("📌 Телефон из TITLE:", rawPhone);
    }

    // 2. Если нет — из контакта
    if (!rawPhone && invoice.contactIds && invoice.contactIds.length > 0) {
      const contactId = invoice.contactIds[0];
      const contactRes = await axios.post(`${WEBHOOK}crm.contact.get`, {
        id: contactId
      });
      const contact = contactRes.data?.result;
      const phoneObj = contact?.PHONE?.find(p => typeof p.VALUE === "string");
      if (phoneObj) {
        rawPhone = phoneObj.VALUE;
        console.log("📌 Телефон из контакта:", rawPhone);
      }
    }

    if (!rawPhone) {
      return res.send("❗ Телефон не найден ни в TITLE, ни в Контакте");
    }

    const cleanedPhone = rawPhone.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanedPhone}`;

    // Шаг 1: Очистка поля
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: {
        [WHATSAPP_FIELD]: ""
      }
    });

    // Шаг 2: Установка новой ссылки
    await axios.post(`${WEBHOOK}crm.item.update`, {
      entityTypeId: 31,
      id: invoiceId,
      fields: {
        [WHATSAPP_FIELD]: whatsappLink
      }
    });

    res.send(`✅ Смарт-счёт обновлён: <a href="${whatsappLink}" target="_blank">${whatsappLink}</a>`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обработке смарт-счёта");
  }
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
