/* pruebas/ayudante.ts — mini-ayudante de aserciones (sin frameworks, patrón
   del proyecto: esbuild + node). Uso: comprobar(condición, mensaje) dentro
   de un fichero de pruebas y finalizar() al final; sale con código 1 si algo
   ha fallado. Cada fichero de pruebas se empaqueta por separado, así que
   cada uno tiene su propio contador. */

let fallos = 0;
let total = 0;

/** Imprime el encabezado de un grupo de comprobaciones. */
export function grupo(titulo: string): void {
  console.log(`\n${titulo}:`);
}

/** Comprueba una condición e imprime ✅/❌. */
export function comprobar(condicion: boolean, mensaje: string): void {
  total++;
  if (condicion) {
    console.log(`  ✅ ${mensaje}`);
  } else {
    fallos++;
    console.error(`  ❌ ${mensaje}`);
  }
}

/** Resumen final; termina el proceso con error si algo ha fallado. */
export function finalizar(): void {
  console.log('');
  if (fallos === 0) {
    console.log(`TODAS LAS PRUEBAS PASAN ✅ (${total} comprobaciones)`);
  } else {
    console.error(`${fallos} de ${total} comprobaciones fallan ❌`);
    process.exit(1);
  }
}
