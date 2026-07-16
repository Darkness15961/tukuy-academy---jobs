# Integración de pagos con Izipay

## Decisión de integración

El cliente Vue usa el SDK Web Core de Izipay en modalidad `pop-up`. Las
credenciales privadas, la creación real de la orden, la validación de la firma
y la matrícula pertenecen al backend.

La respuesta `Charge/CreatePayment` compartida durante el análisis genera un
`formToken`, pero declara `wallet: false` y `qrCode: false`. Esa configuración
solo permite tarjetas. Para ofrecer billeteras, el contrato de Izipay del
comercio debe habilitar los métodos correspondientes y el backend debe
devolverlos en `metodosDisponibles`.

Métodos contemplados por la interfaz:

- `CARD`: tarjetas.
- `YAPE_CODE`: Yape.
- `QR`: código QR para billeteras compatibles.
- `PAGO_PUSH`: pago móvil, como Plin, según el contrato del comercio.

La interfaz nunca presenta como disponible un método ausente en la sesión
devuelta por el backend.

## Flujo

1. El estudiante inicia sesión y abre `/pago/curso/:cursoId`.
2. Vue envía únicamente el identificador del curso a `POST /pagos/ordenes`.
3. El backend obtiene usuario y curso desde sus propias fuentes, vuelve a
   calcular el importe y crea una orden única e idempotente.
4. El backend genera el token de sesión de Izipay y devuelve solo datos
   públicos o temporales.
5. Vue carga el SDK desde el dominio oficial correspondiente y abre el
   checkout.
6. La respuesta del navegador se envía a
   `POST /pagos/ordenes/:id/respuesta-izipay`.
7. El backend valida HMAC-SHA256 usando su `claveHash`, compara orden, importe y
   moneda, y registra la transacción de forma idempotente.
8. Solo después de esa validación el backend marca la orden como `pagada` y
   matricula al estudiante.

La devolución del checkout en el navegador no es evidencia suficiente para
habilitar un curso.

## Contrato esperado del backend

### Crear una orden

`POST /api/pagos/ordenes`

Solicitud:

```json
{
  "cursoId": "c-001"
}
```

El importe, descuento, identidad del comprador y número de orden no deben
aceptarse desde el navegador.

Respuesta resumida:

```json
{
  "ordenId": "orden-interna",
  "proveedor": "izipay",
  "estado": "pendiente",
  "entorno": "pruebas",
  "moneda": "PEN",
  "importe": 89,
  "metodosDisponibles": ["CARD", "YAPE_CODE", "QR"],
  "autorizacionSesion": "token-temporal",
  "llaveRsaPublica": "llave-publica",
  "configuracion": {
    "transactionId": "transaccion-unica",
    "action": "pay",
    "merchantCode": "codigo-publico-del-comercio",
    "order": {
      "orderNumber": "numero-unico",
      "currency": "PEN",
      "amount": "89.00",
      "processType": "AT",
      "merchantBuyerId": "comprador-interno",
      "dateTimeTransaction": "fecha-izipay"
    },
    "render": {
      "typeForm": "pop-up"
    }
  }
}
```

### Confirmar la respuesta del checkout

`POST /api/pagos/ordenes/:ordenId/respuesta-izipay`

El backend recibe `payloadHttp`, `signature`, `transactionId` y `code`. Debe
validar la firma con comparación de tiempo constante, verificar que la orden
pertenece al usuario autenticado y evitar una segunda matrícula o un segundo
registro contable ante reintentos.

### Consultar la orden

`GET /api/pagos/ordenes/:ordenId`

Estados aceptados: `creada`, `pendiente`, `pagada`, `rechazada`, `cancelada` y
`expirada`.

## Seguridad obligatoria

- Rotar las credenciales que hayan sido compartidas dentro de una URL.
- No usar parámetros como `authBasic`, claves privadas o tokens permanentes en
  query strings.
- No declarar secretos con prefijo `VITE_`: Vite los publica dentro del bundle.
- Guardar secretos exclusivamente en el gestor de variables del backend.
- No registrar tokens de sesión, firmas completas ni respuestas con datos del
  comprador en logs de acceso.
- Usar HTTPS, identificadores de orden únicos e idempotencia en creación,
  confirmación y matrícula.
- Calcular importes en el backend y comparar importe y moneda antes de aprobar.

## Desarrollo local

Con `VITE_USE_MOCK=true`, la pantalla presenta una demostración que no carga el
SDK, no solicita datos financieros y no realiza cobros. Con
`VITE_USE_MOCK=false`, necesita que los tres endpoints anteriores existan.

