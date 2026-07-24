# Q-Leap Fraud Decision Engine

Base MVP en Express.js para evaluar fraude en transferencias de puntos.

## Requisitos

- Node.js 18+
- Redis corriendo localmente si usas `CACHE_PROVIDER=redis`.

## Instalacion

```bash
npm install
cp .env.example .env
npm run dev
```

El servicio queda disponible en `http://localhost:3000`.

## Configuracion Redis

Por defecto `.env.example` usa:

```bash
CACHE_PROVIDER=redis
REDIS_URL=redis://localhost:6379
```

Con Docker, una forma simple de levantar Redis es:

```bash
docker run --name qleap-redis -p 6379:6379 -d redis:7-alpine
```

Si quieres correr sin Redis, cambia `CACHE_PROVIDER=memory`.

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
Redis cuenta las transferencias previas del mismo remitente en los ultimos 5 minutos.

## Estructura

- `src/routes`: endpoints HTTP.
- `src/services`: orquestacion de fraude, reglas, contexto e IA.
- `src/repositories`: almacenamiento de contexto en Redis o memoria segun `CACHE_PROVIDER`.
- `config.json`: reglas, niveles de riesgo y configuracion del engine.
- `examples`: payloads para probar casos del MVP.

## Claves Redis

El contexto se guarda por tenant en sorted sets con esta forma:

```text
qleap:fraud:{tenantId}:transfers
```
