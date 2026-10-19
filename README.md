# Laboratorio de ciencias — GitHub Pages

Esta carpeta contiene la web completa y los simuladores 2D y 3D. No necesita instalación ni compilación.

## Publicar en tu repositorio

1. Descomprime el ZIP en tu ordenador.
2. Abre el repositorio que has creado en GitHub.
3. Pulsa Add file → Upload files.
4. Arrastra los archivos contenidos en la carpeta descomprimida, incluido index.html. Sube los archivos, no el ZIP ni la carpeta contenedora.
5. Pulsa Commit changes para guardarlos en la rama main.
6. Entra en Settings → Pages.
7. En Build and deployment elige Source → Deploy from a branch.
8. Selecciona Branch → main y carpeta / (root). Pulsa Save.
9. Espera a que GitHub termine la publicación. La misma página Pages mostrará el enlace definitivo.

El enlace tendrá este formato:
https://TU_USUARIO.github.io/NOMBRE_DEL_REPOSITORIO/

Si el repositorio se llama TU_USUARIO.github.io, el enlace será:
https://TU_USUARIO.github.io/

El alumnado podrá abrir la web publicada sin entrar en ChatGPT. En GitHub Free, el repositorio debe ser público.

## Archivos

- index.html: hub del Laboratorio de ciencias.
- catalogo.js: tarjetas, búsqueda, filtros y favoritos.
- particulas-2d.html: área barrida, choques y cobertura 2D.
- particulas-3d.html: volumen barrido, choques, cobertura 3D y cámara.
- .nojekyll: permite servir directamente los archivos estáticos.

Los enlaces de los simuladores son relativos. La descarga de cada simulador conserva la dirección del sitio donde lo abras, por lo que funciona también desde GitHub Pages. Los favoritos se guardan en el navegador.

## Añadir otro simulador

Sube su HTML al repositorio y añade una entrada a SIMULATORS en catalogo.js.
