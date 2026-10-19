//Vinculamos cliente - servidor. Obtener una referencia a la app RPC (instancia de la aplicación gestion pacientes del servidor localhost)
var app = rpc("localhost", "gestion_pacientes");

//Obtener referencias a los procedimientos remotos registrados por el servidor.
// var obtenerPacientes = app.procedure("obtenerPacientes"); //obtenerPacientes es una funcion
var obtenerCategorias = app.procedure("obtenerCategorias");
var obtenerModelos = app.procedure("obtenerModelos");
var obtenerUbicaciones = app.procedure("obtenerUbicaciones");
var loginSanitario = app.procedure("loginSanitario");
var crearSanitario = app.procedure("crearSanitario");
var actualizarSanitario = app.procedure("actualizarSanitario");
var obtenerSanitario = app.procedure("obtenerSanitario");
var obtenerRecursos = app.procedure("obtenerRecursos");
var tiempoPendiente = app.procedure("tiempoPendiente");
var obtenerReservas = app.procedure("obtenerReservas");
var obtenerResenyas = app.procedure("obtenerResenyas");
var crearResenya = app.procedure("crearResenya");
var reservarRecurso = app.procedure("reservarRecurso");
var cancelarReserva = app.procedure("cancelarReserva");
var iniciarReserva = app.procedure("iniciarReserva");
var finalizarReserva = app.procedure("finalizarReserva");
var obtenerRecurso = app.procedure("obtenerRecurso");

let categs = null;
let modelos = null;
let ubis = null;

obtenerCategorias(function(categ){
    categs = categ;
});
obtenerModelos(function(modelo){
    modelos = modelo;
});
obtenerUbicaciones(function(ubi){    
    ubis = ubi;
});

// Cambio vistas
var actual = login;
var anterior = login;

// Sanitario actual (id)
var sanitActual = null;
var recursoActual = null;

// WS
var conexion = null;

function cambiarVista(vistaNueva){
    if (vistaNueva == main){
        actualizarTablas();
    }
    actual.classList.remove("activa");
    actual.classList.add("inactiva");
    anterior = actual;
    actual = vistaNueva;
    actual.classList.remove("inactiva");
    actual.classList.add("activa");
}

function entrar(){
    var login = document.getElementById("user").value; 
    var pass = document.getElementById("contra").value; 
    loginSanitario(login, pass, function(id){
        if (id == null){
            alert("Login incorrecto");
        } else { 
            sanitActual = id;
            obtenerSanitario(sanitActual, function(cb){
                var nombre = cb.nombre;
                var apellidos = cb.apellidos;

                document.getElementById("nombreSanit").innerHTML = nombre + " " + apellidos;
            });

            document.getElementById("user").value = ""; 
            document.getElementById("contra").value = ""; 

            // Crear conexión WS
            conexion = new WebSocket("ws://localhost:4444", "conexion");

            cambiarVista(main);
            conexion.addEventListener("open", function () {
                console.log("Conexión WebSocket establecida");
                conexion.send(JSON.stringify({
                    operacion: "sanitario",
                    id: sanitActual
                }));
            });

            conexion.addEventListener("message", function (msg) {
                msg = JSON.parse(msg.data);
                switch (msg.operacion) {
                    case "reservas": // 
                        var tablaAvisos = document.getElementById("avisosSanit");
                        tablaAvisos.getElementsByTagName("tbody")[0].innerHTML += 
                            "<tr style='background-color:" + msg.color + "'>" +
                            "<td>" + msg.fecha + "</td>" +
                            "<td>" + msg.origen + "</td>" +
                            "<td>" + msg.texto + "</td></tr>";                        
                        break;

                    case "recursos": // 
                        var tablaAvisos = document.getElementById("avisosSanit");
                            tablaAvisos.getElementsByTagName("tbody")[0].innerHTML += 
                                "<tr style='background-color:" + msg.color + "'>" +
                                "<td>" + msg.fecha + "</td>" +
                                "<td>" + msg.origen + "</td>" +
                                "<td>" + msg.texto + "</td></tr>";
                            break;
                    
                }
            });

        }
    });
}

function registrar(){
    cambiarVista(registro)
}

function guardar(){
    var nombre = document.getElementById("name").value;
    var apell = document.getElementById("ape").value;
    var log = document.getElementById("userNuevo").value;
    var contra = document.getElementById("contraNueva").value;

    var datos = {
        "nombre": nombre,
        "apellidos": apell,
        "usuario": log,
        "password": contra
    }

    if (anterior == login){
        crearSanitario(datos, function(cb){
            if (cb == null){
                alert("Campos vacíos o usuario repetido, intentelo de nuevo")
            } else {
                alert("Usuario creado correctamente")
                document.getElementById("name").value = "";
                document.getElementById("ape").value = "";
                document.getElementById("userNuevo").value = "";
                document.getElementById("contraNueva").value = "";
                cambiarVista(login);
            }
        });
    } else {
        actualizarSanitario(sanitActual, datos, function(cb){
            if (cb != null){
                alert("Usuario actualizado correctamente");
                document.getElementById("name").value = "";
                document.getElementById("ape").value = "";
                document.getElementById("userNuevo").value = "";
                document.getElementById("contraNueva").value = "";
                obtenerSanitario(sanitActual, function(cb){
                    var nombre = cb.nombre;
                    var apellidos = cb.apellidos;

                    document.getElementById("nombreSanit").innerHTML = nombre + " " + apellidos;
                });
                cambiarVista(main);
            } else {
                alert("No es posible cambiar el usuario a uno existente")
            }
        });
    }
}

function cancelarReg(){
    if (anterior == login){
        cambiarVista(login);
    } else {
        cambiarVista(main);
    }
}

function cerrarSesion(){
    sanitActual = null;
    conexion.close();
    var tablaAvisos = document.getElementById("avisosSanit");
    tablaAvisos.getElementsByTagName("tbody")[0].innerHTML = "";
    cambiarVista(login);
}

function añadirRecurso() {
    document.getElementById("detalleCategoria").innerHTML = "";
    document.getElementById("detalleModelo").innerHTML = "";

    obtenerCategorias(function(categs) {
        for (var i = 0; i < categs.length; i++) {
            document.getElementById("detalleCategoria").innerHTML += 
                '<option value="' + categs[i].id + '">' + categs[i].nombre + '</option>';
        }
        document.getElementById("detalleCategoria").value = 1;
        document.getElementById("detalleHorasUso").value = 1;
        actualizarModelo();
        cambiarVista(detalleRecurso);
    });
}

function actualizarModelo(){
    document.getElementById("detalleModelo").innerHTML = "";
    obtenerModelos(function(models) {
            var cat = document.getElementById("detalleCategoria").value;
            
            for (var j = 0; j < models.length; j++) {
                if (models[j].categoria == cat) {
                    document.getElementById("detalleModelo").innerHTML += 
                        '<option value="' + models[j].id + '">' + models[j].nombre + '</option>';
                }
            }
            buscarReserva();
        });
}

function volverListado(){
    cambiarVista(main)
}

function buscarReserva(){
    var cat = document.getElementById("detalleCategoria").value;
    var mod = document.getElementById("detalleModelo").value;
    var horas = document.getElementById("detalleHorasUso").value;

    obtenerRecursos(mod, function(recursos){
        var tabla = document.getElementById("tablaReservas");
        tabla.getElementsByTagName("tbody")[0].innerHTML = "";

        if (recursos == null){
            tabla.getElementsByTagName("tbody")[0].innerHTML = '<tr><td colspan="5">No hay recursos con estas especificaciones.</td></tr>';
        } else {
            for (let i=0; i < recursos.length; i++){
                var tiempo = null;
                tiempoPendiente(recursos[i].id, function(t){
                    obtenerResenyas(recursos[i].id, function(resenyas){
                        var suma = 0; 
                        resenyas.forEach(r => {
                            suma += r.valor;
                        });
                        media = (suma / resenyas.length).toFixed(1);
                        if (isNaN(media)){
                            media = "No hay valoraciones."
                        }

                        suma = 0; 

                        if (t == 0){
                            tiempo = "Disponible";
                            boton = '<button onclick="retirar(' + recursos[i].id + ',' + sanitActual + ',' + horas + ')">Retirar</button>';
                        } else {
                            tiempo = t;
                            boton = '<button onclick="reservar(' + recursos[i].id + ',' + sanitActual + ',' + horas + ')">Reservar</button>';
                        }
                        tabla.getElementsByTagName("tbody")[0].innerHTML += 
                        "<tr><td>" + recursos[i].numero_serie + 
                        "</td><td>" + ubis.find(s => s.id == recursos[i].ubicacion).nombre +
                        "</td><td>" + tiempo +
                        "</td><td>" + media +
                        "</td><td>" + boton + "</tr>";
                    })
                })
            }
        }
    });
}

function retirar(idRecurso, idSanitario, horasEstimadas){
    reservarRecurso(idRecurso, idSanitario, horasEstimadas, function(idReserva){
        iniciarReserva(idReserva, function(cb){
            avisoReserva(idRecurso, idSanitario, "inicio");
            cambiarVista(main);
        });
    })
}

function reservar(idRecurso, idSanitario, horasEstimadas){
    reservarRecurso(idRecurso, idSanitario, horasEstimadas,function(cb){
        if (!cb){
            alert("Error en la reserva");
        } else {
            alert("Reserva realizada");
            avisoReserva(idRecurso, idSanitario, "inicio");
            cambiarVista(main);
        }
    });
}

function actualizarPendientes(){
    var tabla = document.getElementById("tablaPendientes");
    tabla.getElementsByTagName("tbody")[0].innerHTML = "";

    obtenerReservas(sanitActual, function(reservas){
        var reservasTabla = reservas.filter(r => r.fecha_inicio == null);
        
        for (let i=0; i<reservasTabla.length; i++){
            obtenerRecurso(reservasTabla[i].recurso,function(recu){
                tiempoPendiente(recu.id, function(t){
                    t = t - reservasTabla[i].horas_estimadas;
                    if (t != 0){
                        var botonT = "";
                    } else {
                        var botonT = '<button onclick="retirarEn0('+ reservasTabla[i].id + ',' + recu.id + ')">Retirar</button>';
                    }

                    var boton = '<button onclick="quitarReserva('+ reservasTabla[i].id + ',' + recu.id + ')">X</button>'

                    tabla.getElementsByTagName("tbody")[0].innerHTML += 
                    "<tr><td>" + categs.find(c => c.id == (modelos.find(s => s.id == recu.modelo).categoria)).nombre + 
                    "</td><td>" + modelos.find(s => s.id == recu.modelo).nombre + 
                    "</td><td>" + recu.numero_serie + 
                    "</td><td>" + ubis.find(s => s.id == recu.ubicacion).nombre + 
                    "</td><td>" + (new Date(reservasTabla[i].fecha_peticion)).toLocaleString() + 
                    "</td><td>" + t + 
                    "</td><td>" + botonT + 
                    "</td><td>" + boton + "</tr>"; 
                });
            });
        }
    });
}

function actualizarRealizadas(){
    var tabla = document.getElementById("tablaRealizadas");
    tabla.getElementsByTagName("tbody")[0].innerHTML = "";

    obtenerReservas(sanitActual, function(reservas){
        var reservasTabla = reservas.filter(r => r.fecha_inicio != null);

        for (let i=0; i<reservasTabla.length; i++){
            obtenerRecurso(reservasTabla[i].recurso,function(recu){
                if (reservasTabla[i].fecha_fin == null){
                    var botonT = '<button onclick="devolver('+ reservasTabla[i].id + ',' + recu.id + ')">Devolver</button>';
                } else {
                    var botonT = (new Date(reservasTabla[i].fecha_fin)).toLocaleString();
                }
                console.log("Recurso usado en el botón Partes:", recu.id);
                
                var boton = '<button onclick="añadirResenya('+ recu.id + ')">Reseña</button>'
                console.log("HTML del botón:", boton);
                tabla.getElementsByTagName("tbody")[0].innerHTML += 
                "<tr><td>" + categs.find(c => c.id == (modelos.find(s => s.id == recu.modelo).categoria)).nombre + 
                "</td><td>" + modelos.find(s => s.id == recu.modelo).nombre + 
                "</td><td>" + recu.numero_serie + 
                "</td><td>" + reservasTabla[i].horas_estimadas + 
                "</td><td>" + (new Date(reservasTabla[i].fecha_inicio)).toLocaleString() + 
                "</td><td>" + botonT + 
                "</td><td>" + boton + "</tr>"; 
            });
        }
    });
}

function actualizarTablas(){
    actualizarPendientes();
    actualizarRealizadas();
}

function retirarEn0(resId, recursoId){
    avisoReserva(recursoId, sanitActual, "inicio");
    iniciarReserva(resId, function(cb){
        cambiarVista(main);
    });
}

function quitarReserva(resId, recursoId){
    avisoReserva(recursoId, sanitActual, "cancelar");
    cancelarReserva(resId, function(cb){
        actualizarTablas();
    });
}

function devolver(resId, recursoId){
    avisoReserva(recursoId, sanitActual, "fin");
    finalizarReserva(resId, function(cb){
        actualizarTablas();
    });
}

function añadirResenya(idRecu){
    recursoActual = idRecu;
    obtenerRecurso(recursoActual, function(cb){
        document.getElementById("numSerieRecurso").innerHTML = cb.numero_serie;
    });
    document.getElementById("detalleTexto").value = "";
    cambiarVista(resenyaNueva);
}

function guardarResenya(){
    var valoracion = document.getElementById("detalleValoracion").value;
    var descripcion = document.getElementById("detalleTexto").value;

    crearResenya(recursoActual, sanitActual, parseInt(valoracion), descripcion, function(cb){
        if (cb == null){
            alert("Error al guardar la reseña, revise que ha rellenado todos los campos.");
        } else {
            alert("Reseña guardada correctamente");
            conexion.send(JSON.stringify({
                operacion: "resenyas",
                valoracion: valoracion,
                idSanitario: sanitActual,
                idRecurso: recursoActual
            }));
            cambiarVista(main);
        }
    });
}

function cancelarResenya(){
    cambiarVista(main);
}

function avisoReserva(idRecurso, idSanitario, tipo){
    conexion.send(JSON.stringify({
        operacion: "reservas",
        idRecurso: idRecurso,
        idSanitario: idSanitario,
        tipo: tipo
    }));
}
