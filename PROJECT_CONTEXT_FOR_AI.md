# 📱 Digital Wallet — Guía Completa de Arquitectura, Flujo Git y Contexto para IA

> **Documento de transferencia técnica y colaboración asíncrona (AI Handoff & Git Collaboration Guide)**  
> *Diseñado para que el desarrollador colaborador y su asistente de IA (Claude, ChatGPT, Gemini, Copilot, Cursor, etc.) comprendan al 100% el proyecto, el flujo de trabajo colaborativo basado en GitHub, la división de tareas para evitar conflictos de merge, las reglas críticas de seguridad y cómo avanzar en paralelo.*

---

## 1. Visión General del Proyecto

**Digital Wallet** es una aplicación móvil desarrollada con **React Native** y **Expo (SDK 57)**.  
Su objetivo es ser una **billetera digital local, offline-first y de ultra-alta seguridad**, diseñada para almacenar documentos, tarjetas, credenciales, membresías y boletos de manera confidencial en el dispositivo del usuario.

### ⚠️ Qué hace actualmente (Estado del Core)
- **Criptografía en reposo**: Cifrado total de la base de datos con **SQLCipher** (AES-256) y de archivos binarios/imágenes con **AES-256-GCM**.
- **Gestión Jerárquica de Claves en Enclave Seguro**: Clave maestra generada criptográficamente en `expo-crypto` y resguardada en `expo-secure-store`. Claves de base de datos y archivos envueltas (*key wrapping*) bajo la clave maestra.
- **Esquema SQLite y Migraciones Versionadas**: Control estricto de versiones de esquema (`PRAGMA user_version = 2`) y tabla `wallet_items`.
- **Almacenamiento Seguro de Archivos**: Persistencia de archivos en formato de sobre autenticado (`.dwf`), vinculados criptográficamente a su UUID mediante datos asociados autenticados (AAD).
- **Pruebas Unitarias Robustas**: Batería de pruebas en Jest validando rechazo de bases sin cifrar, manejo seguro de claves, migraciones y comportamiento *fail-closed*.

### ❌ Qué NO hace todavía (Alcance pendiente)
- No tiene backend, cuentas remotas ni sincronización en la nube (es 100% local por diseño).
- No tiene pasarelas de pago ni procesamiento financiero bancario.
- La interfaz de usuario (UI) es actualmente un esqueleto inicial (`src/app/index.tsx`).
- No cuenta aún con pantalla de bloqueo por PIN / Biometría (`expo-local-authentication`).
- No tiene implementado aún el selector de cámara / galería para importar imágenes a la bóveda.

---

## 2. Flujo de Trabajo Colaborativo vía GitHub (Git Workflow Asíncrono)

Debido a que el desarrollo se realiza de forma distribuida entre dos personas (cada una con su propio entorno y su propia IA), **todo el avance se sincroniza a través del repositorio remoto de GitHub**, sin depender de Live Share ni sesiones compartidas en tiempo real.

### 2.1. Reglas de Git para Ambos Equipos (Dev 1 / Dev 2)
1. **Siempre sincronizar antes de empezar a programar**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Trabajar en ramas de funcionalidad (*Feature Branches*)**:
   Nunca hacer commits directos a `main` para evitar pisarse el trabajo en curso:
   ```bash
   git checkout -b feature/nombre-de-la-tarea
   ```
3. **Validación obligatoria antes de hacer commit/push**:
   Ningún cambio debe subirse a GitHub si rompe los tipos o las pruebas existentes:
   ```bash
   # En Windows:
   npx.cmd tsc --noEmit
   npm.cmd test

   # En Mac / Linux:
   npx tsc --noEmit
   npm test
   ```
4. **Commits pequeños, atómicos y descriptivos**:
   ```bash
   git add .
   git commit -m "feat(wallet): implement WalletRepository CRUD operations"
   git push origin feature/nombre-de-la-tarea
   ```
5. **Integración limpia**:
   Abrir un Pull Request (PR) en GitHub o coordinar un merge limpio hacia `main` una vez que la tarea esté terminada y probada.

---

## 3. Estrategia de División de Tareas (Para evitar conflictos de merge)

Para que ambos desarrolladores puedan trabajar a la máxima velocidad en paralelo sin generar conflictos en Git, las tareas se dividen por capas desacopladas:

```
┌─────────────────────────────────────────────────────────────┐
│                       DIVISIÓN DE TAREAS                    │
├──────────────────────────────┬──────────────────────────────┤
│    LADO A: Backend / Data    │     LADO B: UI / UX / Media  │
│        (Infraestructura)     │         (Presentación)       │
├──────────────────────────────┼──────────────────────────────┤
│ 1. `WalletRepository` (CRUD) │ 1. Pantallas en `src/app/`   │
│ 2. Validaciones de dominio   │ 2. Componentes de UI         │
│ 3. Pruebas unitarias data    │ 3. Flujo ImagePicker         │
│ 4. Biometría / Bloqueo       │ 4. Estado visual & feedback  │
└──────────────────────────────┴──────────────────────────────┘
```

### 📦 Módulo A: Lógica de Datos y Bóveda (Data & Services)
- **Archivos a crear/modificar**:
  - `src/features/wallet/data/wallet-repository.ts` (CRUD de `WalletItem`).
  - `tests/wallet-repository.test.ts` (pruebas del repositorio).
  - `src/shared/security/auth-service.ts` (capa de autenticación biométrica/PIN con `expo-local-authentication`).
- **Responsabilidad**:
  - Implementar métodos `getAll()`, `getById(id)`, `create(item)`, `update(item)` y `delete(id)`.
  - Asegurar que al eliminar un item con `imageId`, se invoque `deleteWalletFile(imageId)`.
  - Manejo de transacciones SQLite.

### 🎨 Módulo B: Interfaz Gráfica y Captura de Documentos (UI & Presentation)
- **Archivos a crear/modificar**:
  - `src/app/index.tsx` (lista principal de tarjetas y documentos con filtros).
  - `src/app/item/[id].tsx` (pantalla de detalle que muestra datos e imagen descifrada).
  - `src/app/item/new.tsx` (formulario para agregar tarjeta/documento).
  - `src/features/wallet/presentation/` (componentes reutilizables: `WalletCardItem`, `CategoryPill`, etc.).
  - `src/features/wallet/services/image-ingestion.ts` (`expo-image-picker` -> leer bytes -> `storeWalletFile` -> borrar temporal).
- **Responsabilidad**:
  - Diseño visual agradable y reactivo.
  - Consumir el `WalletRepository` (pueden mockear la llamada inicialmente si el Módulo A no ha hecho merge a `main`).
  - Cargar imágenes en memoria usando `readWalletFile(imageId)` y convirtiendo a Data URL en memoria (`data:image/jpeg;base64,...`).

---

## 4. Stack Tecnológico y Versiones Exactas

> 🚨 **Regla de oro sobre Expo**: Expo cambia APIs y plugins con frecuencia. **Nunca asumas APIs antiguas de memoria**. Consulta siempre la documentación del SDK 57.

- **Framework**: Expo SDK `~57.0.26` (React Native `0.86.3`, React `19.2.3`).
- **Lenguaje**: TypeScript `~6.0.3` con modo estricto.
- **Enrutamiento**: **Expo Router** `~57.0.24` (enrutamiento basado en archivos en `src/app/`).
- **Base de Datos**: `expo-sqlite` `~57.0.3` con plugin nativo configurado para **SQLCipher** (`useSQLCipher: true`).
- **Seguridad y Criptografía**:
  - `expo-crypto` `~57.0.3` (manejo de claves AES, cifrado/descifrado autenticado GCM, generador seguro de UUID y bytes aleatorios).
  - `expo-secure-store` `~57.0.4` (almacenamiento en Keystore en Android / Keychain en iOS).
- **Sistema de Archivos**: `expo-file-system` `~57.0.7` (API moderna: `File`, `Directory`, `Paths`).
- **Testing**: `jest` `~29.7.0` y `jest-expo` `~57.0.5`.

---

## 5. Estructura de Directorios del Repositorio

```text
DigitalWallet/
├── app.json                      # Configuración de Expo y plugins nativos (SQLCipher, Router, etc.)
├── package.json                  # Dependencias SDK 57 y scripts
├── tsconfig.json                 # Configuración de TypeScript con alias @/* -> ./src/*
├── jest.setup.js                 # Setup de Jest y mocks globales
├── AGENTS.md                     # Reglas de conducta técnica y de seguridad obligatorias
├── README.md                     # Notas del repositorio y comandos
├── PROJECT_CONTEXT_FOR_AI.md     # ESTE DOCUMENTO de contexto y sincronización
├── src/
│   ├── app/                      # Rutas de navegación (Expo Router)
│   │   ├── _layout.tsx           # Layout raíz (Stack navigator sin headers por defecto)
│   │   └── index.tsx             # Pantalla inicial (actualmente bienvenida/placeholder)
│   ├── features/
│   │   └── wallet/
│   │       ├── domain/
│   │       │   └── wallet-item.ts   # Tipos y contratos de los elementos de la wallet
│   │       ├── data/
│   │       │   ├── wallet-database.ts   # Conexión a SQLite/SQLCipher y migraciones
│   │       │   └── wallet-repository.ts # (A implementar: CRUD de items)
│   │       └── presentation/            # (A implementar: Componentes visuales)
│   └── shared/
│       ├── security/
│       │   ├── secret-store.ts     # Abstracción sobre expo-secure-store
│       │   └── key-manager.ts      # Ciclo de vida de claves maestras y secundarias (AES-256)
│       └── storage/
│           └── wallet-files.ts     # Cifrado/descifrado de archivos AES-256-GCM (.dwf)
└── tests/                        # Pruebas unitarias de arquitectura y seguridad
    ├── mocks/                    # Mocks de SQLite, FileSystem y SecureStore para Node/Jest
    ├── security-infrastructure.test.ts
    ├── wallet-database.test.ts
    ├── wallet-database-legacy.test.ts
    ├── wallet-database-no-sqlcipher.test.ts
    ├── wallet-database-v1-migration.test.ts
    └── wallet-database-key-rejected.test.ts
```

---

## 6. Arquitectura de Seguridad (INVARIANTES ESTRICTAS)

Cualquier IA o desarrollador que modifique o extienda este código **debe respetar estos principios sin excepción**:

### 6.1. Jerarquía y Manejo de Claves (`src/shared/security/key-manager.ts`)
1. **Clave Maestra (`Master Key`)**:
   - Clave AES de 256 bits generada con `AESEncryptionKey.generate(AESKeySize.AES256)`.
   - Se guarda en SecureStore bajo la clave `wallet.master-key.v1` con prefijo `v1:`.
   - Tiene una marca en SecureStore: `wallet.master-key.initialized.v1`.
2. **Claves de Propósito Específico (`database` y `files`)**:
   - Claves AES de 256 bits independientes para la base de datos y los archivos.
   - **Key Wrapping**: No se guardan en texto plano en SecureStore. Se cifran con AES-GCM usando la Clave Maestra y datos asociados AAD (`digital-wallet/data-key/v1/database` y `digital-wallet/data-key/v1/files`).
3. **Acceso Efímero mediante Callbacks**:
   - Las claves solo se consumen a través de `withDatabaseKey(async (key) => ...)` y `withFileEncryptionKey(async (key) => ...)`.
   - **NUNCA** devuelvas claves a componentes UI ni las serialices en SQLite ni en archivos.
   - Los buffers en memoria (`Uint8Array`) se limpian con `.fill(0)` en bloques `finally`.
4. **Política Anti-Reemplazo (Fail-Closed)**:
   - Si la marca de clave inicializada existe pero la clave ya no se encuentra en SecureStore, **el sistema lanza un error fatal y se niega a generar una nueva clave**, protegiendo los datos existentes contra sobreescritura accidental.

### 6.2. Base de Datos Protegida (`src/features/wallet/data/wallet-database.ts`)
- **Nombre del archivo**: `digital-wallet.sqlcipher.db`.
- **Clave SQLCipher**: Se inyecta antes de cualquier consulta mediante `PRAGMA key = "x'<64_hex_chars>'";`.
- **Verificación de Encriptación**: Ejecuta `PRAGMA cipher_version;`. Si no devuelve versión (lo que ocurre en builds no nativos o Expo Go estándar), **falla inmediatamente**.
- **Prohibición de Datos Legacy Planos**: Si existe un archivo `digital-wallet.db` (versión antigua sin cifrar) o la carpeta `wallet-items/`, la aplicación lanza un error y detiene la inicialización. No hay migración silenciosa automática de datos en claro.
- **Configuración SQLite**: `PRAGMA journal_mode = WAL;` y `PRAGMA foreign_keys = ON;`.

### 6.3. Almacenamiento Seguro de Archivos (`src/shared/storage/wallet-files.ts`)
- **Directorio privado**: `wallet-items-encrypted/` dentro del directorio seguro de la app (`Paths.document`).
- **Formato del archivo (.dwf)**:
  - Header mágico: 4 bytes `DWF\x01` (`[0x44, 0x57, 0x46, 0x01]`).
  - Vector de Inicialización (IV): 12 bytes aleatorios.
  - Tag de autenticación GCM: 16 bytes.
  - Ciphertext de la imagen o documento.
- **Autenticación Vinculada (AAD)**: Los datos asociados del cifrado GCM incluyen el `fileId` (UUIDv4) para evitar que un atacante intercambie archivos en disco.
- **Opaque IDs**: La base de datos y la UI solo conocen `imageId` (UUID). **Nunca** guardes URLs, rutas absolutas ni nombres de archivo en la base de datos.
- **Operaciones en Memoria**: `storeWalletFile(bytes)` recibe bytes y retorna el UUID. `readWalletFile(fileId)` descifra en memoria y retorna los bytes descifrados. Cualquier archivo temporal creado por la cámara o selector de fotos debe ser borrado inmediatamente tras su cifrado.

---

## 7. Modelo de Dominio (`src/features/wallet/domain/wallet-item.ts`)

```typescript
export const WALLET_ITEM_TYPES = [
  'card',        // Tarjetas bancarias, de lealtad, etc.
  'document',    // DNI, pasaporte, licencia de conducir
  'membership',  // Membresías de gimnasio, clubes, etc.
  'ticket',      // Pasajes de avión, tren, entradas de cine/conciertos
  'credential',  // Carnets laborales, credenciales estudiantiles
  'custom',      // Elementos personalizados
] as const;

export type WalletItemType = (typeof WALLET_ITEM_TYPES)[number];

export interface WalletItem<TDetails extends Record<string, unknown> = Record<string, unknown>> {
  id: string;               // UUIDv4
  type: WalletItemType;     // Tipo de elemento
  category: string;         // Categoría libre (ej. 'Finanzas', 'Identidad', 'Viajes')
  title: string;            // Nombre principal
  subtitle: string | null;  // Subtítulo o emisor
  description: string | null;
  imageId: string | null;   // UUID del archivo cifrado en wallet-items-encrypted/
  color: string | null;     // Color hexadecimal para la tarjeta en UI
  icon: string | null;      // Nombre de icono para representación gráfica
  details: TDetails;        // Objeto JSON extensible (números enmascarados, vencimiento, etc.)
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}
```

---

## 8. Comandos de Desarrollo y Entorno

En Windows (PowerShell), debido a restricciones de políticas de scripts `.ps1`, se debe invocar con la extensión `.cmd`:

| Tarea | Comando Windows | Comando Unix / Mac |
|---|---|---|
| Iniciar servidor Expo | `npm.cmd start` | `npm start` |
| Ejecutar pruebas unitarias | `npm.cmd test` | `npm test` |
| Verificación de tipos | `npx.cmd tsc --noEmit` | `npx tsc --noEmit` |
| Instalar librerías compatibles | `npx.cmd expo install <pkg>` | `npx expo install <pkg>` |
| Diagnóstico de dependencias | `npx.cmd expo install --check` | `npx expo install --check` |

### ⚠️ Recordatorio: Expo Go vs Development Build
Dado que `expo-sqlite` está configurado con **SQLCipher nativo** (`useSQLCipher: true`), la aplicación **no puede correr en la app genérica de Expo Go**. Requiere:
- Un **Development Build** (`npx.cmd expo run:android` o `npx.cmd expo run:ios`).
- O un build generado mediante **EAS Build** (`eas build --profile development`).
- En desarrollo y pruebas de escritorio, Jest corre con los mocks criptográficos configurados en `tests/mocks/`.

---

## 9. Instrucciones Directas para la IA de tu Amigo

Si eres la Inteligencia Artificial asistiendo al desarrollador colaborador:

1. **Sincronización Git**: Antes de sugerir o escribir código, recuérdale al desarrollador hacer `git checkout main && git pull origin main` y crear una rama específica con `git checkout -b feature/<nombre-tarea>`.
2. **Respetar la arquitectura existente**:
   - No toques `key-manager.ts`, `wallet-database.ts` ni `wallet-files.ts` a menos que sea estrictamente necesario y consensuado. Esos módulos son el núcleo criptográfico probado.
   - Si necesitas instalar dependencias (ej. `expo-image-picker` o `expo-local-authentication`), usa SIEMPRE `npx.cmd expo install <nombre-paquete>` (o `npx expo install`), **nunca** `npm install` directo, para garantizar compatibilidad con Expo SDK 57.
3. **No tocar carpetas nativas directas**: No crees ni toques carpetas `ios/` o `android/`. Este proyecto usa Continuous Native Generation (CNG); toda configuración nativa va en `app.json`.
4. **Verificación antes de entrega**: Al finalizar tu propuesta de código, indica al desarrollador que ejecute:
   - `npx.cmd tsc --noEmit`
   - `npm.cmd test`
   Y que prepare un commit limpio con `git add .` y `git commit -m "..."`.
