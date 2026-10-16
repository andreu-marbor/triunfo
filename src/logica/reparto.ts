/* logica/reparto.ts — genera semilla → baraja → reparte → verifica con el
   solver → entrega (PLAN §3, §9.4, §9.5). La cadena de intentos es
   determinista a partir de la semilla inicial: el modo diario (Fase 5)
   puede regenerar el mismo reparto para todo el mundo sin servidor. */

import { barajaEspanola, barajar, PALOS, type Palo } from './cartas';
import { estadoInicial, type Estado } from './motor';
import { PRESUPUESTO_NODOS, resolver } from './solver';

export interface Reparto {
  estado: Estado;
  semilla: number; // semilla del reparto entregado (reproducible)
  triunfo: Palo;
  intentos: number; // repartos descartados hasta dar con uno ganable
  nodos: number; // nodos del solver en la verificación
  verificado: boolean; // false solo si se agotaron los intentos o modo clásico
}

/** Semilla aleatoria para partidas libres (registrada para poder reproducir). */
export function semillaLibre(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
}

function repartir(semilla: number): Estado {
  const triunfo = PALOS[semilla % PALOS.length];
  return estadoInicial(barajar(barajaEspanola(), semilla), triunfo, semilla);
}

/** Reparto garantizado ganable: verifica cada candidato con el solver y
    avanza a la semilla siguiente si se rinde. Si tras `maxIntentos` sigue
    sin salir, entrega el último con `verificado: false` (nunca tira la
    partida por un fallo del solver). Con ~65 % de acierto por intento,
    10 intentos dejan la probabilidad de agote por debajo de 10⁻⁴ y
    acotan el peor caso de tiempo. */
export function repartoGanable(
  semilla: number,
  presupuesto = PRESUPUESTO_NODOS,
  maxIntentos = 10,
): Reparto {
  let ultimo: Reparto = {
    estado: repartir(semilla),
    semilla,
    triunfo: PALOS[semilla % PALOS.length],
    intentos: 1,
    nodos: 0,
    verificado: false,
  };

  for (let intento = 1; intento <= maxIntentos; intento++) {
    const s = (semilla + intento - 1) >>> 0;
    const estado = repartir(s);
    const solucion = resolver(estado, presupuesto);
    ultimo = {
      estado,
      semilla: s,
      triunfo: PALOS[s % PALOS.length],
      intentos: intento,
      nodos: solucion.nodos,
      verificado: solucion.resuelto,
    };
    if (solucion.resuelto) return ultimo;
  }

  return ultimo;
}

/** Modo clásico (§9.5): reparto aleatorio sin garantía, para nostálgicos.
    Nunca es el modo por defecto. */
export function repartoClasico(semilla: number): Reparto {
  return {
    estado: repartir(semilla),
    semilla,
    triunfo: PALOS[semilla % PALOS.length],
    intentos: 1,
    nodos: 0,
    verificado: false,
  };
}
