/* Estado de la aplicación (sin tocar el DOM). */
export const S = {
  view: "inicio",
  grupo: "A",
  users: [],
  results: {},
  meId: null,
  preds: {},          // copia editable de las predicciones propias
  dirty: false,
  cargando: true,
  errorRed: false,
  registrando: false,
  guardando: false,
  flash: null          // [matchId, lado] para animar el dígito recién cambiado
};

export const me = () => S.users.find((u) => u.id === S.meId) || null;

const LLAVE = "pj26_id";
export function cargarIdentidad() {
  try { S.meId = localStorage.getItem(LLAVE) || null; } catch (_) { S.meId = null; }
}
export function guardarIdentidad(id) {
  S.meId = id;
  try { localStorage.setItem(LLAVE, id); } catch (_) {}
}
export function limpiarIdentidad() {
  S.meId = null;
  try { localStorage.removeItem(LLAVE); } catch (_) {}
}
