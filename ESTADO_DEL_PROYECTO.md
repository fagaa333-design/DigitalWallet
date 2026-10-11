# 📊 Estado Actual del Proyecto DigitalWallet & Guía de Continuación

> **Documento de sincronización y estado del proyecto (Project Status & Next Steps)**  
> *Fecha de actualización: 11 de Octubre de 2026*  
> *Diseñado para que tú y tu asistente de IA continúen desarrollando el proyecto inmediatamente sin perder el hilo ni duplicar trabajo.*

---

## 1. Resumen Ejecutivo: ¿Qué es DigitalWallet?

**DigitalWallet** es una billetera digital móvil (*offline-first* y de ultra-alta seguridad) construida con **React Native (Expo SDK 57)** y **TypeScript**.  
Su propósito es permitir al usuario almacenar de forma 100% confidencial en su dispositivo:
* Tarjetas de crédito/débito y bancarias.
* Documentos de identidad (DNI, pasaporte, licencias).
* Credenciales universitarias y corporativas.
* Membresías de clubes/gimnasios.
* Pases de transporte y boletos.

---

## 2. Estado de Git y Ramas

* **Rama activa actual**: `feature/wallet-home-ui`
* **Sincronización remota**: Al día con `origin/feature/wallet-home-ui` en GitHub.
* **Último Commit**: `f352757` — *`feat(ui): connect wallet navigation, reactive session state, and card management screens`*
* **Estado del árbol de trabajo**: 100% limpio (`working tree clean`, sin cambios sin confirmar).
* **Rama `main`**: Intacta en `91479d0` (no se ha tocado para evitar colisiones).
* **Situación con el compañero**: La rama de seguridad de tu compañero (`feature/security-infrastructure`) aún no ha sido subida a GitHub. Por esta razón, la interfaz se desarrolló con un contrato en memoria desacoplado para que puedan avanzar sin bloquearse.

---

## 3. ¿Qué está 100% Construido y Verificado?

### A. Núcleo Criptográfico y Base de Datos (Completado y probado)
1. **Gestor de Claves (`src/shared/security/key-manager.ts`)**:
   * Clave Maestra AES-256 en `expo-secure-store`.
   * Envoltura criptográfica (*key wrapping*) de claves de base de datos y archivos mediante AES-GCM con datos asociados (AAD).
   * Política *fail-closed*: se niega a regenerar claves si una clave inicializada se extravía.
   * Consumo efímero por callbacks (`withDatabaseKey`, `withFileEncryptionKey`) con limpieza forzada de memoria (`.fill(0)`).
2. **Base de Datos Protegida (`src/features/wallet/data/wallet-database.ts`)**:
   * Motor **SQLCipher** con verificación obligatoria de `PRAGMA cipher_version`.
   * Esquema SQLite en versión 2 (`PRAGMA user_version = 2`) con tabla `wallet_items`.
   * Rechazo estricto de bases legadas sin cifrar.
3. **Almacenamiento Seguro de Archivos (`src/shared/storage/wallet-files.ts`)**:
   * Formato de sobre binario `.dwf` con cabecera mágica (`DWF\x01`), IV de 12 bytes y tag GCM de 16 bytes.
   * Datos asociados AAD vinculados al UUID para evitar intercambios de archivos.

### B. Sistema Visual, Pantallas y Navegación (Completado y probado)
1. **Punto de Entrada Expo Router (`src/app/index.tsx`)**:
   * Conectado directamente a la pantalla principal `WalletHomeScreen`.
2. **Layout Raíz (`src/app/_layout.tsx`)**:
   * Envuelto en `<WalletProvider>` para proveer estado reactivo global sin interferir con la navegación nativa de `<Stack>`.
3. **Pantalla Principal (`src/features/wallet/presentation/WalletHomeScreen.tsx`)**:
   * Encabezado con saludo y estado del enclave local.
   * Barra de búsqueda interactiva en tiempo real sobre títulos, emisores, números y notas.
   * Filtro horizontal por categorías (*Todas, Identificación, Finanzas, Estudio, Transporte, Membresías, Otras*) con conteo dinámico.
   * Carrusel Hero deslizante para tarjetas destacadas.
   * Lista reactiva de tarjetas digitales con microdetalles (chip EMV, contactless, fecha de validez).
   * Estado vacío (*Empty State*) con botón para limpiar filtros o crear elementos.
   * Botón destacado para añadir nuevas tarjetas.
4. **Pantalla de Detalle de Tarjeta (`src/app/card/[id].tsx`)**:
   * Navegación nativa con botón de regreso.
   * Renderizado físico de la tarjeta seleccionada.
   * Botón para copiar el identificador con retroalimentación visual inmediata.
   * Código de identificación criptográfico y hash UUID.
   * Tabla de atributos y metadatos registrados.
   * Modal de confirmación para eliminar la tarjeta con borrado reactivo.
5. **Pantalla de Creación de Tarjeta (`src/app/card/new.tsx`)**:
   * Previsualización de la tarjeta en tiempo real mientras el usuario escribe.
   * Selector interactivo de tipo de elemento y categoría.
   * Selector de 6 acabados visuales de lujo (*Obsidian, Sapphire, Emerald, Amethyst, Copper, Slate*).
   * Validación de campos obligatorios con avisos de error.
   * Botón de guardado que inserta la tarjeta en el estado de la sesión y regresa al inicio.
6. **Iconografía Nativa con Cero Dependencias (`src/features/wallet/presentation/components/icons/UiIcon.tsx`)**:
   * 18 iconos vectoriales geométricos construidos con primitivas puras de React Native (`search`, `plus`, `close`, `settings`, `arrowLeft`, `trash`, `copy`, `alert`, `card`, `badge`, `shield`, `book`, `transit`, `star`, `wallet`, `tag`, `check`).
7. **Tema y Tokens (`src/features/wallet/presentation/theme/`)**:
   * Paletas completas para modo claro y oscuro del sistema operativo.
   * Tipografía jerárquica y sistema de espaciado/sombras.

---

## 4. Estado de Validación y Pruebas

Todos los comandos fueron ejecutados en la máquina y pasaron al 100%:

1. **TypeScript (`npx tsc --noEmit`)**:
   * ✅ **0 errores** de tipos en modo estricto.
2. **Jest Test Suite (`npm test`)**:
   * ✅ **8 suites pasadas de 8**, **22 pruebas unitarias exitosas**:
     * `tests/wallet-context.test.ts` (CRUD en memoria y estado de sesión)
     * `tests/wallet-presentation.test.ts` (Filtros, búsqueda, contrastes y tipos)
     * `tests/security-infrastructure.test.ts` (Cifrado AES-GCM y envoltura de claves)
     * `tests/wallet-database.test.ts` (SQLCipher y transacciones)
     * `tests/wallet-database-legacy.test.ts` (Rechazo de datos no cifrados)
     * `tests/wallet-database-key-rejected.test.ts` (Rechazo de claves faltantes)
     * `tests/wallet-database-v1-migration.test.ts` (Migración de esquema SQLite)
     * `tests/wallet-database-no-sqlcipher.test.ts` (Comportamiento fail-closed sin SQLCipher nativo)
3. **Bundling de Android (`npx expo export --platform android`)**:
   * ✅ **Exitoso**: 1283 módulos empaquetados sin errores en el bundle de Hermes (`dist/`).

---

## 5. ¿Qué está Simulado / Pendiente Actualmente?

1. **Persistencia Real de Tarjetas**:
   * Actualmente, las tarjetas se guardan en el contexto en memoria (`src/features/wallet/presentation/context/wallet-context.tsx`) usando los datos de `mock-cards.ts` como base inicial.
   * **Falta crear el Repositorio de Datos (`WalletRepository`)**: Conectar las operaciones `createCard`, `getCards`, `deleteCard` directamente a `digital-wallet.sqlcipher.db` mediante consultas SQL cifradas.
2. **Ingestión de Imágenes Cifradas**:
   * La interfaz admite el campo `imageId`, pero aún no está integrado `expo-image-picker` para tomar o seleccionar fotos de documentos reales y convertirlas en archivos cifrados `.dwf`.
3. **Bloqueo por Biometría / PIN**:
   * Falta una pantalla de bloqueo inicial (`expo-local-authentication`) que requiera Face ID, huella dactilar o PIN antes de abrir la billetera.

---

## 6. Opciones para el Siguiente Paso (Elige una para avanzar)

### 🎯 Opción 1: Implementar `WalletRepository` (Conectar UI a la Base de Datos Cifrada) — **RECOMENDADA**
* **Objetivo**: Crear `src/features/wallet/data/wallet-repository.ts` para que las tarjetas que creas en `/card/new` se inserten físicamente en `digital-wallet.sqlcipher.db` con SQLCipher y se lean de allí al abrir la app.
* **Archivos a tocar**:
  * `src/features/wallet/data/wallet-repository.ts` (Nuevo)
  * `src/features/wallet/presentation/context/wallet-context.tsx` (Conectar al repositorio)
  * `tests/wallet-repository.test.ts` (Pruebas unitarias)

### 📸 Opción 2: Implementar la Captura de Documentos con Cámara/Galería
* **Objetivo**: Permitir al usuario adjuntar fotos a sus tarjetas/documentos.
* **Flujo**:
  1. Instalar `expo-image-picker` con `npx.cmd expo install expo-image-picker`.
  2. Al tomar una foto, leer los bytes en memoria.
  3. Cifrar inmediatamente con `storeWalletFile(bytes)` obteniendo un `imageId`.
  4. Borrar de inmediato la foto temporal sin cifrar.
  5. Mostrar la imagen descifrada en memoria en `/card/[id]`.

### 🔐 Opción 3: Pantalla de Bloqueo Biométrico / PIN
* **Objetivo**: Proteger la apertura de la app.
* **Flujo**:
  1. Instalar `expo-local-authentication` con `npx.cmd expo install expo-local-authentication`.
  2. Diseñar la pantalla de desbloqueo (Face ID / Touch ID / PIN).
  3. No permitir acceso al `WalletProvider` hasta que el usuario se autentique.

---

## 7. Prompt Listo para Pasar a la IA

Si quieres cambiar de sesión o darle instrucciones directas a tu IA, cópiale este texto:

```markdown
Hola. Estamos desarrollando DigitalWallet (React Native con Expo SDK 57, TypeScript y SQLCipher).
Actualmente estamos en la rama `feature/wallet-home-ui`.

Por favor, lee el archivo `ESTADO_DEL_PROYECTO.md` para entender el estado exacto del repositorio:
- Ya tenemos el diseño visual completo, navegación con Expo Router (/ -> /card/[id] -> /card/new), temas y contexto reactivo en memoria.
- Todas las pruebas de Jest (22 pruebas en 8 suites) y el typecheck de TypeScript están pasando al 100%.
- El siguiente paso que queremos implementar es: [ELIGE: Opción 1 (WalletRepository y persistencia SQLite cifrada) | Opción 2 (Captura de fotos con expo-image-picker y cifrado .dwf) | Opción 3 (Bloqueo biométrico)].

Por favor, revisa el proyecto y ayúdame a desarrollar ese paso respetando las reglas de seguridad.
```

