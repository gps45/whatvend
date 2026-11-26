const WhatsAppAPI = (() => {
  function generarEnlacePedido(config, items, datosCliente = {}) {
    const telefono = (config.whatsapp || "").replace(/\D/g, "");
    const moneda = config.moneda || "$";
    let total = 0;

    const lineas = items.map((item) => {
      const subtotal = Number(item.precioUnitario) * Number(item.cantidad);
      total += subtotal;
      const extrasTexto = item.extras && item.extras.length > 0
        ? ` [${item.extras.map((e) => e.opcion).join(", ")}]`
        : "";
      return `• ${item.cantidad}x ${item.nombre}${extrasTexto} - ${moneda}${subtotal.toFixed(2)}`;
    });

    const partes = [
      `Hola *${config.nombre}*, quiero realizar el siguiente pedido:`,
      "",
      ...lineas,
      "",
      `*Total: ${moneda}${total.toFixed(2)}*`
    ];

    if (datosCliente.nombre) partes.push(`Cliente: ${datosCliente.nombre}`);
    if (datosCliente.direccion) partes.push(`Dirección/Referencia: ${datosCliente.direccion}`);
    if (datosCliente.nota) partes.push(`Nota: ${datosCliente.nota}`);

    const texto = encodeURIComponent(partes.join("\n"));
    return telefono ? `https://wa.me/${telefono}?text=${texto}` : `https://wa.me/?text=${texto}`;
  }

  return { generarEnlacePedido };
})();
