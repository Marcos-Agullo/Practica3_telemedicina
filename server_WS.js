// Crear un servidor HTTP
var http = require("http");
var httpServer = http.createServer();

var datos = require('./datos.js');
var sanitarios=datos.san
var gestores=datos.ges
var ubicaciones=datos.ubi
var categorias=datos.cat
var modelos=datos.mod
var recursos=datos.rec
var reservas=datos.reserv
var resenyas=datos.reseny

// Crear servidor WS
// Necesita tener instalado el módulo websocket:
// npm install websocket
var WebSocketServer = require("websocket").server; // instalar previamente: npm install websocket
var wsServer = new WebSocketServer({
	httpServer: httpServer
});

// Iniciar el servidor HTTP en un puerto
var puerto = 4444;
httpServer.listen(puerto, function () {
	console.log("Servidor de WebSocket iniciado en puerto:", puerto);
});

// Conectados:
clientes = [];

// Esperar a clientes...
wsServer.on("request", function (request) { // este callback se ejecuta cuando llega una nueva conexión de un cliente
	var connection = request.accept("conexion", request.origin); // aceptar conexión
	console.log("Cliente conectado");
	var cliente = null;


	connection.on("message", function (message) { // mensaje recibido del cliente
		if (message.type === "utf8") { // es un mensaje de texto
			console.log("Mensaje recibido de cliente: " + message.utf8Data);
			var msg = JSON.parse(message.utf8Data); // pasar de cadena a objeto
			switch (msg.operacion) {
				case "sanitario": // se identifica sanitario
					cliente = {
						id: msg.id,
						tipo: "sanitario",
						connection: connection
					}

					clientes.push(cliente);
					console.log(msg.id + " se ha conectado como sanitario");
					break;

				case "gestor": // se identifica gestor
					cliente = {
						id: msg.id,
						tipo: "gestor",
						connection: connection
					}
					clientes.push(cliente);
					console.log(msg.id + " se ha conectado como gestor");
					break;

				case "reservas": { // main sanit: idRecurso, idSanitario, tipo (inicio/fin)
					// Recurso implicado y su ficha (modelo, categoría, código de serie)
					var recursoImplicado = recursos.find(r => r.id == msg.idRecurso);
					var modeloImplicado = modelos.find(m => m.id == recursoImplicado.modelo);
					var categoriaImplicada = categorias.find(c => c.id == modeloImplicado.categoria);

					var descripcionRecurso = categoriaImplicada.nombre + "  modelo " + modeloImplicado.nombre + " con código " + recursoImplicado.numero_serie;

					var texto = "";
					if (msg.tipo == "inicio") {
						texto = "Ha comenzado una nueva reserva para el recurso: " + descripcionRecurso;
					} else if (msg.tipo == "fin") {
						texto = "Ha finalizado una reserva para el recurso: " + descripcionRecurso;
					}

					// Sólo interesa avisar a otros sanitarios que tengan
					// abierta una reserva de este mismo recurso
					var sanitariosAAvisar = clientes.filter(function (c) {
						return c.tipo == "sanitario" && c.connection != connection;
					});

					sanitariosAAvisar.forEach(function (destinatario) {
						var tieneReservaAbierta = reservas.some(function (r) {
							return r.sanitario == destinatario.id && r.recurso == msg.idRecurso && r.fecha_fin == null;
						});

						if (tieneReservaAbierta) {
							destinatario.connection.sendUTF(JSON.stringify({
								operacion: "reservas",
								fecha: new Date().toLocaleString(),
								origen: sanitarios.find(s => s.id == msg.idSanitario).nombre + " " + sanitarios.find(s => s.id == msg.idSanitario).apellidos,
								color: "red",
								texto: texto
							}));
						}
					});
					break;
				}

				case "recursos": { // main gestor: datos {categoria, modelo, numero_serie, ubicacion, estado}, idGestor
					var modeloNuevo = modelos.find(m => m.id == msg.datos.modelo);
					var categoriaNuevo = categorias.find(c => c.id == modeloNuevo.categoria);
					var gestorAutor = gestores.find(g => g.id == msg.idGestor);

					var textoAviso = "Se ha creado un nuevo recurso: " + categoriaNuevo.nombre + " modelo " + modeloNuevo.nombre + " con código " + msg.datos.numero_serie;

					clientes
						.filter(function (c) { return c.tipo == "sanitario"; })
						.forEach(function (destinatario) {
							destinatario.connection.sendUTF(JSON.stringify({
								operacion: "recursos",
								fecha: new Date().toLocaleString(),
								origen: gestorAutor.nombre + " " + gestorAutor.apellidos,
								texto: textoAviso,
								color: "blue"
							}));
						});
					break;
				}

				case "resenyas": { // main santit: valoracion, idSanitario, idRecurso
					var recursoResenyado = recursos.find(r => r.id == msg.idRecurso);
					var modeloResenyado = modelos.find(m => m.id == recursoResenyado.modelo);
					var categoriaResenyada = categorias.find(c => c.id == modeloResenyado.categoria);
					var sanitarioAutor = sanitarios.find(s => s.id == msg.idSanitario);

					var textoResenya = "Ha creado una reseña para el recurso: " + categoriaResenyada.nombre + " modelo " + modeloResenyado.nombre + " con código " + recursoResenyado.numero_serie + " y puntuación " + msg.valoracion;

					clientes
						.filter(function (c) { return c.tipo == "gestor"; })
						.forEach(function (destinatario) {
							destinatario.connection.sendUTF(JSON.stringify({
								operacion: "resenyas",
								fecha: new Date().toLocaleString(),
								origen: sanitarioAutor.nombre + " " + sanitarioAutor.apellidos,
								texto: textoResenya,
								color: "green"
							}));
						});
					break;
				}
			}
		}
	});
	connection.on("close", function () { // conexión cerrada
		if (cliente != null) {
			for (var i = 0; i < clientes.length; i++) {
				if (clientes[i] === cliente) {
					console.log("Cliente desconectado: " + cliente.id);
					clientes.splice(i, 1);
					break;
				}
			}
		}
	});
});

/*
function contarReservasPorNombre() {
    var NOMBRE = "Marcos"; // ← CAMBIAR
    rest.get("https://undefined.ua.es/telemedicina/api/datos", function(estado, respuesta) {
        if (!respuesta || !Array.isArray(respuesta)) return;
        var contador = 0;
        for (var i = 0; i < respuesta.length; i++) {
            var remesa = respuesta[i];
            if (!remesa || typeof remesa !== "object" || !Array.isArray(remesa.datos)) continue;
            for (var j = 0; j < remesa.datos.length; j++) {
                var r = remesa.datos[j];
                if (!r || typeof r !== "object") continue;
                if (typeof r.nombre !== "string") continue; // defensa de tipo
                if (r.nombre === NOMBRE) contador++;
            }
        }
        alert("Reservas de " + NOMBRE + ": " + contador);
    });
}

function contarReservasPorCategoria() {
    var CATEGORIA = "Ecógrafos"; // ← CAMBIAR (con tilde si la BD la tiene)
    rest.get("https://undefined.ua.es/telemedicina/api/datos", function(estado, respuesta) {
        if (!respuesta || !Array.isArray(respuesta)) return;
        var contador = 0;
        for (var i = 0; i < respuesta.length; i++) {
            var remesa = respuesta[i];
            if (!remesa || typeof remesa !== "object" || !Array.isArray(remesa.datos)) continue;
            for (var j = 0; j < remesa.datos.length; j++) {
                var r = remesa.datos[j];
                if (!r || typeof r !== "object") continue;
                if (typeof r["categoría"] !== "string") continue; // defensa de tipo
                if (r["categoría"] === CATEGORIA) contador++;
            }
        }
        alert("Reservas de " + CATEGORIA + ": " + contador);
    });
}

function contarReservasPorArea() {
    var AREA = 16; // ← CAMBIAR
    rest.get("https://undefined.ua.es/telemedicina/api/datos", function(estado, respuesta) {
        if (!respuesta || !Array.isArray(respuesta)) return;
        var contador = 0;
        for (var i = 0; i < respuesta.length; i++) {
            var remesa = respuesta[i];
            if (!remesa || typeof remesa !== "object") continue;
            var idArea = Number(remesa.id_area);
            if (isNaN(idArea) || idArea !== AREA) continue;
            if (!Array.isArray(remesa.datos)) continue;
            for (var j = 0; j < remesa.datos.length; j++) {
                var r = remesa.datos[j];
                if (!r || typeof r !== "object") continue;
                contador++;
            }
        }
        alert("Reservas del área " + AREA + ": " + contador);
    });

<!-- HTML: adapta estos IDs si ya tienes otros en tu página -->
<label for="ID_INPUT_AREA">ID del área médica:</label>
<input type="number" id="ID_INPUT_AREA">
<button onclick="buscarPorAreaMinisterio()">Contar remesas</button>
<p>Remesas encontradas: <span id="ID_RESULTADO_AREA">0</span></p>

// Cuenta cuántas remesas de la respuesta tienen el id_area indicado
function buscarPorAreaMinisterio() {
    var idBuscado = Number(document.getElementById("ID_INPUT_AREA").value);
    var resultado = document.getElementById("ID_RESULTADO_AREA");

    if (!Number.isInteger(idBuscado)) {
        resultado.textContent = "Introduce un ID válido";
        return;
    }

    rest.get(URL_MINISTERIO, function(estado, respuesta) {
        if (estado < 200 || estado >= 300 || !Array.isArray(respuesta)) {
            resultado.textContent = "No se pudieron cargar los datos";
            return;
        }

        var contador = 0;

        for (var i = 0; i < respuesta.length; i++) {
            var remesa = respuesta[i];

            if (remesa && typeof remesa === "object" && !Array.isArray(remesa)) {
                if (Number(remesa.id_area) === idBuscado) {
                    contador++;
                }
            }
        }

        resultado.textContent = contador;
    });
}

// Cuenta las reservas de las remesas del área 16 cuyo estado coincide
function contarReservasPorEstadoArea16() {
    var ESTADO_BUSCADO = "finalizada";

    rest.get(URL_MINISTERIO, function(estado, respuesta) {
        if (estado < 200 || estado >= 300 || !Array.isArray(respuesta)) {
            console.error("No se pudieron cargar los datos del Ministerio.");
            return;
        }

        var contador = 0;

        for (var i = 0; i < respuesta.length; i++) {
            var remesa = respuesta[i];

            if (!remesa || typeof remesa !== "object" || Array.isArray(remesa)) {
                continue;
            }

            if (Number(remesa.id_area) !== 16 || !Array.isArray(remesa.datos)) {
                continue;
            }

            for (var j = 0; j < remesa.datos.length; j++) {
                var reserva = remesa.datos[j];

                if (reserva && typeof reserva === "object" && !Array.isArray(reserva)) {
                    if (reserva.estado === ESTADO_BUSCADO) {
                        contador++;
                    }
                }
            }
        }

        alert("Reservas finalizadas del área 16: " + contador);
    });
}

// Cuenta reservas cuyo campo de texto coincide, sin llamar a métodos en valores no string
function contarPorTextoSeguro(datosMinisterio, NOMBRE_CAMPO, TEXTO_BUSCADO) {
    if (!Array.isArray(datosMinisterio) || typeof TEXTO_BUSCADO !== "string") {
        return 0;
    }

    var textoBuscado = TEXTO_BUSCADO.toLowerCase();
    var contador = 0;

    for (var i = 0; i < datosMinisterio.length; i++) {
        var remesa = datosMinisterio[i];

        if (!remesa || typeof remesa !== "object" || Array.isArray(remesa)) {
            continue;
        }

        if (Number(remesa.id_area) !== 16 || !Array.isArray(remesa.datos)) {
            continue;
        }

        for (var j = 0; j < remesa.datos.length; j++) {
            var reserva = remesa.datos[j];

            if (!reserva || typeof reserva !== "object" || Array.isArray(reserva)) {
                continue;
            }

            if (
                Object.prototype.hasOwnProperty.call(reserva, NOMBRE_CAMPO) &&
                typeof reserva[NOMBRE_CAMPO] === "string"
            ) {
                if (reserva[NOMBRE_CAMPO].toLowerCase() === textoBuscado) {
                    contador++;
                }
            }
        }
    }

    return contador;
}

// Ejemplo: contar reservas finalizadas del área 16
function buscarFinalizadasSeguro() {
    rest.get(URL_MINISTERIO, function(estado, respuesta) {
        if (estado < 200 || estado >= 300 || !Array.isArray(respuesta)) {
            console.error("No se pudieron cargar los datos del Ministerio.");
            return;
        }

        var total = contarPorTextoSeguro(respuesta, "estado", "finalizada");
        alert("Reservas finalizadas del área 16: " + total);
    });
}

*/