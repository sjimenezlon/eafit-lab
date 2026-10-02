import type { Metadata } from "next";
import VisorCliente from "@/components/VisorCliente";
import { CIFRAS, FICHA, MEDIDO, F } from "@/data/bloque20";

export const metadata: Metadata = {
  title: "Bloque 20 · Eafit-Lab",
  description:
    "El Edificio de Ciencias de EAFIT reconstruido en Blender a partir del catastro de Medellín, la ficha oficial de la universidad y los datos del fabricante de sus aisladores sísmicos.",
};

const Fuente = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline decoration-white/25 underline-offset-2 hover:decoration-white">{children}</a>
);

function Lamina({ src, alt, titulo, children, invertir = false }: { src: string; alt: string; titulo: string; children: React.ReactNode; invertir?: boolean }) {
  return (
    <section className={`grid items-center gap-8 ${invertir ? "md:grid-cols-[1fr_1.55fr] md:[&>figure]:order-2" : "md:grid-cols-[1.55fr_1fr]"}`}>
      <figure className="overflow-hidden rounded-[18px] bg-[#e6e3dc]">
        <img src={src} alt={alt} loading="lazy" className="h-auto w-full" width={1800} height={1100} />
      </figure>
      <div>
        <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-white">{titulo}</h2>
        <div className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-white/70">{children}</div>
      </div>
    </section>
  );
}

const Muestra = ({ c, t }: { c: string; t: string }) => (
  <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-[3px] ring-1 ring-white/30" style={{ background: c }} />{t}</span>
);

const TIPO = { dato: ["Dato", "bg-azure text-zafre"], estimado: ["Estimado", "bg-white/15 text-white"], ilustrativo: ["Ilustrativo", "bg-white/5 text-white/60 ring-1 ring-white/15"] } as const;

export default function Bloque20() {
  return (
    <main className="min-h-screen bg-[#12151c] text-white">
      {/* encabezado */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#12151c]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-5 py-3.5">
          <a href="/?intro=0" className="flex items-center gap-3" aria-label="Volver a la maqueta del campus">
            <img src="/img/eafit-blanco.svg" alt="Universidad EAFIT" className="h-6 w-auto" />
            <span className="h-5 w-px bg-white/25" />
            <span className="text-[15px] font-semibold tracking-tight">Lab</span>
          </a>
          <a href="/?intro=0" className="rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-medium text-white/80 hover:bg-white/20 hover:text-white">← Volver al campus</a>
        </div>
      </header>

      {/* portada */}
      <section className="mx-auto max-w-[1180px] px-5 pt-10 max-sm:pt-6">
        <p className="etq !text-azure">Capítulo · Bloque 20</p>
        <h1 className="mt-2 max-w-[900px] text-[52px] font-semibold leading-[1.02] tracking-[-0.03em] max-md:text-[38px]">
          El Edificio de Ciencias, pieza por pieza.
        </h1>
        <p className="mt-4 max-w-[680px] text-[16px] leading-relaxed text-white/65">
          La sede de la Escuela de Ciencias Aplicadas e Ingeniería, reconstruida en Blender con el catastro de Medellín, la ficha de EAFIT
          y los datos del fabricante de sus aisladores. Está aislado sísmicamente, algo poco común en Colombia.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-[1180px] px-5">
        <figure className="overflow-hidden rounded-[22px] bg-[#e6e3dc]">
          <img src="/bloque20/aerea.webp" alt="Render aéreo del Bloque 20 desde el nororiente: un volumen de ocho pisos envuelto por un exoesqueleto de acero con cruces en X y una cubierta de paneles solares, entre los árboles del campus y con el río Medellín al fondo" className="h-auto w-full" width={1800} height={1100} />
        </figure>
        <p className="mt-2 text-[11px] text-white/40">Desde el nororiente, en el ángulo de la <Fuente href={F.poblado}>foto aérea publicada en 2023</Fuente>. Render en Cycles.</p>
        <dl className="mt-6 grid grid-cols-6 gap-4 max-md:grid-cols-3 max-sm:grid-cols-2">
          {CIFRAS.map((c) => (
            <div key={c.k} className="border-t border-white/10 pt-3">
              <dd className="num text-[30px] font-light leading-none tracking-tight">{c.v}</dd>
              <dt className="mt-1.5 text-[12px] text-white/50"><Fuente href={c.f}>{c.k}</Fuente></dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto mt-20 max-w-[1180px] space-y-20 px-5">
        {/* visor */}
        <section>
          <div className="grid gap-4 md:grid-cols-[1fr_1.4fr] md:items-end">
            <h2 className="text-[34px] font-semibold leading-tight tracking-tight max-sm:text-[28px]">Explórelo</h2>
            <p className="text-[14.5px] leading-relaxed text-white/70">
              El mismo modelo de Blender, en el navegador. Córtelo piso por piso para ver los tres anillos, despiécelo, levántelo sobre sus
              aisladores o enciéndalo de noche. Toque cualquier pieza para saber qué es y si es un dato o una estimación.
            </p>
          </div>
          <div className="mt-6 aspect-[16/9] w-full max-md:aspect-[4/5]">
            <VisorCliente />
          </div>
        </section>

        <Lamina src="/bloque20/despiece.webp" alt="Despiece del Bloque 20: los ocho pisos separados en el aire, cada uno con su losa, el núcleo celeste de laboratorios y los muros azules de oficinas; abajo, los aisladores y arriba la cubierta solar" titulo="Pieza por pieza">
          <p>
            Los ocho pisos separados, de los aisladores a la cubierta solar. En cada planta se repite el mismo orden: laboratorios al centro,
            pasillo alrededor y oficinas contra la fachada.
          </p>
          <p>
            Ocho pisos sobre una huella de 1.643 m² dan unos 13.100 m², entre los{" "}
            <Fuente href={F.eafit2023}>12.500</Fuente> y los <Fuente href={F.semana}>13.600 m²</Fuente> que ha publicado EAFIT.
          </p>
        </Lamina>

        <Lamina src="/bloque20/corte.webp" alt="Corte del Bloque 20 a la altura del sexto piso: un núcleo celeste de laboratorios, un pasillo blanco alrededor y un anillo exterior de oficinas en azul oscuro" titulo="Tres anillos">
          <p>
            Se quitan los tres pisos de arriba para ver una planta tipo. EAFIT describió el edificio en 2018 como{" "}
            <Fuente href={F.eafit2018}>«un bloque central que es donde se ubicarán los laboratorios, un pasillo circular que le da la vuelta al edificio y otro espacio que rodea ese pasillo»</Fuente>{" "}
            con oficinas de profesores, baños, servicios y salas.
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            <Muestra c="#00A9E0" t="Laboratorios" /><Muestra c="#f2f2f0" t="Pasillo perimetral" /><Muestra c="#000066" t="Oficinas y servicios" />
          </p>
          <p>
            Los anillos dejan que el aire circule entre la fachada y el centro. Según <Fuente href={F.poblado}>Vivir en El Poblado</Fuente>, por eso
            ningún piso necesita aire acondicionado. EAFIT calcula un ahorro del 18 % en energía y del 67 % en agua potable.
          </p>
        </Lamina>

        <Lamina invertir src="/bloque20/aisladores.webp" alt="El Bloque 20 levantado siete metros sobre su foso para dejar ver doce aisladores sísmicos azules sobre pedestales de concreto" titulo="Un edificio que no toca el suelo">
          <p>
            El edificio se levanta siete metros para que se vea lo que lo sostiene: <Fuente href={F.mageba}>12 apoyos LASTO-LRB de mageba</Fuente>,
            de caucho con núcleo de plomo, que cargan 25.000 kN y dejan correr ±200 mm.
          </p>
          <p>
            Cuando tiembla, el terreno se mueve y el edificio, montado sobre los apoyos, casi no. Para eso un foso le deja holgura alrededor.
          </p>
          <p className="text-[12px] text-white/45">La posición exacta de los apoyos no es pública; aquí van en una retícula de 3 × 4.</p>
        </Lamina>

        <Lamina src="/bloque20/noche.webp" alt="El Bloque 20 de noche, con los pisos de laboratorios encendidos detrás del exoesqueleto oscuro y los árboles del campus en primer plano" titulo="De noche" invertir>
          <p>
            Con los laboratorios encendidos, el exoesqueleto se lee como una jaula delante del vidrio. Vista desde el nororiente, sobre los
            árboles del campus.
          </p>
          <video className="w-full rounded-[14px] bg-[#e6e3dc]" src="/bloque20/giro.mp4" poster="/bloque20/giro.jpg" autoPlay muted loop playsInline aria-label="Video: vuelta completa alrededor del Bloque 20 de día" />
          <p className="text-[11px] text-white/40">De día, una vuelta completa en EEVEE · 8 s.</p>
        </Lamina>

        <Lamina src="/bloque20/peaton.webp" alt="Vista desde el nivel de la calle mirando hacia arriba la fachada sur del Bloque 20, con su exoesqueleto de acero" titulo="Desde la calle">
          <p>
            A la altura de los ojos, desde el sur, con personas a escala. En el modelo, el exoesqueleto queda dos metros por fuera de la fachada y se amarra
            a cada losa; detrás van las lamas verticales grises que se ven en la foto.
          </p>
          <p>
            Sobre la cubierta, una pérgola de acero lleva los paneles solares que se ven en la{" "}
            <Fuente href={F.poblado}>foto aérea publicada en 2023</Fuente>.
          </p>
        </Lamina>

        {/* ficha */}
        <section className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight">Ficha</h2>
            <dl className="mt-5">
              {FICHA.map((r) => (
                <div key={r.k} className="flex items-baseline justify-between gap-6 border-b border-white/10 py-2.5 text-[13px]">
                  <dt className="text-white/50">{r.k}</dt>
                  <dd className="text-right">
                    {r.f ? <Fuente href={r.f}>{r.v}</Fuente> : r.v}
                    {r.nota && <span className="block text-[11px] text-white/40">{r.nota}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight">Qué es dato y qué es modelo</h2>
            <ul className="mt-5 space-y-4">
              {MEDIDO.map((m) => (
                <li key={m.k} className="border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${TIPO[m.tipo][1]}`}>{TIPO[m.tipo][0]}</span>
                    <span className="text-[14px] font-medium">{m.k}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{m.v}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="border-t border-white/10 pb-14 pt-6 text-[12px] leading-relaxed text-white/45">
          Modelado por procedimiento en Blender 5.2 (<code className="font-mono text-white/60">blender/bloque20.py</code>). Fotos fijas en Cycles, vuelta en EEVEE y visor web con three.js sobre el GLB exportado.
          Entorno en 250 m: <Fuente href={F.cityurban}>City Urban 2025</Fuente> (alturas de los vecinos), suelo de <Fuente href="https://www.openstreetmap.org/copyright">OpenStreetMap</Fuente>,
          árboles de la Alcaldía de Medellín y copas detectadas en la ortofoto Esri World Imagery; huella del{" "}
          <Fuente href={F.catastro}>catastro</Fuente> y de <Fuente href={F.osm}>OpenStreetMap</Fuente>. Otras fuentes: <Fuente href={F.semana}>Semana (2018)</Fuente>,{" "}
          <Fuente href={F.blacksmith}>Blacksmith (mobiliario de laboratorios)</Fuente>. Consultado el 2-oct-2026.
        </footer>
      </div>
    </main>
  );
}
