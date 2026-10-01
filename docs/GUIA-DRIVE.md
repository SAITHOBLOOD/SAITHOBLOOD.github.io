# Cómo subir obras a la página (sin tocar código)

Todo se maneja desde la carpeta de Google Drive **portafolio_saith**.
Cada 3 horas la página revisa el Drive y publica sola lo nuevo. Si hay prisa, alguien con acceso
a GitHub puede lanzarlo a mano: **Actions → «Sincronizar obras desde Drive» → Run workflow**.

## Las carpetas

```
portafolio_saith/
├─ Ilustración/                 ← cada archivo suelto = una obra
│  └─ Blanco y negro/           ← subcarpeta = técnica (se muestra en la ficha)
├─ Bocetos/
│  ├─ Grafito/
│  └─ Tinta/
├─ Animación/                   ← videos sueltos = animaciones
├─ Pasillo/                     ← las obras que quieres en el pasillo 3D (y alrededor del ojo)
├─ Logo/                        ← el logo (PNG con fondo transparente)
└─ Proyecto Nombre/             ← UN proyecto con varias piezas
   ├─ 01.jpg, 02.png …          ← fotos del resultado (en orden alfabético)
   ├─ animacion.mp4             ← videos sueltos = la animación terminada
   ├─ proceso/                  ← timelapses / videos del proceso (opcional)
   └─ info.txt                  ← datos del proyecto (opcional)
```

## Reglas

- **Proyecto nuevo** → crear una carpeta que empiece por `Proyecto` (por ejemplo `Proyecto Dino West`).
  El nombre después de "Proyecto" es el título. Aparece solo en la sección **Proyectos** de la página.
- **Obra suelta** → soltar el archivo en Ilustración, Bocetos o Animación (o en una subcarpeta de técnica).
- **Nombres**: si el archivo se llama `IMG_…`, `sin título` o un número, la obra sale como **"Sin título"**.
  Si se llama `El caído.jpg`, sale como **"El caído"**. La fecha se toma del nombre (`IMG_20190419…` → 2019)
  o de la foto; si no hay, sale "s. f.".
- **Mover** archivos entre carpetas está bien: la página los reubica sin duplicarlos.
- **Borrar** del Drive = sale de la página (queda una copia de seguridad, no se pierde).
- **Formatos**: JPG, PNG, HEIC (iPhone), WebP · videos MP4, MOV. No importa el tamaño: la página los optimiza.
- **Color**: no hay que hacer nada; las piezas a color se detectan solas y se muestran con "segunda tinta".

## info.txt (opcional, dentro de una carpeta de proyecto)

Un archivo de texto simple (**.txt**, no un Google Doc) con estas líneas; todas son opcionales:

```
Título: Dino West
Año: 2025
Técnica: Digital, Procreate
Descripción: Serie de ilustraciones para el universo de Dino West.
Destacado: sí
```

## Lo que NO hace falta

- No hay que renombrar ni comprimir nada.
- No hay que avisar a nadie: se publica sola en unas horas.
