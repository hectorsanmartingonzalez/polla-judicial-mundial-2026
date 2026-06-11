/* Orquestador: render, eventos, acciones y temporizadores. */
import { GROUPS } from "./datos.js";
import { S, me, cargarIdentidad, guardarIdentidad, limpiarIdentidad } from "./estado.js";
import { apiOk, apiGet, apiPost } from "./api.js";
import { esc, copia } from "./util.js";
import { toast, timbrazo, animaPozo, syncSavebar } from "./ui.js";
import { vInicio, vPred, vTabla, vConfig, vError, cuerpoCorreo, urlCorreo } from "./vistas.js";

const $ = (id) => document.getElementById(id);
const TABS = [["inicio", "📜", "Bases"], ["pred", "✍️", "Predicción"], ["tabla", "🏆", "Tabla"]];
const PIN_RE = /^[0-9]{4}$/;

/* ============================================================
   Render
   ============================================================ */
function render() {
  const yo = me();
  $("cab-sub").innerHTML =
    "Tribunal de la Pelota · 48 selecciones · 72 partidos de grupos" +
    (yo ? ` · <b>${esc(yo.nombre)} ${esc(yo.apellido[0])}.</b> <a data-act="salir">cambiar</a>` : "");

  $("tabs").innerHTML = TABS.map(([v, ico, txt]) =>
    `<button type="button" class="tab${S.view === v ? " activo" : ""}" data-act="tab" data-v="${v}">
      <span class="ico">${ico}</span>${txt}</button>`).join("");

  const main = $("main");
  if (!apiOk()) { main.innerHTML = vConfig(); return; }
  if (S.errorRed && !S.users.length) { main.innerHTML = vError(); return; }

  main.innerHTML = S.view === "inicio" ? vInicio() : S.view === "pred" ? vPred() : vTabla();
  S.flash = null;

  if (S.view === "tabla" && !S.cargando) {
    const el = $("pozo-monto");
    if (el) animaPozo(el, Number(el.getAttribute("data-to") || 0));
  }
  if (S.pidiendoPin) { const p = $("pin-in"); if (p) p.focus(); }
  syncSavebar(S.dirty && S.view === "pred" && !S.guardando && !!yo, () => guardar(false));
}

/* ============================================================
   Datos
   ============================================================ */
async function cargar(silencioso = false) {
  if (!silencioso) { S.cargando = true; render(); }
  try {
    const d = await apiGet();
    if (!d || !d.ok) throw new Error("respuesta");
    S.users = d.users || [];
    S.results = d.results || {};
    S.errorRed = false;
    const yo = me();
    if (yo && !S.dirty) S.preds = copia(yo.preds);
    if (S.meId && !yo) limpiarIdentidad();
    /* Sesión antigua sin PIN (versión anterior de la app): pedirlo una vez */
    if (yo && !S.pin) {
      S.pidiendoPin = yo.id;
      S.view = "inicio";
    }
  } catch (_) {
    S.errorRed = true;
    if (silencioso) toast("Sin conexión: mostrando datos previos", true);
  }
  S.cargando = false;
  render();
}

async function guardar(firmar) {
  const yo = me();
  if (!yo || S.guardando) return;
  if (!S.pin) { pedirPin_(yo.id, "Ingresa tu PIN para guardar"); return; }
  S.guardando = true; render();
  try {
    const d = await apiPost({ action: "save_preds", id: yo.id, pin: S.pin, preds: S.preds, firmar: !!firmar });
    S.guardando = false;
    if (!d || !d.ok) {
      if (d && /PIN incorrecto/.test(d.error || "")) {
        S.pin = null;
        try { localStorage.removeItem("pj26_pin"); } catch (_) {}
        pedirPin_(yo.id, "El PIN no coincide. Inténtalo de nuevo");
        return;
      }
      toast(d && d.error ? d.error : "No se pudo guardar", true); render(); return;
    }
    const i = S.users.findIndex((u) => u.id === d.user.id);
    if (i >= 0) S.users[i] = d.user;
    S.preds = copia(d.user.preds);
    S.dirty = false;
    render();
    if (firmar) timbrazo(); else toast("Avance guardado en el acta ✓");
  } catch (_) {
    S.guardando = false;
    toast("Error de conexión al guardar", true);
    render();
  }
}

function pedirPin_(id, msj) {
  S.pidiendoPin = id;
  S.view = "inicio";
  render();
  if (msj) toast(msj, true);
}

async function entrarConPin() {
  const pin = (($("pin-in") || {}).value || "").trim();
  if (!PIN_RE.test(pin)) { toast("El PIN debe ser de 4 dígitos", true); return; }
  const id = S.pidiendoPin;
  S.guardando = true; render();
  try {
    const d = await apiPost({ action: "login", id, pin });
    S.guardando = false;
    if (!d || !d.ok) { toast(d && d.error ? d.error : "No se pudo entrar", true); render(); return; }
    guardarIdentidad(id, pin);
    S.pidiendoPin = null;
    const i = S.users.findIndex((u) => u.id === d.user.id);
    if (i >= 0) S.users[i] = d.user; else S.users.push(d.user);
    S.preds = copia(d.user.preds);
    S.dirty = false;
    S.view = "pred";
    render();
    toast(`Bienvenido, ${d.user.nombre} ✓`);
  } catch (_) {
    S.guardando = false;
    toast("Error de conexión", true);
    render();
  }
}

async function registrar() {
  const n = ($("reg-n") || {}).value || "";
  const a = ($("reg-a") || {}).value || "";
  const pin = (($("reg-p") || {}).value || "").trim();
  if (!n.trim() || !a.trim()) { toast("Ingresa nombre y apellido", true); return; }
  if (!PIN_RE.test(pin)) { toast("Crea un PIN de 4 dígitos", true); return; }
  S.guardando = true; render();
  try {
    const d = await apiPost({ action: "register", nombre: n.trim(), apellido: a.trim(), pin });
    S.guardando = false;
    if (!d || !d.ok) { toast(d && d.error ? d.error : "No se pudo inscribir", true); render(); return; }
    S.users.push(d.user);
    guardarIdentidad(d.user.id, pin);
    S.preds = {}; S.dirty = false; S.registrando = false; S.pidiendoPin = null;
    S.view = "pred"; S.grupo = "A";
    render();
    toast("Inscripción ingresada al expediente ✓");
  } catch (_) {
    S.guardando = false;
    toast("Error de conexión", true);
    render();
  }
}

/* ============================================================
   Eventos (delegación)
   ============================================================ */
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const act = b.getAttribute("data-act");

  if (act === "tab") {
    S.view = b.getAttribute("data-v");
    render();
    if (S.view === "tabla") cargar(true);
  }
  else if (act === "reg-on") { S.registrando = true; S.pidiendoPin = null; render(); const n = $("reg-n"); if (n) n.focus(); }
  else if (act === "reg-off") { S.registrando = false; render(); }
  else if (act === "registrar") registrar();
  else if (act === "soy") {
    const id = b.getAttribute("data-id");
    /* Sesión propia ya validada en este dispositivo: entra directo */
    if (S.meId === id && S.pin) {
      const yo = me();
      S.preds = copia(yo ? yo.preds : {});
      S.dirty = false; S.view = "pred"; render();
      return;
    }
    S.registrando = false;
    pedirPin_(id, null);
  }
  else if (act === "pin-volver") { S.pidiendoPin = null; render(); }
  else if (act === "pin-entrar") entrarConPin();
  else if (act === "salir") {
    limpiarIdentidad();
    S.preds = {}; S.dirty = false; S.pidiendoPin = null; S.view = "inicio";
    render();
  }
  else if (act === "grupo") {
    const g = b.getAttribute("data-g");
    if (!g) return;
    S.grupo = g;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (act === "step") {
    const mid = b.getAttribute("data-m");
    const s = +b.getAttribute("data-s");
    const d = +b.getAttribute("data-d");
    const p = S.preds[mid] || [null, null];
    let v = p[s];
    v = v == null ? (d > 0 ? 0 : null) : Math.min(9, Math.max(0, v + d));
    if (v === null) return;
    const nuevo = [p[0], p[1]];
    nuevo[s] = v;
    S.preds[mid] = nuevo;
    S.dirty = true;
    S.flash = [mid, s];
    render();
  }
  else if (act === "guardar") guardar(false);
  else if (act === "firmar") guardar(true);
  else if (act === "copiar") {
    const txt = cuerpoCorreo();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        () => toast("Respaldo copiado ✓"),
        () => toast("No se pudo copiar", true));
    } else toast("No se pudo copiar en este navegador", true);
  }
  else if (act === "correo") { location.href = urlCorreo(); }
  else if (act === "refresh" || act === "reload") cargar(false);
});

/* Enter envía los formularios */
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter") return;
  if (S.registrando && ["reg-n", "reg-a", "reg-p"].includes(ev.target.id)) {
    ev.preventDefault(); registrar();
  } else if (S.pidiendoPin && ev.target.id === "pin-in") {
    ev.preventDefault(); entrarConPin();
  }
});

/* ============================================================
   Temporizadores: cuentas regresivas y tabla en vivo
   ============================================================ */
setInterval(() => {
  if (document.visibilityState !== "visible") return;
  if (S.view === "pred" && !S.guardando && !S.registrando && !S.pidiendoPin) render();
}, 30000);

setInterval(() => {
  if (document.visibilityState !== "visible") return;
  if (S.view === "tabla" && !S.cargando) cargar(true);
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && apiOk() && !S.cargando) cargar(true);
});

/* ============================================================
   Arranque
   ============================================================ */
cargarIdentidad();
render();
if (apiOk()) cargar(false);
