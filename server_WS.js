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
