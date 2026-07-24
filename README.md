# Q-Leap Fraud Decision Engine

Base MVP en Express.js para evaluar fraude en transferencias de puntos.

## Requisitos

- Node.js 18+
- Redis no es requerido para correr este MVP. El contexto se guarda en memoria por ahora.

## Instalacion

```bash
npm install
cp .env.example .env
npm run dev
```

El servicio queda disponible en `http://localhost:3000`.

## Endpoints

### Healthcheck

```bash
curl http://localhost:3000/health
```

### Evaluar transferencia

```bash
curl -X POST http://localhost:3000/api/v1/fraud/evaluate \
  -H "Content-Type: application/json" \
  -d @examples/account-farming-red.json
```

Para probar la regla de rafaga, envia `examples/burst-yellow.json` varias veces cambiando `transaction.id`.
La memoria del proceso cuenta las transferencias previas del mismo remitente en los ultimos 5 minutos.

## Estructura

- `src/routes`: endpoints HTTP.
- `src/services`: orquestacion de fraude, reglas, contexto e IA.
- `src/repositories`: almacenamiento temporal en memoria. Aqui se puede cambiar a Redis despues.
- `config.json`: reglas, niveles de riesgo y configuracion del engine.
- `examples`: payloads para probar casos del MVP.

## Redis mas adelante

El MVP usa `CACHE_PROVIDER=memory`. Cuando Redis este instalado, se puede agregar un repositorio Redis manteniendo la misma interfaz de `src/repositories/context.repository.js`.
