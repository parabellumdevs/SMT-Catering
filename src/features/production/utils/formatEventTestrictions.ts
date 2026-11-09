import type { EventRecord } from "@/types/domain";

/** Helper para formatear restricciones de forma singular o plural según corresponda */
export function formatEventRestrictions(event: EventRecord): string {
  const { dietary } = event;
  const parts: string[] = [];

  if (dietary.celiacos > 0) {
    parts.push(
      dietary.celiacos === 1 ? "1 celíaco" : `${dietary.celiacos} celíacos`,
    );
  }
  if (dietary.vegetarianos > 0) {
    parts.push(
      dietary.vegetarianos === 1
        ? "1 vegetariano"
        : `${dietary.vegetarianos} vegetarianos`,
    );
  }
  if (dietary.veganos > 0) {
    parts.push(
      dietary.veganos === 1 ? "1 vegano" : `${dietary.veganos} veganos`,
    );
  }
  if (dietary.hipertensos > 0) {
    parts.push(
      dietary.hipertensos === 1
        ? "1 hipertenso"
        : `${dietary.hipertensos} hipertensos`,
    );
  }
  if (dietary.alergias) {
    parts.push(`alergias: ${dietary.alergias}`);
  }
  if (event.kitchenNotes) {
    parts.push(event.kitchenNotes);
  }

  return parts.length > 0 ? parts.join(", ") : "Sin restricciones registradas";
}
