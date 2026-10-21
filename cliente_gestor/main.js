// rest.get(url, callback)
// rest.post(url, body, callback)
// rest.put(url, body, callback)
// rest.delete(url, callback)
// function callback(estado, respuesta) {...}

var login = document.getElementById("login");
var registro = document.getElementById("registro");
var main = document.getElementById("main");
var detalleRecurso = document.getElementById("detalleRecurso");
var actual = login;
var anterior = login;
var id_gestor = null;
var id_recurso = null;
var conexion = null;

var categoriaArray = [
    "",
    "Ecógrafos",
    "Pulsioxímetros",
    "Bombas de infusión"
];

var modeloArray = [
    "",
    "Ecógrafo Doppler SonoScan v4",
    "Pulsioxímetro SatuMax 200",
    "Bomba de Infusión Continua FlowMaster",
    "Ecógrafo Portátil PocketView"
];

// modeloCategoriaArray[idModelo] = idCategoria, para poder pintar la
// categoría de un recurso a partir de su modelo
var modeloCategoriaArray = [
    "",
    1, // Ecógrafo Doppler SonoScan v4       -> Ecógrafos
    2, // Pulsioxímetro SatuMax 200          -> Pulsioxímetros
    3, // Bomba de Infusión Continua FlowMaster -> Bombas de infusión
    1  // Ecógrafo Portátil PocketView       -> Ecógrafos
];

var ubicacionArray = [
    "",
    "Sala de Urgencias",
    "Laboratorio Central",
    "Almacén Principal"
];

var estadoArray = [
    "Operativo",
    "De baja",
    "En mantenimiento"
];

// Configuración Ministerio de Sanidad (Área 16: Psiquiatría)
var ID_AREA_ASIGNADA = 16;
var URL_MINISTERIO = "https://undefined.ua.es/telemedicina/api/datos";

var AREAS_MEDICAS = {
    1: "Alergología",
    2: "Anestesiología",
    3: "Cardiología",
    4: "Cirugía General",
    5: "Dermatología",
    6: "Aparato Digestivo",
    7: "Endocrinología",
    8: "Ginecología",
    9: "Hematología",
    10: "Medicina Interna",
    11: "Neumología",
    12: "Neurología",
    13: "Oftalmología",
    14: "Oncología",
    15: "Pediatría",
    16: "Psiquiatría",
    17: "Traumatología",
    18: "Urología"
};

function cambiarVista(vistaNueva){
    actual.classList.remove("activa");
    actual.classList.add("inactiva");
    anterior = actual;
    actual = vistaNueva;
    actual.classList.remove("inactiva");
    actual.classList.add("activa");
}

function entrar(){
    var user = document.getElementById("user").value
    var contra = document.getElementById("contra").value

    console.log("Usuario:", user, "Contraseña:", contra);

    rest.post("/api/gestores/login", {user: user, contra: contra}, function(estado, respuesta){
        console.log("Estado:", estado, "Respuesta:", respuesta);
        if (estado != 200){
            alert(respuesta);
            return;
        } else {
            // Guardar token JWT y el id del gestor
            if (typeof respuesta === "object" && respuesta !== null && respuesta.token) {
                id_gestor = parseInt(respuesta.id);
                rest.token = respuesta.token;
            } else {
                id_gestor = parseInt(respuesta);
            }

            rest.get("/api/gestores/" + id_gestor, function(estado, respuestaGestor){
                if (estado != 200){
                    alert("Error cargando los datos del gestor");
                    return;
                }
                document.getElementById("nombreGestor").innerHTML = respuestaGestor.nombre + " " + respuestaGestor.apellidos;
                document.getElementById("user").value = "";
                document.getElementById("contra").value = "";
                actualizarRecursos(null);
                cargarRankingMinisterio();

                conexion = new WebSocket("ws://localhost:4444", "conexion");

                cambiarVista(main);
                conexion.addEventListener("open", function () {
                    console.log("Conexión WebSocket abierta");
                    conexion.send(JSON.stringify({
                        operacion: "gestor",
                        id: id_gestor
                    }));
                });

                conexion.addEventListener("message", function (msg) {
                msg = JSON.parse(msg.data);
                switch (msg.operacion) {
                    case "resenyas": // 
                        var tablaAvisos = document.getElementById("avisosGestor");
                        tablaAvisos.getElementsByTagName("tbody")[0].innerHTML += 
                            "<tr style='background-color:" + msg.color + "'>" +
                            "<td>" + msg.fecha + "</td>" +
                            "<td>" + msg.origen + "</td>" +
                            "<td>" + msg.texto + "</td></tr>";
                        break;
                    
                }
            });
            })

    }

    });

}

function registrar(){
    cambiarVista(registro);
}

function cancelarReg(){
    if (anterior == login){
        document.getElementById("user").value = "";
        document.getElementById("contra").value = "";
        cambiarVista(login);
    } else {
        cambiarVista(main);
    }
}

function cerrarSesion(){
    if (conexion) {
        conexion.close();
        conexion = null;
    }
    rest.token = null;
    id_gestor = null;
    var tablaAvisos = document.getElementById("avisosGestor");
    tablaAvisos.getElementsByTagName("tbody")[0].innerHTML = "";
    var tablaRanking = document.getElementById("tablaRanking");
    if (tablaRanking) {
        tablaRanking.getElementsByTagName("tbody")[0].innerHTML = "";
    }
    cambiarVista(login);
}

function actualizarRecursos(filtros){
    var url = "/api/recursos";
    if (filtros != null){
        url += filtros;
    }

    rest.get(url, function(estado, respuesta){
        console.log("Estado:", estado, "Recursos:", respuesta);
        if (estado != 200){
            alert("Error cargando los recursos");
            return;
        }
        var tabla = document.getElementById("tablaRecursos");
        tabla.getElementsByTagName("tbody")[0].innerHTML = "";
        for (var i=0; i < respuesta.length; i++){
            var idCategoria = modeloCategoriaArray[respuesta[i].modelo];
            tabla.getElementsByTagName("tbody")[0].innerHTML += "<tr><td>" + respuesta[i].numero_serie + "</td><td>" + categoriaArray[idCategoria] + "</td><td>" + modeloArray[respuesta[i].modelo] + "</td><td>" + ubicacionArray[respuesta[i].ubicacion] + "</td><td>" + estadoArray[respuesta[i].estado] + "</td><td>" + "<button onclick='abrir(" + respuesta[i].id + ")'>Abrir</button> <button onclick='borrar(" + respuesta[i].id + ")'>X</button></td></tr>";
        }
    });
}

function buscar(){
    var cate = document.getElementById("categoriaSelect").value;
    var mod = document.getElementById("modeloSelect").value;
    var ubi = document.getElementById("ubicacionSelect").value;
    var est = document.getElementById("estadoSelect").value;

    var filtros = "?";
    if (cate != ""){
        filtros += "categoria=" + cate + "&";
    }
    if (mod != ""){
        filtros += "modelo=" + mod + "&";
    }
    if (ubi != ""){
        filtros += "ubicacion=" + ubi + "&";
    }
    if (est != ""){
        filtros += "estado=" + est + "&";
    }
    console.log("Filtros:", filtros);
    actualizarRecursos(filtros);
}

function guardar(){
    var datos = {
        nombre:    document.getElementById("name").value,
        apellidos: document.getElementById("ape").value,
        usuario:   document.getElementById("userNuevo").value,
        password:  document.getElementById("contraNueva").value
    };

    // Comprobar que todos los campos están completos
    var entero = true;
    for (var clave in datos){
        if (datos[clave] == ""){
            entero = false;
            break;
        }
    }
    
    if (anterior == login && entero){
        rest.post("/api/gestores", datos, function(estado, respuesta){
            alert(respuesta);
            if (estado == 201){
                document.getElementById("name").value = "";
                document.getElementById("ape").value = "";
                document.getElementById("userNuevo").value = "";
                document.getElementById("contraNueva").value = "";
                cambiarVista(login);
            }
        })
    } else if (anterior == login){
        alert("Por favor, rellena todos los campos");
    } else {
        rest.put("/api/gestores/" + id_gestor, datos, function(estado, respuesta){
            alert(respuesta);
            rest.get("/api/gestores/" + id_gestor, function(estado, respuesta){
                document.getElementById("nombreGestor").innerHTML = respuesta.nombre + " " + respuesta.apellidos;
            });
            document.getElementById("name").value = "";
            document.getElementById("ape").value = "";
            document.getElementById("userNuevo").value = "";
            document.getElementById("contraNueva").value = "";
            if (estado == 200){
                cambiarVista(main);
            }
        });
    }
}

function abrir(idRecurso){
    id_recurso = idRecurso;
    
    rest.get("/api/recursos/" + idRecurso, function(estado, respuestaRecurso){
        if (estado == 200) {
            actualizarSelectsRecurso(respuestaRecurso);            
            document.getElementById("detalleNumeroSerie").value = respuestaRecurso.numero_serie;
            document.getElementById("detalleEstado").value = respuestaRecurso.estado;
        }
    });

    actualizarReservas(idRecurso);
    actualizarResenyas(idRecurso);
    cambiarVista(detalleRecurso);
}

function borrar(id){
    rest.delete("/api/recursos/" + id, function(estado, respuesta){
        alert(respuesta);
    if (estado === 200) {
            actualizarRecursos(null);
        }
    });
}

function añadirRecurso(){
    document.getElementById("detalleCategoria").value = "";
    document.getElementById("detalleModelo").value = "";
    document.getElementById("detalleNumeroSerie").value = "";
    document.getElementById("detalleUbicacion").value = "";
    document.getElementById("detalleEstado").value = "";
    actualizarSelectsRecurso();
    cambiarVista(detalleRecurso);
}

function actualizarSelectsRecurso(datos){
    rest.get("/api/categorias", function(estado, respuesta){
        if (estado == 200){
            var select = document.getElementById("detalleCategoria");
            select.innerHTML = "<option value=''>Selecciona una categoría</option>";
            for (var i=0; i < respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
            }
            // datos si se llama desde abrir, null si desde añadirRecurso
            if (datos) select.value = modeloCategoriaArray[datos.modelo] || "";
        }
    });

    rest.get("/api/modelos", function(estado, respuesta){
        if (estado == 200){
            var select = document.getElementById("detalleModelo");
            select.innerHTML = "<option value=''>Selecciona un modelo</option>";
            for (var i=0; i < respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
            }
            if(datos) select.value = datos.modelo;
        }
    });

    rest.get("/api/ubicaciones", function(estado, respuesta){
        if (estado == 200){
            var select = document.getElementById("detalleUbicacion");
            select.innerHTML = "<option value=''>Selecciona una ubicación</option>";
            for (var i=0; i < respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
            }
            if(datos) select.value = datos.ubicacion;
        }
    });
}

function volverListado(){
    var tabla = document.getElementById("tablaReservas");
    tabla.getElementsByTagName("tbody")[0].innerHTML = "";

    var tabla = document.getElementById("tablaResenyas");
    tabla.getElementsByTagName("tbody")[0].innerHTML = "";

    id_recurso = null;
    console.log("Volviendo al listado. ID recurso:", id_recurso);
    cambiarVista(main);
}

function guardarRecurso(){
    var datos = {
        categoria: document.getElementById("detalleCategoria").value,
        modelo: document.getElementById("detalleModelo").value,
        numero_serie: document.getElementById("detalleNumeroSerie").value,
        ubicacion: document.getElementById("detalleUbicacion").value,
        estado: document.getElementById("detalleEstado").value
    };
    console.log("Datos del nuevo recurso:", datos);

    var entero = true;
    for (var clave in datos){
        if (datos[clave] == ""){
            entero = false;
            break;
        }
    }
    console.log("¿Datos completos?", entero, "ID recurso:", id_recurso);
    if (entero && id_recurso == null){
        rest.post("/api/recursos", datos, function(estado, respuesta){
            alert(respuesta);
            if (estado == 201){
                conexion.send(JSON.stringify({
                    operacion: "recursos",
                    datos: datos,
                    idGestor: id_gestor
                }));
                actualizarRecursos(null);
                volverListado();
            }
        });
    } else {
        if (id_recurso == null){
            alert("Rellena todos los campos!");
            return;
        }
        rest.put("/api/recursos/" + id_recurso, datos, function(estado, respuesta){
            alert(respuesta);
        });
        id_recurso = null;
        actualizarRecursos(null);
        volverListado();
    }
}

function actualizarReservas(id_rec){
    rest.get("/api/recursos/"+id_rec+"/reservas",function(estado, respuesta){
        var tabla = document.getElementById("tablaReservas");
        if (!tabla) return;
        var tbody = tabla.getElementsByTagName("tbody")[0];
        if (!tbody) return;
        tbody.innerHTML = "";
        if (estado !== 200 || !Array.isArray(respuesta)) return;

        for (let i=0; i < respuesta.length; i++){
            let color = cogerColor(respuesta[i].horas_estimadas, respuesta[i].fecha_peticion, respuesta[i].fecha_inicio, respuesta[i].fecha_fin);
            let sanitario = respuesta[i].sanitario;
            let horas = respuesta[i].horas_estimadas;
            let fpet = respuesta[i].fecha_peticion ? new Date(respuesta[i].fecha_peticion).toLocaleString('es-ES') : "";
            let fi   = respuesta[i].fecha_inicio   ? new Date(respuesta[i].fecha_inicio).toLocaleString('es-ES')   : "";
            let ff   = respuesta[i].fecha_fin   ? new Date(respuesta[i].fecha_fin).toLocaleString('es-ES')    : "";

            rest.get("/api/sanitarios/" + sanitario, function(estado, respuestaSanitario){
                var nombre_sanitario = "Desconocido";
                if (estado == 200 && respuestaSanitario){
                    nombre_sanitario = (respuestaSanitario.nombre || "") + " " + (respuestaSanitario.apellidos || "");
                } else {
                    console.log("Error cargando datos del sanitario con id " + sanitario);
                }
                
                tbody.innerHTML += '<tr class="' + color + '"><td>' + nombre_sanitario + '</td><td>' + horas + '</td><td>' + fpet + '</td><td>' + fi + '</td><td>' + ff + '</td></tr>';
            });

        }
    });
}

function actualizarResenyas(id_rec){
    rest.get("/api/recursos/"+id_rec+"/resenyas",function(estado, respuesta){
        var tabla = document.getElementById("tablaResenyas");
        if (!tabla) return;
        var tbody = tabla.getElementsByTagName("tbody")[0];
        if (!tbody) return;
        tbody.innerHTML = "";
        if (estado !== 200 || !Array.isArray(respuesta)) return;

        for (let i=0; i < respuesta.length; i++){
            let id_valoracion = respuesta[i].id;
            let sanitario = respuesta[i].sanitario;
            let valoracion = respuesta[i].valor;
            let comentario = respuesta[i].descripcion;
            let fecha = respuesta[i].fecha ? new Date(respuesta[i].fecha).toLocaleString('es-ES') : "";
            
            rest.get("/api/sanitarios/" + sanitario, function(estado, respuestaSanitario){
                var nombre_sanitario = "Desconocido";
                if (estado == 200 && respuestaSanitario){
                    nombre_sanitario = (respuestaSanitario.nombre || "") + " " + (respuestaSanitario.apellidos || "");
                } else {
                    console.log("Error cargando datos del sanitario con id " + sanitario);
                }
                
                tbody.innerHTML += "<tr><td>" + fecha + "</td><td>" + nombre_sanitario + "</td><td>" + valoracion + "</td><td>" + comentario + "</td><td><button onclick='subirValoracion(" + id_rec + "," + id_valoracion + ")'>Subir valoración</button></td></tr>";
            });

        }
    });
}

function cogerColor(horas, fpet, fi, ff){
    const ahora = new Date();
    fpet = fpet ? new Date(fpet) : null;
    fi = fi ? new Date(fi) : null;
    ff = ff ? new Date(ff) : null;
    let horasUsando = ((ahora - fi) / (1000 * 60 * 60)).toFixed(0);
    console.log("ff:", ff);
    if (ff){ 
        console.log("blanco");
        return "blanco"
    } else if (!fi){
        console.log("verde");
        return "verde"
    } else if (horasUsando > horas){
        console.log("rojo");
        return "rojo"
    } else {
        console.log("azul");
        return "azul"
    }
}
function subirValoracion(id_rec, id_valoracion) {
    rest.get(
        "/api/recursos/" + id_rec + "/resenyas/",
        function(estado, respuesta) {
            if (estado !== 200) {
                console.log("Error obteniendo reseñas:", respuesta);
                return;
            }

            var valoracion = respuesta.find(r => r.id == id_valoracion);

            if (!valoracion) {
                console.log("Reseña no encontrada");
                return;
            }

            if (valoracion.valor >= 5) {
                actualizarResenyas(id_rec);
                return;
            }

            rest.put(
                "/api/recursos/resenyas/" + id_valoracion,
                { valor: 1 },
                function(estadoPut, respuestaPut) {
                    console.log(
                        "Estado:",
                        estadoPut,
                        "Respuesta al subir valoración:",
                        respuestaPut
                    );

                    if (estadoPut === 200) {
                        actualizarResenyas(id_rec);
                    } else {
                        alert(respuestaPut);
                    }
                }
            );
        }
    );
}

// ===============================================================================
// INTEGRACIÓN CON EL MINISTERIO DE SANIDAD (PARTE 1)
// ===============================================================================

// Helper para envolver peticiones GET de rest.js en Promesas y permitir await
function pedirAsync(url) {
    return new Promise(function(resolve, reject) {
        rest.get(url, function(estado, respuesta) {
            if (estado >= 200 && estado < 300) {
                resolve(respuesta);
            } else {
                reject({ estado: estado, respuesta: respuesta });
            }
        });
    });
}

// Helper para formatear fechas a YYYY-MM-DD
function formatearFecha(f) {
    if (!f) return null;
    try {
        var d = new Date(f);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split("T")[0];
    } catch (e) {
        return null;
    }
}

// Función para recolectar todas las reservas mediante peticiones encadenadas y enviarlas (POST)
async function enviarReservasMinisterio() {
    try {
        console.log("Iniciando recopilación de reservas para el Ministerio...");

        // 1. Obtener todos los recursos del hospital
        var recursos = await pedirAsync("/api/recursos");
        if (!Array.isArray(recursos) || recursos.length === 0) {
            alert("No hay recursos registrados para recopilar reservas.");
            return;
        }

        var listaDatos = [];

        // 2. GETs: Para cada recurso, obtener sus reservas 
        for (var i = 0; i < recursos.length; i++) {
            var rec = recursos[i];
            if (!rec || rec.id === undefined) continue;

            var reservas = [];
            try {
                reservas = await pedirAsync("/api/recursos/" + rec.id + "/reservas");
            } catch (errRes) {
                console.warn("No se pudieron cargar las reservas del recurso ID " + rec.id, errRes);
                continue;
            }

            if (!Array.isArray(reservas)) continue;

            // Determinar la categoría del recurso a partir de su modelo
            var idCat = modeloCategoriaArray[rec.modelo];
            var nombreCategoria = categoriaArray[idCat] || "Equipamiento médico";

            // 3. Para cada reserva, obtener los datos del sanitario
            for (var j = 0; j < reservas.length; j++) {
                var r = reservas[j];
                if (!r) continue;
                var nombreSanitario = "Sanitario";
                var apellidosSanitario = "Desconocido";

                if (r.sanitario) {
                    try {
                        var datosSanitario = await pedirAsync("/api/sanitarios/" + r.sanitario);
                        if (datosSanitario && datosSanitario.nombre) {
                            nombreSanitario = datosSanitario.nombre;
                            apellidosSanitario = datosSanitario.apellidos || "";
                        }
                    } catch (errSan) {
                        console.warn("No se pudieron cargar datos del sanitario ID " + r.sanitario, errSan);
                    }
                }

                listaDatos.push({
                    nombre: nombreSanitario,
                    apellidos: apellidosSanitario,
                    categoría: nombreCategoria,
                    categoria: nombreCategoria,
                    horas_estimadas: Number(r.horas_estimadas) || 0,
                    fec_pet: formatearFecha(r.fecha_peticion),
                    fec_ini: formatearFecha(r.fecha_inicio),
                    fecha_fin: formatearFecha(r.fecha_fin)
                });
            }
        }

        if (listaDatos.length === 0) {
            alert("No se encontraron reservas registradas para enviar.");
            return;
        }

        // 4. Construir la remesa oficial según especificación del Ministerio
        var fechaHoy = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
        var remesa = {
            id_area: ID_AREA_ASIGNADA, // Área 16: Psiquiatría
            fecha: fechaHoy,
            datos: listaDatos
        };

        console.log("Remesa a enviar al Ministerio:", remesa);

        // 5. Enviar la remesa al Ministerio mediante POST
        rest.post(URL_MINISTERIO, remesa, function(estado, respuesta) {
            console.log("Respuesta Ministerio (POST):", estado, respuesta);
            if (estado >= 200 && estado < 300) {
                alert("¡Remesa enviada con éxito al Ministerio de Sanidad!\nTotal de reservas remitidas: " + listaDatos.length);
                cargarRankingMinisterio();
            } else {
                alert("Error al enviar reservas al Ministerio.\nCódigo: " + estado + "\nDetalle: " + JSON.stringify(respuesta));
            }
        });

    } catch (error) {
        console.error("Error durante la recolección o envío de reservas:", error);
        alert("Ocurrió un error al preparar los datos de las reservas para el Ministerio.");
    }
}

// Función para obtener las remesas del Ministerio (GET), aplicar validaciones defensivas y mostrar el Ranking
function cargarRankingMinisterio() {
    rest.get(URL_MINISTERIO, function(estado, respuesta) {
        if (estado < 200 || estado >= 300) {
            console.error("Error obteniendo datos del Ministerio:", estado, respuesta);
            alert("No se pudieron obtener los datos de la API del Ministerio.");
            return;
        }

        // Inicializar contadores para las 18 áreas oficiales
        var conteoPorArea = {};
        for (var a = 1; a <= 18; a++) {
            conteoPorArea[a] = 0;
        }

        // ===============================================================================
        // VALIDACIONES DEFENSIVAS
        // No asumimos que los datos recibidos sean válidos ni homogéneos
        // ===============================================================================
        if (!respuesta) {
            console.warn("La respuesta del Ministerio está vacía o es nula.");
            return;
        }

        if (!Array.isArray(respuesta)) {
            console.warn("La respuesta del Ministerio no es un array válido:", respuesta);
            return;
        }

        for (var i = 0; i < respuesta.length; i++) {
            var remesa = respuesta[i];

            // 1. Comprobar que el elemento exista y sea un objeto puro (no array ni null)
            if (!remesa) {
                continue;
            }
            if (typeof remesa !== "object") {
                continue;
            }
            if (Array.isArray(remesa)) {
                continue;
            }

            // 2. Comprobar que contenga la propiedad id_area
            if (!("id_area" in remesa)) {
                continue;
            }
            if (remesa.id_area === null || remesa.id_area === undefined) {
                continue;
            }

            // 3. Comprobar que id_area sea un número entero válido
            var idArea = Number(remesa.id_area);
            if (isNaN(idArea)) {
                continue;
            }
            if (!Number.isInteger(idArea)) {
                continue;
            }

            // 4. Comprobar que id_area pertenezca al catálogo oficial (1 al 18)
            if (idArea < 1 || idArea > 18) {
                continue; // Descarta áreas no oficiales como 911
            }

            // 5. Comprobar que exista la propiedad datos y sea un array
            if (!("datos" in remesa)) {
                continue;
            }
            if (!remesa.datos) {
                continue;
            }
            if (!Array.isArray(remesa.datos)) {
                continue;
            }

            // 6. Validar cada reserva dentro de la remesa
            for (var j = 0; j < remesa.datos.length; j++) {
                var reserva = remesa.datos[j];

                // La reserva debe existir y ser un objeto
                if (!reserva) {
                    continue;
                }
                if (typeof reserva !== "object") {
                    continue;
                }
                if (Array.isArray(reserva)) {
                    continue;
                }
                // Incremento seguro del acumulador del área
                conteoPorArea[idArea]++;
            }
        }

        // ===============================================================================
        // ORDENACIÓN Y RENDERIZADO DEL RANKING
        // ===============================================================================
        var ranking = [];
        for (var id = 1; id <= 18; id++) {
            ranking.push({
                id: id,
                nombre: AREAS_MEDICAS[id],
                total: conteoPorArea[id]
            });
        }

        // Ordenar de forma descendente por total de reservas
        ranking.sort(function(x, y) {
            return y.total - x.total;
        });

        // Pintar en el HTML
        var tabla = document.getElementById("tablaRanking");
        if (!tabla) return;
        var tbody = tabla.getElementsByTagName("tbody")[0];
        if (!tbody) return;

        tbody.innerHTML = "";

        for (var pos = 0; pos < ranking.length; pos++) {
            var item = ranking[pos];
            var fila = document.createElement("tr");

            // Resaltar visualmente nuestra área médica asignada
            if (item.id === ID_AREA_ASIGNADA) {
                fila.style.fontWeight = "bold";
                fila.style.backgroundColor = "#ffe8ef";
            }

            fila.innerHTML =
                "<td>" + (pos + 1) + "</td>" +
                "<td>" + item.nombre + (item.id === ID_AREA_ASIGNADA ? " <strong>(Mi Área)</strong>" : "") + "</td>" +
                "<td>" + item.total.toLocaleString("es-ES") + "</td>";

            tbody.appendChild(fila);
        }
    });
}
