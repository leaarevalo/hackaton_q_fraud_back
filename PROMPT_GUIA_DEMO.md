Actúa como un Diseñador Web Frontend y Keynote Presenter experto en Pitch Decks de Startups B2B de Fintech/Security. Necesito que generes un único archivo `index.html` independiente (stand-alone) con HTML, CSS (usa CDN de Tailwind CSS) y JavaScript vainilla para una presentación interactiva tipo Slides.

DURACIÓN DE LA DEMO: 7 minutos.
OBJETIVO: Presentar el MVP de "Q-Leap: Loyalty Fraud Decision Engine" en la Hackathon Qurable, vendiendo una visión gigante a escala enterprise, mientras mostramos la demo práctica del Alcance 1 (Transferencia de Puntos).

REQUISITOS DE DISEÑO WEB:

- Estilo: Dark mode elegante, ultra moderno, estilo Vercel / Stripe / Cyberpunk profesional. Colores: Fondo negro/gris oscuro (`#0b0f17`), acentos en verde neón (`#10b981`), azul eléctrico (`#3b82f6`) y violeta AI (`#8b5cf6`).
- Navegación: Teclas Flecha Izquierda / Flecha Derecha, barra de progreso superior y botones de "Anterior / Siguiente" discretos.
- Responsive y scannable: Texto grande, tarjetas con glassmorphism, badges fluorescentes para métricas y nada de bloques de texto densos.

ESTRUCTURA DE LAS SLIDES (7 MINUTOS):

1. SLIDE 1: PORTADA & HOOK (30 seg)
   - Título: Q-Leap – Fraud Decision Engine
   - Subtítulo: La infraestructura de prevención de fraude en tiempo real guiada por IA para programas de Loyalty.
   - Badge: "Hackathon Qurable 2026"
   - Frase impacto: "El fraude no avisa. Tu motor tampoco debería dudar."

2. SLIDE 2: EL PROBLEMA OCULTO EN LOYALTY (1 min)
   - El gran dolor: Los programas de Loyalty pierden miles de millones en "puntos fantasma", botnets, account farming y mulas de puntos.
   - 3 tarjetas impactantes:
     - 1. Account Takeover (ATO) & Transferencias Masivas.
     - 2. Redes de Botnets / Dispositivos emulados con múltiples cuentas.
     - 3. Reglas rígidas tradicionales que generan falsos positivos y arruinan la experiencia de usuarios VIP.

3. SLIDE 3: LA SOLUCIÓN: Q-LEAP ENGINE (1 min)
   - Mostrar el valor enterprise: Un motor desacoplado, multi-tenant, en tiempo real y guiado por IA.
   - 4 Pilares (Grid de tarjetas):
     - ⚡ Evaluaciones en < 50ms (Redis + Rules Engine)
     - 📱 Device Fingerprint Avanzado
     - 🤖 AI Orchestrator (XAI: Explicabilidad sin falsos positivos)
     - 📊 Auditability & Graph Analysis (Visualización de redes)

4. SLIDE 4: ALCANCE 1 DE LA DEMO & ENTORNO EN VIVO (1 min - Transición a Demo)
   - Qué vamos a probar HOY: "Evaluación de Riesgo en Transferencias de Puntos".
   - Flujo del Live Test:
     - Paso 1: Usuario simula una transferencia en la Web App Client.
     - Paso 2: Q-Leap analiza Fingerprint + Historial en Redis + Reglas de Grafo.
     - Paso 3: Asignación de Riesgo (GREEN/YELLOW/RED/BLUE).
     - Paso 4: Auditoría en Vivo en el Dashboard del Analista.
   - Incluir un botón/link destacado que abra en nueva pestaña o simule ir al "Front / Dashboard de la Demo".

5. SLIDE 5: ARQUITECTURA TECNOLÓGICA & EXTENSIBILIDAD (1.5 min)
   - Mostrar cómo esto escalará post-hackathon a todo el ecosistema (Canjes, Cargas, Promociones).
   - Diagrama ASCII/HTML estilizado: Client App -> API Gateway -> Context Enricher (Redis/Graphs) -> Engine Rules -> AI Orchestrator -> Decision.
   - Badge: "API-First & Scope-Flexible (JSON Config Dynamic)".

6. SLIDE 6: EL PODER DE LA IA & EXPLICABILIDAD (XAI) (1 min)
   - "¿Por qué la IA no rompe todo?": La IA solo actúa en casos amarillos/azules (duda). Nunca invalida Blacklists.
   - Ejemplo de output en pantalla tipo consola JSON con el razonamiento explicable (Explainable AI) generado en tiempo real.

7. SLIDE 7: VISION DE FUTURO & CIERRE (30 seg)
   - "Hoy: Transferencias de Puntos. Mañana: Todo el ecosistema Loyalty de Qurable en tiempo real."
   - Métricas de éxito esperadas (99.9% precisión, -80% falsos positivos).
   - Call to Action: "Protejamos cada punto. Muchas gracias."

REQUISITOS TÉCNICOS ADICIONALES:

- Incluir un pequeño script JS para cambiar de slide con flechas del teclado (`ArrowRight`, `ArrowLeft`).
- Agregar un indicador de número de slide (ej: `Slide 3 de 7`).
- Todo empaquetado en un solo archivo `.html` para abrir directo con doble clic.
