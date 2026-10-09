# Digital Wallet

Base móvil local para la wallet. No incluye cuentas, backend, sincronización,
pagos, autenticación, biometría, cámara ni OCR.

## Arquitectura

- `src/app/`: rutas y composición de navegación con Expo Router.
- `src/features/wallet/domain/`: contrato común de los elementos de la wallet.
- `src/features/wallet/data/`: base SQLite cifrada y migraciones versionadas.
- `src/shared/security/`: claves de SecureStore y adaptadores criptográficos.
- `src/shared/storage/`: archivos cifrados en el directorio privado de la app.

## Datos y cifrado

- `expo-sqlite` usa el plugin oficial con `useSQLCipher: true` en iOS y Android.
  `getWalletDatabase()` instala la clave SQLCipher antes de cualquier consulta,
  comprueba `PRAGMA cipher_version` y falla cerrado si el build no tiene
  SQLCipher. Expo Go no puede activar este plugin; se requiere un development o
  production build generado con CNG/EAS.
- La base protegida se llama `digital-wallet.sqlcipher.db`. El antiguo
  `digital-wallet.db` y el directorio plano `wallet-items/` nunca se abren,
  migran ni borran automáticamente. Si aparecen, el servicio se detiene para
  evitar leer datos sin cifrar. Una migración de datos existente debe diseñarse
  explícitamente antes de distribuir una actualización.
- `initializeWalletKeys()` crea una clave maestra AES-256 aleatoria mediante
  `expo-crypto` y la almacena en SecureStore. Genera además claves aleatorias
  independientes para SQLCipher y archivos; SecureStore conserva solo sus
  envolturas cifradas con AES-GCM bajo la clave maestra. El acceso a las claves
  de uso se realiza mediante callbacks (`withDatabaseKey` y
  `withFileEncryptionKey`); no se almacenan en SQLite ni junto a los archivos.
  Si falta una clave marcada como inicializada, se rechaza generar un reemplazo.
- `getWalletDatabase()` inicializa las claves solo para una base cifrada nueva,
  después de comprobar que no hay una base/archivos legacy planos. El servicio
  de archivos no genera claves por su cuenta: el bootstrap debe ejecutar
  `initializeWalletKeys()` antes de guardar el primer archivo. El PIN y la
  autenticación aún no están implementados; más adelante podrán controlar el
  acceso a este servicio de claves sin cambiar la persistencia.
- `storeWalletFile()` recibe bytes en memoria y solo escribe un sobre cifrado
  AES-256-GCM con versión, IV aleatorio de 12 bytes, tag de 16 bytes y AAD que
  vincula el identificador opaco del archivo. Devuelve un ID, nunca una URI.
  `readWalletFile()` descifra en memoria y devuelve bytes; el llamador debe
  evitar persistir ese contenido descifrado y eliminar cualquier archivo
  temporal plano de cámara/selector que haya creado. `deleteWalletFile()` borra
  el archivo cifrado, pero el repositorio debe actualizar también la referencia
  `image_id`. El buffer temporal interno se limpia best-effort; JavaScript no
  garantiza borrado de todas las copias de memoria ni borrado físico seguro de
  almacenamiento flash.
- SQLite guarda `image_id`, no una ruta de archivo. Todo el contenido de SQLite,
  incluidos tipos, categorías, colores e iconos, queda dentro de SQLCipher.
  `details_json` es extensible y también está cifrado por la base completa.

## Versiones

Expo SDK 57 (`expo` 57.0.26), React Native 0.86.3, React 19.2.3 y TypeScript
6.0.3. `expo-sqlite` 57.0.3 y `expo-crypto` 57.0.3 se instalaron con `expo
install` y se verificaron contra la documentación versionada de Expo.

## Desarrollo y pruebas

```bash
npm.cmd start
npm.cmd test
npx.cmd tsc --noEmit
npx.cmd expo install --check
npx.cmd expo config --type public --json
```

Las pruebas usan el backend WebCrypto de `expo-crypto` y mocks para SecureStore,
FileSystem y SQLite. Comprueban cifrado/autenticación AES-GCM, ausencia de datos
planos en el directorio persistente, rotación accidental de claves y
migraciones. No sustituyen una prueba de integración nativa SQLCipher.

En Windows se usa `npm.cmd`/`npx.cmd` si PowerShell bloquea los scripts `.ps1`.

## Verificaciones pendientes y observaciones

- No hay Java ni Android SDK en este equipo. Falta generar e instalar un
  development build Android para verificar SQLCipher nativo, `PRAGMA key`,
  apertura cifrada y migraciones sobre SQLite real. También falta validar iOS
  en un build nativo.
- La pérdida/restauración de datos de SecureStore puede dejar la base o archivos
  cifrados irrecuperables. Android Keystore y iOS Keychain tienen distinta
  persistencia frente a reinstalación; aún faltan una política de backup,
  restauración y rotación de claves.
- `expo-doctor` no pudo completar su revisión remota por DNS (`EAI_AGAIN` al
  resolver `exp.host`).
- npm informa dependencias transitivas vulnerables y un peer warning entre
  `react-native-worklets` 0.13.0 y `expo-modules-core` 57.0.20. No se aplicó
  `npm audit fix --force`, que propone degradar Expo.
- `npm audit --omit=dev` reportó 42 avisos (27 altos, 15 moderados; ninguno
  crítico). El árbol completo reportó 65; no se forzaron actualizaciones
  incompatibles con SDK 57.
