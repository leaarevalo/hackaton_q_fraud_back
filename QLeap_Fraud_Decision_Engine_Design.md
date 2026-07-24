# Q-Leap – Fraud Decision Engine
## Arquitectura de API Extensible y Gestión Contextual (Alcance 1)

> **Hackathon Qurable** | Guía de Integración, Extensibilidad y Contexto de Evaluación

---

## 1. Visión General de la API Extensible

El **Fraud Decision Engine** de Q-Leap está diseñado como un **microservicio decoupled y multi-tenant**, capaz de evolucionar modularmente desde el **Alcance 1 (Transferencia de Puntos)** hacia un sistema completo de prevención de fraude para cualquier operación de Loyalty (canjes, carga de puntos, descuentos).

### Principios del Diseño Extensible:
1. **Contrato de Payloads Agnósticos (`Event-Driven / Schema-Flexible`):** Los datos recibidos no dependen de la infraestructura subyacente. Se acepta un objeto raíz estandarizado con bloques extensibles (`sender`, `receiver`, `device`, `customMetadata`).
2. **Motor de Reglas Plugin-Based (Rule Engine Strategy):** Las reglas no están acopladas al código duro del servidor. Se leen dinámicamente desde `config.json` y se pueden habilitar, deshabilitar o reponderar mediante la API en tiempo de ejecución.
3. **Orquestación de Contexto (Context Providers):** El motor no solo analiza el JSON entrante; enriquece la transacción consultando proveedores de contexto rápido (Redis/Cache) antes de ejecutar la evaluación.

---

## 2. Arquitectura de Extensibilidad y Flujo Interno

```text
               ┌──────────────────────────────────────────────┐
               │         API Endpoint (Gateway)               │
               │   POST /v1/fraud/evaluate?scope=TRANSFER     │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │          Context Enricher Middleware         │
               │  - Consulta Redis para Device Fingerprint    │
               │  - Trae Métricas de Velocidad (últimos 5m)   │
               │  - Calcula Grafos de Red (Senders/Receivers)  │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │          Rule Engine Evaluator               │
               │  - Carga reglas desde config.json            │
               │  - Filtra por scope (e.g., POINTS_TRANSFER)   │
               │  - Calcula Risk Score Ponderado              │
               └──────────────────────┬───────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
    Riesgo GREEN/RED (Directo)                  Riesgo YELLOW/BLUE
                 │                                         │
                 ▼                                         ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │    Audit & Logging Store  │             │   AI Decision Orchestrator│
   │  - Log de reglas match    │             │  - Recibe contexto enriqu.│
   │  - Guardado en DB/Redis   │             │  - Genera veredicto + XAI │
   └─────────────┬─────────────┘             └─────────────┬─────────────┘
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │          JSON Response Payload               │
               │ { riskLevel, score, actions, explanation }   │
               └──────────────────────────────────────────────┘
```

---

## 3. Manejo de Contexto Necesario (Context Enrichment)

Para evaluar si una **transferencia de puntos** es fraudulenta, el contexto de la transacción directa no es suficiente. El motor orquesta **cuatro capas de contexto** que se combinan en tiempo real:

### A. Contexto del Dispositivo (Device Fingerprint)
- **Atributos:** Hash del dispositivo, Canvas/WebGL fingerprint, IP actual, User-Agent, Zona horaria, Idioma.
- **Métricas:** Número de cuentas abiertas desde el mismo dispositivo en los últimos $N$ días.

### B. Contexto Temporal y Frecuencia (Velocity Metrics)
- **Transferencias en las últimas 1h / 24h / 7d:** Cantidad de puntos acumulados transferidos por el remitente.
- **Ráfagas (Burst Rate):** Cantidad de operaciones en ventanas de 2 a 5 minutos.

### C. Contexto de Red / Grafo (Graph Analysis)
- **Relación Remitente ↔ Destinatario:** ¿Tienen historial previo?
- **Transferencia Recíproca:** Si $A 	o B$, ¿hubo un $B 	o A$ en las últimas 24 horas?
- **Grado de Entrada (In-Degree) del Destinatario:** Número de remitentes únicos enviando puntos a la misma cuenta receptora en un período corto (detección de *Point Farming* / *Mulas*).

### D. Contexto de Listas de Seguridad (Blacklists / Whitelists)
- Dispositivos, IPs o UserIDs bloqueados globalmente o por tenant.

---

## 4. Endpoints y Extensibilidad de la API REST

### 1. Evaluación de Transacciones
`POST /api/v1/fraud/evaluate`

#### Request Payload (Extensible):
```json
{
  "tenantId": "qurable_loyalty",
  "scope": "POINTS_TRANSFER",
  "transaction": {
    "id": "tx_8839201",
    "timestamp": "2026-07-24T13:10:00Z",
    "points": 12000,
    "currency": "LOYALTY_PTS"
  },
  "sender": {
    "userId": "usr_alpha_123",
    "accountCreatedAt": "2026-07-24T12:00:00Z",
    "ip": "200.45.12.5"
  },
  "receiver": {
    "userId": "usr_beta_999",
    "ip": "200.45.12.5"
  },
  "device": {
    "fingerprint": "a4f8e910b2c3d4e5",
    "platform": "iOS",
    "version": "17.4"
  },
  "metadata": {
    "campaignId": "PROMO_WINTER_2026",
    "channel": "MOBILE_APP"
  }
}
```

#### Response Payload (Estandarizado):
```json
{
  "transactionId": "tx_8839201",
  "decision": {
    "riskLevel": "YELLOW",
    "riskScore": 45,
    "recommendedAction": "APPROVE_WITH_WARNING",
    "aiInvoked": true
  },
  "executionSummary": {
    "matchedRules": [
      {
        "id": "NEW_ACCOUNT_FAST_TRANSFER",
        "scoreAdded": 35
      }
    ],
    "aiAnalysis": {
      "model": "gpt-5.5",
      "confidence": 0.89,
      "reasoning": "El usuario transfirió un monto elevado dentro de los primeros 70 min de creación. Sin embargo, comparte IP con la cuenta destino en un entorno residencial conocido. Se sugiere permitir pero monitorear próximas operaciones.",
      "suggestedRule": "Crear regla de alerta si se supera los 20,000 puntos desde IPs residenciales compartidas."
    }
  },
  "auditId": "aud_9982310491"
}
```

---

## 5. Estrategia de Extensión Futura (Post-Hackathon)

El diseño modular de la API permite extender el sistema a otras operaciones simplemente agregando:
1. **Nuevos Scopes en `config.json`:** e.g., `POINTS_REDEEM` (Canjes) o `PROMO_CLAIM` (Reclamar Promociones).
2. **Nuevos Providers de Contexto:** Integración con servicios externos de Scoring de IP (e.g., IPQS) o Geolocation Fraud detection.
3. **Control Dinámico de Configuración:** Endpoints `PUT /api/v1/config/rules` para actualizar reglas sin desplegar o reiniciar el backend.
