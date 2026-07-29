# PinFire — tienda de diamantes Free Fire con Wompi

Next.js (App Router) + Tailwind. El checkout está **integrado**: el
formulario de pago es nuestro y habla contra la API REST de Wompi. No se
usa el widget ni el Web Checkout, no hay ventanas emergentes y el cliente
nunca sale del sitio.

Medios de pago disponibles: **tarjeta** y **Nequi**. PSE y Bancolombia
Transfer no se ofrecen porque exigen redirigir al portal del banco, lo
que rompería la premisa de "todo en la misma página".

## 1. Instalar y correr en local

```bash
npm install
cp .env.example .env.local   # y completa tus llaves de Wompi
npm run dev
```

Abre http://localhost:3000

## 2. Obtener tus llaves de Wompi

1. Crea una cuenta en https://comercios.wompi.co (o el panel vigente de Wompi).
2. En el modo **sandbox** encontrarás:
   - Llave pública (`pub_test_...`) → `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`
   - Secreto de integridad → `WOMPI_INTEGRITY_SECRET`
   - Secreto de eventos → `WOMPI_EVENTS_SECRET`
3. Configura la URL de webhooks en el panel de Wompi apuntando a:
   `https://tu-dominio.vercel.app/api/wompi/webhook`
4. Prueba con las tarjetas de sandbox que documenta Wompi antes de pasar a
   llaves de producción (`pub_prod_...`, etc.).

El ambiente (sandbox o producción) se deduce solo de la llave pública:
si empieza con `pub_test_` se apunta a `sandbox.wompi.co`, si no, a
`production.wompi.co`. No hay que tocar código para cambiar.

## 3. Cómo funciona el flujo de pago

1. El cliente elige un paquete y llena su ID de jugador, correo y datos
   de pago **en nuestro propio formulario** (`components/CheckoutPanel.tsx`).
2. Si paga con tarjeta, el navegador tokeniza los datos **directo contra
   Wompi** con la llave pública (`lib/wompi-client.ts`). El número de
   tarjeta y el CVC nunca pasan por nuestro servidor: eso nos deja fuera
   del alcance más exigente de PCI DSS. **No muevas esa llamada al
   backend.**
3. El navegador manda a `/api/wompi/pay` solo el token (o el celular de
   Nequi) y la referencia. El servidor deriva el monto del paquete,
   calcula la firma de integridad y crea la transacción con la llave
   privada. **El precio nunca se toma de lo que envía el navegador.**
4. Mientras la transacción está en `PENDING`, el frontend consulta
   `/api/wompi/status/[id]` cada 2,5 s (hasta 5 min). Con tarjeta suele
   resolverse en segundos; con Nequi depende de que el cliente acepte el
   push en su celular.
5. Wompi envía un evento a `/api/wompi/webhook` cuando el pago se
   aprueba o se rechaza. **Esa es la única fuente de verdad**: el estado
   que ve el navegador solo sirve para mostrar un mensaje, no para
   decidir si entregar los diamantes. El cliente puede cerrar la pestaña
   a mitad del pago y el cobro se completa igual.
6. El webhook verifica la firma del evento y envía el correo de aviso
   (`lib/email.ts`) con el UID a recargar.

### Rutas de API

| Ruta | Para qué |
|---|---|
| `GET /api/wompi/acceptance` | Enlaces a los contratos que Wompi exige aceptar |
| `POST /api/wompi/pay` | Crea la transacción (tarjeta o Nequi) |
| `GET /api/wompi/status/[id]` | Estado del pago mientras el cliente espera |
| `POST /api/wompi/webhook` | Confirmación de Wompi — fuente de verdad |

## 4. Pendientes antes de vender de verdad

- **Configurar `RESEND_API_KEY`.** Sin ella el webhook responde 500 y no
  te enteras de los pedidos pagados.
- **3D Secure.** Si activas 3DS para tarjetas en tu panel de Wompi,
  algunas transacciones exigirán un desafío del banco que hoy el
  formulario no maneja. Pruébalo en sandbox antes de activarlo.
- Conectar una base de datos real (Vercel Postgres, Supabase, etc.) para
  guardar pedidos — ahora mismo el webhook solo hace `console.log`.
- Definir cómo entregas los diamantes: ¿API de un proveedor mayorista?
  ¿carga manual? Automatízalo o al menos notifícate por correo/Slack.
- Ajustar `lib/products.ts` con tus precios y costos reales.
- Añadir alguna verificación anti-fraude para bienes digitales de
  entrega inmediata (son un blanco común de contracargos): por ejemplo,
  retener pedidos de montos altos o de tarjetas nuevas para revisión
  manual antes de entregar.
- Revisar el aviso legal del footer con un abogado si vas a operar
  formalmente (uso del nombre "Free Fire", términos de servicio,
  política de reembolsos, datos personales, etc.).

## 5. Desplegar en Vercel

```bash
npx vercel
```

Y agrega las 4 variables de entorno (`NEXT_PUBLIC_WOMPI_PUBLIC_KEY`,
`WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_PRIVATE_KEY`) en
el panel del proyecto en Vercel → Settings → Environment Variables.
