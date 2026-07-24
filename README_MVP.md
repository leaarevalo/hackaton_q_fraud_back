# Q-Leap – Loyalty Fraud Decision Engine
## Especificación de Alcance 1: Transferencias de Puntos (Points Transfer)

> **Hackathon Qurable** | Módulo de Prevención de Fraude para Transferencia de Puntos

---

## 1. Introducción y Propósito del Alcance 1

En los programas de fidelización (Loyalty), la **Transferencia de Puntos** representa uno de los vectores de ataque con mayor riesgo financiero y operativo. Los atacantes suelen explotar esta funcionalidad para:
- **Account Farming / Mulas de Puntos:** Consolidar puntos de múltiples cuentas secundarias o robadas hacia una cuenta concentradora.
- **Transferencias Circulares:** Simular actividad o lavar saldo de puntos mediante redes de cuentas interconectadas.
- **Robo de Identidad y Dispositivos Compartidos:** Realizar transferencias inmediatas tras tomar el control de una cuenta (ATO - Account Takeover) o desde emuladores con múltiples cuentas por dispositivo.

Este documento define el **Primer Alcance (Scope 1)** enfocado exclusivamente en la **evaluación, scoring y decisión en tiempo real de operaciones de Transferencia de Puntos**.

---

## 2. Arquitectura y Flujo de Evaluación

```text
[ Cliente / App Loyalty ]
           │
           ▼ (POST /v1/transfers/evaluate)
┌─────────────────────────────────────────────────────────┐
│              Fraud Decision Engine (Q-Leap)              │
│                                                         │
│  1. Extraer Device Fingerprint & Contexto (IP, Geo)     │
│  2. Consultar Redis (Historial, Frecuencia, Grafos)     │
│  3. Evaluar Rule Engine (Reglas específicas de Transfer)│
│  4. Calcular Risk Score & Risk Level (GREEN/YELLOW/RED) │
│  5. Invocación condicional de IA (si es YELLOW o BLUE)  │
│  6. Auditoría inmutable & Respuesta                     │
└─────────────────────────────────────────────────────────┘
           │
           ▼
[ Resultado: GREEN (Aprobar) | YELLOW (Warning) | RED (Rechazar) | BLUE (Revisión) ]
```

---

## 3. Modelo de Datos de la Transacción (Payload de Entrada)

Toda transferencia enviada al engine debe cumplir la siguiente estructura:

```json
{
  "tenant": "default",
  "transactionId": "tx_trf_987654321",
  "timestamp": "2026-07-24T13:00:00Z",
  "type": "POINTS_TRANSFER",
  "points": 5000,
  "sender": {
    "userId": "usr_sender_123",
    "accountAgeMinutes": 45,
    "ip": "181.44.12.90"
  },
  "receiver": {
    "userId": "usr_receiver_999",
    "ip": "181.44.12.90"
  },
  "device": {
    "fingerprintHash": "fp_abc123xyz789",
    "associatedAccountsCount": 4,
    "isNewForUser": true,
    "userAgent": "Mozilla/5.0...",
    "platform": "Android"
  },
  "location": {
    "country": "AR",
    "city": "Buenos Aires"
  }
}
```

---

## 4. Matriz de Estados de Riesgo (Risk Levels)

| Nivel | Rango Score / Condición | Acción Sistema | Comportamiento |
| :--- | :--- | :--- | :--- |
| **GREEN** | 0 – 29 pts | `APPROVE` | Transacción legítima. Se ejecuta de inmediato. |
| **YELLOW**| 30 – 59 pts | `APPROVE_WITH_WARNING` | Transacción sospechosa. Invoca IA para análisis de comportamiento. |
| **RED**   | 60 – 100 pts | `REJECT` | Bloqueo automático. Se notifica al equipo de seguridad. |
| **BLUE**  | Manual Review | `MANUAL_REVIEW` | Retenido. Requiere validación por un analista humano o IA avanzada. |

---

## 5. Reglas del Motor para Transferencias

1. **`NEW_ACCOUNT_FAST_TRANSFER` (Score: +35)**
   - *Condición:* Cuenta origen con antigüedad < 60 min y transferencia > 1,000 puntos.
2. **`MULTIPLE_ACCOUNTS_SAME_DEVICE_TRANSFER` (Riesgo: RED)**
   - *Condición:* Dispositivo utilizado por más de 3 cuentas distintas.
3. **`HIGH_FREQUENCY_TRANSFERS_BURST` (Score: +40 -> Evalúa IA)**
   - *Condición:* Más de 3 transferencias iniciadas por el remitente en los últimos 5 minutos.
4. **`CIRCULAR_OR_FARMING_NETWORK_DETECTED` (Riesgo: BLUE -> Evalúa IA)**
   - *Condición:* Transferencia recíproca en 24h o destinatario recibiendo de > 5 cuentas en 1h.
5. **`SENDER_RECEIVER_SAME_IP_NEW_DEVICE` (Score: +25)**
   - *Condición:* Remitente y destinatario comparten IP desde un dispositivo nuevo para el remitente.

---

## 6. Integración con IA (AI Orchestrator)

La IA interviene exclusivamente cuando el motor determina un nivel **YELLOW** o **BLUE**.

- **Objetivo:** Minimizar falsos positivos analizando grafos de transferencias y patrones históricos.
- **Límites estables:** La IA **nunca** podrá desestimar bloqueos por listas negras (`SENDER_BLACKLIST`, `DEVICE_BLACKLIST`).
- **Salida esperada:**
  - Decisión final (`riskLevel`).
  - Confianza (`confidenceScore`: 0.0 - 1.0).
  - Justificación legible (`reasoning`).
  - Recomendación de nuevas reglas para el motor.

---

## 7. Plan de Pruebas y Casos de Uso (Hackathon MVP)

1. **Caso 1: Transferencia Regular (GREEN)**
   - Usuario antiguo transfiriendo a un amigo habitual desde su dispositivo usual.
2. **Caso 2: Account Farming / Botnet (RED)**
   - Dispositivo con 5 cuentas transfiriendo puntos acumulados a una sola cuenta receptora.
3. **Caso 3: Ráfaga Sospechosa con Intervención de IA (YELLOW -> IA Decision)**
   - Usuario realizando múltiples transferencias rápidas. La IA evalúa el contexto histórico y decide si aprueba con advertencia o eleva a RED.
