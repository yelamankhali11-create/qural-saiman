/* Qural Saiman — общий модуль: настройки, каталог, API, договор.
   Используется index.html (клиент) и admin.html (ответственный). */

const QS = {
  // URL веб-приложения Apps Script (…/exec). Пусто = демо-режим (заказы хранятся в браузере).
  API_URL: "https://script.google.com/macros/s/AKfycbxzRP0Nqoo18av7ZNSe4Wg6Y-H2hx0bq6_D44AYVMXCGfOUyBJTw_ijVcKkDApxY_8g/exec",
  PHONE: "77788744507",                 // номер для WhatsApp и звонков: 77XXXXXXXXX
  KASPI_PHONE: "8 778 874 45 07",       // номер для Kaspi-перевода (как показывать клиенту)
  COMPANY: "Qural Saiman",
  BRANCHES: { krg: "Караганда", saran: "Сарань, ул. Абая, 27, 8-й подъезд" },
};

/* Каталог: id → [название, цена/сутки, категория, иконка, хит]. Тот же список в apps-script/Code.gs */
const CATALOG = {
  t1:["Шуруповёрт",3000,"drill","🔩"], t2:["Перфоратор",3500,"drill","🛠️",1], t3:["Перфоратор большой",4000,"drill","🛠️"],
  t4:["Дрель",3000,"drill","🔩"], t5:["Отбойный молоток",5000,"drill","⛏️"],
  t6:["Торцовочная пила",5500,"cut","🪚",1], t7:["Штроборез",5000,"cut","⚙️"], t8:["Болгарка 125 мм",3000,"cut","💿"],
  t9:["Болгарка 230 мм",3500,"cut","💿"], t10:["Электролобзик",3000,"cut","🪚"], t11:["Ручной фрезер",3500,"cut","⚙️"],
  t12:["Шлифовальная машина «Жираф»",6000,"finish","🦒",1], t13:["Безвоздушный краскопульт",10000,"finish","🎨",1],
  t14:["Строительный фен",3000,"finish","🔥"], t15:["Лазерный уровень",3000,"finish","📐"],
  t16:["Сварочный аппарат",4500,"other","⚡"], t17:["Строительный пылесос",4500,"other","🌀",1],
  t18:["Тачка-тележка",4000,"other","🛒"], t19:["Удлинитель на катушке 50 м",3500,"other","🔌"], t20:["Вышка-тура 5 м",6000,"other","🏗️",1],
};
/* Комбо: id → [название, обычная цена, цена комбо] */
const COMBOS = {
  c1:["Торцовочная пила + Пылесос",10500,9450], c2:["Жираф + Пылесос",12000,10800],
  c3:["Перфоратор + Пылесос",8500,7650], c4:["Штроборез + Пылесос",9500,8550],
  c5:["Перфоратор + Шуруповёрт",6500,5850], c6:["Лобзик + Пылесос",6000,5400],
  c7:["Отбойный молоток + Тачка-тележка",9000,8100],
};
/* из чего состоит комбо (для учёта склада) */
const COMBO_PARTS = { c1:["t6","t17"], c2:["t12","t17"], c3:["t2","t17"], c4:["t7","t17"], c5:["t2","t1"], c6:["t10","t17"], c7:["t5","t18"] };
const itemName = id => (CATALOG[id]||COMBOS[id]||["?"])[0];
const itemPrice = id => CATALOG[id] ? CATALOG[id][1] : COMBOS[id] ? COMBOS[id][2] : 0;

const fmt = n => Math.round(n).toLocaleString("ru-RU").replace(/\s/g, " ") + " ₸";
const waLink = m => `https://wa.me/${QS.PHONE}?text=${encodeURIComponent(m)}`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const fmtDate = d => { d = new Date(d); return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* Проверка ИИН Казахстана (12 цифр + контрольная сумма) */
function validIIN(iin) {
  if (!/^\d{12}$/.test(iin)) return false;
  const d = iin.split("").map(Number);
  const m = +iin.slice(2, 4), day = +iin.slice(4, 6);
  if (m < 1 || m > 12 || day < 1 || day > 31) return false;
  const w1 = [1,2,3,4,5,6,7,8,9,10,11], w2 = [3,4,5,6,7,8,9,10,11,1,2];
  let c = w1.reduce((s, w, i) => s + w * d[i], 0) % 11;
  if (c === 10) { c = w2.reduce((s, w, i) => s + w * d[i], 0) % 11; if (c === 10) return false; }
  return c === d[11];
}
const normPhone = p => { let s = String(p).replace(/\D/g, ""); if (s.length === 11 && s[0] === "8") s = "7" + s.slice(1); if (s.length === 10) s = "7" + s; return s; };

/* Текст договора (тот же формируется на сервере) */
function contractText(o) {
  const lines = o.items.map(id => `— ${itemName(id)}: ${fmt(itemPrice(id))}/сутки`).join("\n");
  return `ДОГОВОР АРЕНДЫ ИНСТРУМЕНТА${o.id ? " № " + o.id : ""}

Арендодатель: ${QS.COMPANY}, г. Караганда.
Арендатор: ${o.name || "________________"}, ИИН ${o.iin || "____________"}, тел. +${o.phone || "___________"}.

1. Арендодатель передаёт, а Арендатор принимает во временное пользование инструмент:
${lines}

2. Срок аренды: с ${o.start ? fmtDate(o.start) : "___"} по ${o.end ? fmtDate(o.end) : "___"} (${o.days} сут.).
3. Стоимость аренды: ${fmt(o.total)}. Оплата 100% переводом Kaspi до передачи инструмента либо наличными при получении.
4. Арендатор подтверждает, что получает инструмент в исправном состоянии и полной комплектации.
5. Арендатор обязуется вернуть инструмент в срок, в том же исправном состоянии и полной комплектации, с учётом нормального износа.
6. При повреждении, поломке или утрате инструмента по вине Арендатора он возмещает стоимость ремонта или рыночную стоимость инструмента.
7. За каждые сутки просрочки возврата оплачивается суточный тариф.
8. Арендатор не вправе передавать инструмент третьим лицам.
9. Договор подписан Арендатором простой электронной подписью — одноразовым SMS-кодом, отправленным на его номер телефона.`;
}

/* Чек → {mime, name, data(base64)}; фото сжимаются до 1600px JPEG */
async function receiptPayload(f) {
  if (!f) throw new Error("Выберите файл");
  if (f.type === "application/pdf") {
    if (f.size > 5e6) throw new Error("PDF больше 5 МБ");
    const b = new Uint8Array(await f.arrayBuffer()); let s = "";
    for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
    return { mime: "application/pdf", name: f.name, data: btoa(s) };
  }
  if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|heic)$/i.test(f.name)) throw new Error("Нужно фото или PDF чека");
  const img = await createImageBitmap(f).catch(() => null);
  if (!img) throw new Error("Не удалось открыть фото, сделайте скриншот чека");
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return { mime: "image/jpeg", name: "check.jpg", data: c.toDataURL("image/jpeg", 0.82).split(",")[1] };
}

/* ===== API ===== */
async function api(action, data = {}) {
  if (!QS.API_URL) return demoApi(action, data);
  const r = await fetch(QS.API_URL, { method: "POST", body: JSON.stringify({ action, ...data }) });
  return r.json();
}

/* Демо-бэкенд в localStorage — чтобы всё работало до подключения Google Sheet */
function demoApi(action, d) {
  const load = () => { try { return JSON.parse(localStorage.getItem("qs_orders") || "[]"); } catch { return []; } };
  const save = a => { try { localStorage.setItem("qs_orders", JSON.stringify(a)); } catch {} };
  const ok = x => Promise.resolve({ ok: true, ...x });
  const err = e => Promise.resolve({ ok: false, error: e });
  if (action === "sendCode") {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    try { sessionStorage.setItem("qs_code_" + normPhone(d.phone), code); } catch {}
    return ok({ demo: true, code });
  }
  if (action === "createOrder") {
    let code; try { code = sessionStorage.getItem("qs_code_" + normPhone(d.phone)); } catch {}
    if (!code || code !== String(d.code)) return err("Неверный SMS-код");
    if (!validIIN(d.iin)) return err("Неверный ИИН");
    const a = load();
    const id = String(1000 + a.length + 1);
    const total = d.items.reduce((s, i) => s + itemPrice(i), 0) * d.days;
    const end = new Date(new Date(d.start).getTime() + d.days * 864e5).toISOString();
    const o = { id, created: new Date().toISOString(), status: "new", pay: "unpaid", name: d.name, iin: d.iin, phone: normPhone(d.phone),
      items: d.items, days: d.days, start: d.start, end, mode: d.mode, address: d.address, comment: d.comment || "", total, signedAt: new Date().toISOString() };
    o.contract = contractText(o);
    o.token = Math.random().toString(36).slice(2);
    a.push(o); save(a);
    return ok({ order: o });
  }
  if (action === "uploadReceipt") {
    const a = load(); const o = a.find(x => x.id === d.id && x.token === d.token); if (!o) return err("Заказ не найден");
    try { localStorage.setItem("qs_rcpt_" + o.id, JSON.stringify({ mime: d.mime, data: d.data })); } catch { return err("Файл слишком большой для демо-режима"); }
    o.receipt = "local"; if (o.pay === "unpaid") o.pay = "client_paid"; save(a); return ok({ order: { id: o.id, pay: o.pay } });
  }
  if (action === "payCash") {
    const a = load(); const o = a.find(x => x.id === d.id && x.token === d.token); if (!o) return err("Заказ не найден");
    if (o.pay !== "paid") o.pay = "cash"; save(a); return ok({ order: { id: o.id, pay: o.pay } });
  }
  if (action === "receipt") {
    if (d.key !== "demo") return err("Неверный ключ");
    try { const r = JSON.parse(localStorage.getItem("qs_rcpt_" + d.id)); if (r) return ok(r); } catch {}
    return err("Чек не найден");
  }
  if (action === "list") { if (d.key !== "demo") return err("Неверный ключ"); return ok({ orders: load().reverse() }); }
  if (action === "update") {
    if (d.key !== "demo") return err("Неверный ключ");
    const a = load(); const o = a.find(x => x.id === d.id); if (!o) return err("Заказ не найден");
    ["pay", "status"].forEach(k => { if (d[k]) o[k] = d[k]; }); save(a); return ok({ order: o });
  }
  return err("Неизвестное действие");
}
