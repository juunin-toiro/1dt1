// Praefixiert einen public/-Pfad mit der aktuellen Vite-Base (import.meta.env.BASE_URL).
// Noetig, weil GitHub Pages als Project-Page unter einem Unterpfad
// (https://<user>.github.io/<repo>/) laeuft, waehrend public/-Assets in Vite
// standardmaessig als root-absolute Pfade referenziert werden. Ohne dieses
// Praefix wuerden /audio/..., /icons/... und /story/... unter dem
// Unterpfad-Deployment ins Leere zeigen (404), funktionieren lokal im Dev-
// Server aber trotzdem, da BASE_URL dort "/" ist - deshalb faellt das beim
// blossen `npm run dev` nicht auf.
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  return base + path.replace(/^\//, '')
}
