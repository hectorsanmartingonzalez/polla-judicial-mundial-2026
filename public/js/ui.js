/* Piezas de interfaz con efectos: avisos, timbrazo SVG, conteo del pozo, barra de guardado. */
import { clp } from "./util.js";

const reduceMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Avisos (aria-live) ---------- */
let toastT = null;
export function toast(msg, error = false) {
  const zona = document.getElementById("avisos");
  zona.innerHTML = "";
  const d = document.createElement("div");
  d.className = "toast" + (error ? " error" : "");
  d.textContent = msg;
  zona.appendChild(d);
  clearTimeout(toastT);
  toastT = setTimeout(() => d.remove(), 2800);
}

/* ---------- Timbrazo: sello SVG con texto curvo y textura de tinta ---------- */
export function timbrazo() {
  const fecha = new Date().toLocaleDateString("es-CL");
  const velo = document.createElement("div");
  velo.className = "velo";
  velo.innerHTML = `
  <div class="anillo-tinta"></div>
  <svg class="timbrazo" viewBox="0 0 260 260" role="img" aria-label="Predicción ingresada">
    <defs>
      <path id="curva-sup" d="M 130 130 m -88 0 a 88 88 0 1 1 176 0"/>
      <path id="curva-inf" d="M 130 130 m -88 0 a 88 88 0 1 0 176 0"/>
      <filter id="tinta-real" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" result="ruido"/>
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale="2.4"/>
      </filter>
    </defs>
    <g filter="url(#tinta-real)" fill="none" stroke="#3D2E8C">
      <circle cx="130" cy="130" r="118" stroke-width="5"/>
      <circle cx="130" cy="130" r="108" stroke-width="2.5"/>
      <circle cx="130" cy="130" r="72"  stroke-width="2.5"/>
      <line x1="70" y1="106" x2="190" y2="106" stroke-width="3"/>
      <line x1="70" y1="156" x2="190" y2="156" stroke-width="3"/>
    </g>
    <g filter="url(#tinta-real)" fill="#3D2E8C"
       font-family="'Courier Prime','Courier New',monospace" font-weight="700">
      <text font-size="16.5" letter-spacing="3.5">
        <textPath href="#curva-sup" startOffset="50%" text-anchor="middle">★ POLLA JUDICIAL ★</textPath>
      </text>
      <text font-size="16.5" letter-spacing="3.5">
        <textPath href="#curva-inf" startOffset="50%" text-anchor="middle">· MUNDIAL 2026 ·</textPath>
      </text>
      <text x="130" y="142" text-anchor="middle"
        font-family="'Archivo Black',sans-serif" font-size="29" letter-spacing="1">INGRESADA</text>
      <text x="130" y="180" text-anchor="middle" font-size="14" letter-spacing="2">${fecha}</text>
      <text x="130" y="96" text-anchor="middle" font-size="12" letter-spacing="2">ACTA DE PREDICCIÓN</text>
    </g>
  </svg>`;
  velo.addEventListener("click", () => velo.remove());
  document.body.appendChild(velo);
  if (!reduceMotion()) {
    document.body.classList.add("golpe");
    setTimeout(() => document.body.classList.remove("golpe"), 700);
    if (navigator.vibrate) navigator.vibrate(35);
  }
  setTimeout(() => { if (velo.parentNode) velo.remove(); }, 2400);
}

/* ---------- Conteo animado del pozo ---------- */
export function animaPozo(el, hasta) {
  if (reduceMotion()) { el.textContent = clp(hasta); return; }
  let t0 = null;
  const dur = 900;
  const paso = (t) => {
    if (!t0) t0 = t;
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = clp(Math.round(hasta * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/* ---------- Barra flotante "cambios sin guardar" ---------- */
let barra = null;
export function syncSavebar(mostrar, alGuardar) {
  if (mostrar && !barra) {
    barra = document.createElement("div");
    barra.className = "savebar";
    barra.innerHTML = `<span>Cambios sin guardar</span><button type="button">Guardar</button>`;
    barra.querySelector("button").addEventListener("click", alGuardar);
    document.body.appendChild(barra);
  } else if (!mostrar && barra) {
    barra.remove();
    barra = null;
  }
}

/* ---------- Esqueletos de carga ---------- */
export const skel = (alto, ancho = "100%", extra = "") =>
  `<div class="skel" style="height:${alto}px;width:${ancho};${extra}"></div>`;
