const VistasAPI = (() => {
  let estadoGlobal = { config: null, productos: [], extrasPorProducto: {} };

  function configurarEstado(config, productos, extrasPorProducto) {
    estadoGlobal = { config, productos, extrasPorProducto };
  }

  function htmlRedes(config) {
    const links = [];
    if (config.facebook) links.push(`<a href="${config.facebook}" target="_blank" rel="noopener">Facebook</a>`);
    if (config.instagram) links.push(`<a href="${config.instagram}" target="_blank" rel="noopener">Instagram</a>`);
    if (config.tiktok) links.push(`<a href="${config.tiktok}" target="_blank" rel="noopener">TikTok</a>`);
    if (!links.length) return "";
    return `<div class="redes-sociales">${links.join("")}</div>`;
  }

  function renderizarPortada(config, alEntrar) {
    const portadaEl = document.getElementById("vista-portada");
    if ((config.modo_portada || "NO").toUpperCase() !== "SI") {
      portadaEl.classList.add("oculto");
      alEntrar();
      return;
    }

    const claseLogo = (config.logo_circular || "SI").toUpperCase() === "SI" ? "logo-circular" : "logo-cuadrado";
    portadaEl.classList.remove("oculto");
    portadaEl.style.backgroundImage = config.imagen_fondo_portada ? `url('${config.imagen_fondo_portada}')` : "none";

    portadaEl.innerHTML = `
      <div class="portada-overlay">
        <div class="portada-card">
          ${config.logo_url ? `<img src="${config.logo_url}" alt="${config.nombre}" class="portada-logo ${claseLogo}" />` : ""}
          <h1>${config.nombre}</h1>
          ${config.destacado_portada_url ? `<img src="${config.destacado_portada_url}" alt="Destacado" class="portada-destacado" />` : ""}
          ${config.mensaje_portada ? `<p class="portada-mensaje">${config.mensaje_portada}</p>` : ""}
          ${htmlRedes(config)}
          <button type="button" id="btn-entrar-menu" class="btn-primario btn-portada">${config.texto_boton_inicio || "Ver menú"}</button>
        </div>
      </div>
    `;

    document.getElementById("btn-entrar-menu").onclick = () => {
      portadaEl.classList.add("oculto");
      alEntrar();
    };
  }

  function renderizarHeaderYFooter(config) {
    const header = document.getElementById("header-tienda");
    const claseLogo = (config.logo_circular || "SI").toUpperCase() === "SI" ? "logo-circular" : "logo-cuadrado";
    header.innerHTML = `
      <div class="header-inner">
        <div class="header-marca">
          ${config.logo_url ? `<img src="${config.logo_url}" alt="${config.nombre}" class="header-logo ${claseLogo}" />` : ""}
          <span class="header-titulo">${config.nombre}</span>
        </div>
        ${htmlRedes(config)}
      </div>
    `;

    const footer = document.getElementById("footer-tienda");
    let mapaHtml = "";
    if (config.google_maps_embed) {
      mapaHtml = `<div class="mapa-embed"><iframe src="${config.google_maps_embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
    } else if (config.google_maps_url) {
      mapaHtml = `<a href="${config.google_maps_url}" target="_blank" rel="noopener" class="btn-mapa">Ver ubicación en Google Maps</a>`;
    }

    footer.innerHTML = `
      <div class="footer-inner">
        ${config.ubicacion_texto ? `<p class="ubicacion-texto">${config.ubicacion_texto}</p>` : ""}
        ${mapaHtml}
        ${htmlRedes(config)}
        <p class="footer-copy">${config.nombre}</p>
      </div>
    `;
  }

  function abrirProducto(productoId) {
    const prod = estadoGlobal.productos.find((p) => p.id === productoId);
    if (!prod) return;
    const extras = estadoGlobal.extrasPorProducto[prod.id] || [];
    ExtrasAPI.abrirDetalle(prod, extras, estadoGlobal.config);
  }

  function agregarDirecto(productoId) {
    const prod = estadoGlobal.productos.find((p) => p.id === productoId);
    if (!prod) return;
    const extras = estadoGlobal.extrasPorProducto[prod.id] || [];
    if (extras.length > 0) {
      ExtrasAPI.abrirDetalle(prod, extras, estadoGlobal.config);
    } else {
      CarritoAPI.agregarItem(prod, [], Number(prod.precio || 0), 1);
    }
  }

  function abrirHistoria(seccionId, tituloHistoria) {
    const modal = document.getElementById("modal-historia");
    const tituloEl = document.getElementById("modal-historia-titulo");
    const cuerpoEl = document.getElementById("modal-historia-cuerpo");
    const moneda = estadoGlobal.config.moneda || "$";

    const items = estadoGlobal.productos.filter((p) => p.seccion_id === seccionId);
    tituloEl.textContent = tituloHistoria;

    if (!items.length) {
      cuerpoEl.innerHTML = "<p>No hay productos disponibles en esta historia.</p>";
    } else {
      cuerpoEl.innerHTML = `
        <div class="lista-historia-productos">
          ${items.map((p) => `
            <div class="fila-historia-item" onclick="VistasAPI.cerrarHistoria(); VistasAPI.abrirProducto('${p.id}')">
              ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nombre}" />` : ""}
              <div class="fila-historia-info">
                <strong>${p.nombre}</strong>
                ${p.descripcion ? `<small>${p.descripcion}</small>` : ""}
                <span class="precio-item">${moneda}${Number(p.precio || 0).toFixed(2)}</span>
              </div>
              <span class="flecha-detalle">&rsaquo;</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    modal.classList.remove("oculto");
  }

  function cerrarHistoria() {
    document.getElementById("modal-historia").classList.add("oculto");
  }

  function renderizarSeccion(sec, productos) {
    const moneda = estadoGlobal.config.moneda || "$";
    const items = productos.filter((p) => p.seccion_id === sec.seccion_id);
    const tipo = (sec.tipo_vista || "cuadricula").toLowerCase().trim();
    const estiloCustom = [
      sec.color_fondo ? `background-color:${sec.color_fondo}` : "",
      sec.color_texto ? `color:${sec.color_texto}` : ""
    ].filter(Boolean).join(";");

    const wrapper = document.createElement("section");
    wrapper.className = `seccion-bloque vista-${tipo}`;
    if (estiloCustom) wrapper.setAttribute("style", estiloCustom);

    const estiloTitulo = sec.tamano_titulo ? `style="font-size:${sec.tamano_titulo}"` : "";
    const estiloSub = sec.tamano_subtitulo ? `style="font-size:${sec.tamano_subtitulo}"` : "";

    if (tipo === "cinta_movil") {
      const textoCinta = sec.titulo || sec.subtitulo || "";
      wrapper.innerHTML = `
        <div class="cinta-track">
          <div class="cinta-texto" ${estiloTitulo}>${textoCinta} &nbsp;&bull;&nbsp; ${textoCinta} &nbsp;&bull;&nbsp; ${textoCinta}</div>
        </div>
      `;
      return wrapper;
    }

    if (tipo === "texto_aviso") {
      wrapper.innerHTML = `
        <div class="aviso-box">
          ${sec.titulo ? `<h2 class="seccion-titulo" ${estiloTitulo}>${sec.titulo}</h2>` : ""}
          ${sec.subtitulo ? `<p class="aviso-texto" ${estiloSub}>${sec.subtitulo}</p>` : ""}
        </div>
      `;
      return wrapper;
    }

    if (tipo === "banner_hero") {
      const esMovil = window.innerWidth <= 768;
      const imgBanner = esMovil
        ? (sec.imagen_movil || sec.imagen_pc || "")
        : (sec.imagen_pc || sec.imagen_movil || "");

      wrapper.innerHTML = `
        <div class="banner-hero" ${imgBanner ? `style="background-image:url('${imgBanner}')"` : ""}>
          <div class="banner-hero-overlay">
            <div class="banner-hero-contenido">
              ${sec.titulo ? `<h1 class="hero-titulo" ${estiloTitulo}>${sec.titulo}</h1>` : ""}
              ${sec.subtitulo ? `<p class="hero-subtitulo" ${estiloSub}>${sec.subtitulo}</p>` : ""}
              <div class="hero-acciones">
                ${estadoGlobal.config.google_maps_url ? `<a href="${estadoGlobal.config.google_maps_url}" target="_blank" rel="noopener" class="btn-hero-sec">Ubicación</a>` : ""}
                <a href="#footer-tienda" class="btn-hero-sec">Acerca de</a>
              </div>
              ${htmlRedes(estadoGlobal.config)}
            </div>
          </div>
        </div>
      `;
      return wrapper;
    }

    if (tipo === "historias" || tipo === "circulos") {
      wrapper.innerHTML = `
        ${sec.titulo ? `<h2 class="seccion-titulo" ${estiloTitulo}>${sec.titulo}</h2>` : ""}
        <div class="fila-historias">
          ${items.map((p) => `
            <button type="button" class="historia-item" onclick="VistasAPI.abrirHistoria('${sec.seccion_id}', '${(p.nombre || "").replace(/'/g, "\\'")}')">
              <div class="historia-aro">
                <img src="${p.foto_url || ""}" alt="${p.nombre}" />
              </div>
              <span>${p.nombre}</span>
            </button>
          `).join("")}
        </div>
      `;
      return wrapper;
    }

    if (tipo === "banner_grande") {
      const disp = (sec.disposicion || "apilado").toLowerCase().trim() === "slider" ? "es-slider" : "es-apilado";
      wrapper.innerHTML = `
        ${sec.titulo ? `<h2 class="seccion-titulo" ${estiloTitulo}>${sec.titulo}</h2>` : ""}
        <div class="banners-grandes ${disp}">
          ${items.map((p) => `
            <article class="tarjeta-banner-grande" onclick="VistasAPI.abrirProducto('${p.id}')">
              ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nombre}" />` : ""}
              <div class="banner-grande-info">
                <h3>${p.nombre}</h3>
                ${p.descripcion ? `<p>${p.descripcion}</p>` : ""}
                <div class="banner-grande-pie">
                  <strong>${moneda}${Number(p.precio || 0).toFixed(2)}</strong>
                  <button type="button" class="btn-agregar-mini" onclick="event.stopPropagation(); VistasAPI.agregarDirecto('${p.id}')">+</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      `;
      return wrapper;
    }

    if (tipo === "slider_tarjetas") {
      wrapper.innerHTML = `
        ${sec.titulo ? `<h2 class="seccion-titulo" ${estiloTitulo}>${sec.titulo}</h2>` : ""}
        <div class="slider-tarjetas-track">
          ${items.map((p) => `
            <article class="tarjeta-deslizable" onclick="VistasAPI.abrirProducto('${p.id}')">
              <div class="tarjeta-deslizable-texto">
                ${sec.subtitulo ? `<span class="etiqueta-superior">${sec.subtitulo}</span>` : ""}
                <h3>${p.nombre}</h3>
                ${p.descripcion ? `<p>${p.descripcion}</p>` : ""}
                <div class="tarjeta-deslizable-accion">
                  <strong>${moneda}${Number(p.precio || 0).toFixed(2)}</strong>
                  <button type="button" class="btn-agregar-blanco" onclick="event.stopPropagation(); VistasAPI.agregarDirecto('${p.id}')">Agregar</button>
                </div>
              </div>
              ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nombre}" class="tarjeta-deslizable-img" />` : ""}
            </article>
          `).join("")}
        </div>
      `;
      return wrapper;
    }

    // Por defecto: cuadrícula
    wrapper.innerHTML = `
      ${sec.titulo ? `<h2 class="seccion-titulo" ${estiloTitulo}>${sec.titulo}</h2>` : ""}
      <div class="grid-productos">
        ${items.map((p) => `
          <article class="card-producto" onclick="VistasAPI.abrirProducto('${p.id}')">
            ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nombre}" class="card-img" />` : ""}
            <div class="card-body">
              <h3>${p.nombre}</h3>
              ${p.descripcion ? `<p class="card-desc">${p.descripcion}</p>` : ""}
              <div class="card-footer">
                <span class="card-precio">${moneda}${Number(p.precio || 0).toFixed(2)}</span>
                <button type="button" class="btn-mas" onclick="event.stopPropagation(); VistasAPI.agregarDirecto('${p.id}')">+</button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
    return wrapper;
  }

  function renderizarCatalogo(secciones, productos) {
    const contenedor = document.getElementById("contenedor-secciones");
    contenedor.innerHTML = "";
    secciones.forEach((sec) => {
      contenedor.appendChild(renderizarSeccion(sec, productos));
    });
  }

  return {
    configurarEstado,
    renderizarPortada,
    renderizarHeaderYFooter,
    renderizarCatalogo,
    abrirProducto,
    agregarDirecto,
    abrirHistoria,
    cerrarHistoria
  };
})();
