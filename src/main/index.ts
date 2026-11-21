import 'dotenv/config';
// Tiene que ir antes que baseDeDatos: deja armada la conexión a la base propia de Syntra.
import { iniciarBaseEmbebida, detenerBaseEmbebida } from './persistencia/baseEmbebida';
import { app, Menu, BrowserWindow, dialog, net, Notification, protocol, shell } from 'electron';
import { isAbsolute, join, relative, resolve } from 'path';
import { pathToFileURL } from 'url';
import { is } from '@electron-toolkit/utils';

import { pool, verifyDbConnection } from './persistencia/baseDeDatos';
import { Persistencia } from './persistencia/persistencia';

// ---------------------------------------------------------------------------
// userData por instancia: DEBE hacerse antes de cualquier otra cosa que use
// app.getPath('userData') (id-cliente-sync.txt, sync-secretos.json, etc.).
// ---------------------------------------------------------------------------
const dirDatos = process.env.ELECTRON_USER_DATA_DIR;
if (dirDatos) {
  app.setPath('userData', resolve(dirDatos));
} else if (process.env.INSTANCIA) {
  app.setPath('userData', join(app.getPath('appData'), `${app.getName()}-${process.env.INSTANCIA}`));
}
console.log('[startup] userData =', app.getPath('userData'));

// Gestion de material de estudio
import { CrearNodo } from './logicaPersistente/gestionMaterialEstudio/crearNodo';
import { ModificarNodo } from './logicaPersistente/gestionMaterialEstudio/modificarNodo';
import { BuscarNodos } from './logicaPersistente/gestionMaterialEstudio/buscarNodos';
import { EliminarNodo } from './logicaPersistente/gestionMaterialEstudio/eliminarNodo';
import { MoverNodo } from './logicaPersistente/gestionMaterialEstudio/moverNodo';
import { Nodos } from './administracionDePersistencia/nodo';
import { registrarNodosIpc } from './ipc/nodo.ipc';
import { ListarContenido } from './logicaPersistente/gestionMaterialEstudio/listarContenido';
import { BuscarNodosPorMateria } from './logicaPersistente/gestionMaterialEstudio/buscarNodosPorMateria';
import { CrearArchivo } from './logicaPersistente/gestionMaterialEstudio/crearArchivo';
import { Archivos } from './administracionDePersistencia/archivos';
import { registerArchivosIpc } from './ipc/archivos.ipc';
import { ModificarArchivo } from './logicaPersistente/gestionMaterialEstudio/modificarArchivo';
import { EliminarArchivo } from './logicaPersistente/gestionMaterialEstudio/eliminarArchivo';
import { MoverArchivos } from './logicaPersistente/gestionMaterialEstudio/moverArchivos';
import { BuscarArchivos } from './logicaPersistente/gestionMaterialEstudio/buscarArchivos';
import { ObtenerArchivo } from './logicaPersistente/gestionMaterialEstudio/obtenerArchivo';
import { ActualizarContenidoArchivo } from './logicaPersistente/gestionMaterialEstudio/actualizarContenidoArchivo';
import { GuardarDriveId } from './logicaPersistente/gestionMaterialEstudio/guardarDriveId';
import { Almacenamiento } from './persistencia/almacenamiento';
import path from 'path';
import { existsSync } from 'fs';

// Google Drive
import { AlmacenTokensDrive } from './logicaNoPersistente/drive/almacenTokensDrive';
import { cifradorElectron } from './logicaNoPersistente/drive/cifradorElectron';
import { OAuthDrive, conCuenta } from './logicaNoPersistente/drive/oauthDrive';
import { DriveCliente } from './logicaNoPersistente/drive/driveCliente';
import { DriveServicio } from './logicaNoPersistente/drive/driveServicio';
import { registerDriveIpc } from './ipc/drive.ipc';

// Gestion de usuarios
import { IniciarSesion } from './logicaPersistente/gestionDeUsuarios/iniciarSesion';
import { RegistrarUsuario } from './logicaPersistente/gestionDeUsuarios/registrarUsuario';
import { VerificarMail } from './logicaPersistente/gestionDeUsuarios/verificarMail';
import { RecuperarPassword } from './logicaPersistente/gestionDeUsuarios/recuperarPassword';
import { Usuarios } from './administracionDePersistencia/usuarios';
import { registerUsuariosIpc } from './ipc/usuarios.ipc';
import { CambiarPassword } from './logicaPersistente/gestionDeUsuarios/cambiarPassword';
import { ValidarCodigo } from './logicaPersistente/gestionDeUsuarios/validarCodigo';

// Gestion de eventos
import { CrearEvento } from './logicaPersistente/gestionDeEventos/crearEvento';
import { ListarEventos } from './logicaPersistente/gestionDeEventos/listarEventos';
import { ModificarEvento } from './logicaPersistente/gestionDeEventos/modificarEvento';
import { EliminarEvento } from './logicaPersistente/gestionDeEventos/eliminarEvento';
import { Eventos } from './administracionDePersistencia/eventos';
import { registerEventosIpc } from './ipc/eventos.ipc';

// Gestion de categorias
import { CrearCategoria } from './logicaPersistente/gestionDeCategorias/crearCategoria';
import { ListarCategorias } from './logicaPersistente/gestionDeCategorias/listarCategorias';
import { ModificarCategoria } from './logicaPersistente/gestionDeCategorias/modificarCategoria';
import { EliminarCategoria } from './logicaPersistente/gestionDeCategorias/eliminarCategoria';
import { Categorias } from './administracionDePersistencia/categorias';
import { registerCategoriasIpc } from './ipc/categorias.ipc';
import { ObtenerPerfil } from './logicaPersistente/gestionDeUsuarios/obtenerPerfil';
import { ModificarPerfil } from './logicaPersistente/gestionDeUsuarios/modificarPerfil';
import { CambiarPasswordActual } from './logicaPersistente/gestionDeUsuarios/cambiarPasswordActual';
import { EliminarUsuario } from './logicaPersistente/gestionDeUsuarios/eliminarUsuario';
import { ActualizarFotoPerfil, ElegirAvatar, ObtenerFotoPerfil } from './logicaPersistente/gestionDeUsuarios/fotoPerfil';
import { ElegirColorAvatar } from './logicaPersistente/gestionDeUsuarios/colorAvatar';

// Gestion de horarios
import { CrearHorario } from './logicaPersistente/gestionDeHorarios/crearHorario';
import { ListarHorarios } from './logicaPersistente/gestionDeHorarios/listarHorarios';
import { ModificarHorario } from './logicaPersistente/gestionDeHorarios/modificarHorario';
import { EliminarHorario } from './logicaPersistente/gestionDeHorarios/eliminarHorario';
import { Horarios } from './administracionDePersistencia/horarios';
import { registerHorariosIpc } from './ipc/horarios.ipc';

// Gestion de materias
import { ListarFormaciones } from './logicaPersistente/gestionDeMaterias/listarFormaciones';
import { CrearFormacion } from './logicaPersistente/gestionDeMaterias/crearFormacion';
import { ModificarFormacion } from './logicaPersistente/gestionDeMaterias/modificarFormacion';
import { EliminarFormacion } from './logicaPersistente/gestionDeMaterias/eliminarFormacion';
import { ListarMaterias } from './logicaPersistente/gestionDeMaterias/listarMaterias';
import { CrearMaterias } from './logicaPersistente/gestionDeMaterias/crearMaterias';
import { ModificarMateria } from './logicaPersistente/gestionDeMaterias/modificarMateria';
import { EliminarMateria } from './logicaPersistente/gestionDeMaterias/eliminarMateria';
import { ListarMateriasUsuario } from './logicaPersistente/gestionDeMaterias/listarMateriasUsuario';
import { ListarCorrelativas } from './logicaPersistente/gestionDeMaterias/listarCorrelativas';
import { GuardarCorrelativas } from './logicaPersistente/gestionDeMaterias/guardarCorrelativas';
import { Materias } from './administracionDePersistencia/materias';
import { ListarCuadernos } from './logicaPersistente/gestionDeCuadernos/listarCuadernos';
import { ObtenerCuaderno } from './logicaPersistente/gestionDeCuadernos/obtenerCuaderno';
import { CrearCuaderno } from './logicaPersistente/gestionDeCuadernos/crearCuaderno';
import { ModificarCuaderno } from './logicaPersistente/gestionDeCuadernos/modificarCuaderno';
import { EliminarCuaderno } from './logicaPersistente/gestionDeCuadernos/eliminarCuaderno';
import { CrearNota } from './logicaPersistente/gestionDeCuadernos/crearNota';
import { ModificarNota } from './logicaPersistente/gestionDeCuadernos/modificarNota';
import { EliminarNota } from './logicaPersistente/gestionDeCuadernos/eliminarNota';
import { AgregarMazo } from './logicaPersistente/gestionDeCuadernos/agregarMazo';
import { QuitarMazo } from './logicaPersistente/gestionDeCuadernos/quitarMazo';
import { AgregarMaterialIA, QuitarMaterialIA } from './logicaPersistente/gestionDeCuadernos/materialIACuaderno';
import { Cuadernos } from './administracionDePersistencia/cuadernos';
import { registerCuadernosIpc } from './ipc/cuadernos.ipc';
import { registerMateriasIpc } from './ipc/materias.ipc';
import { registerEnlacesIpc } from './ipc/enlaces.ipc';
import { VerificarPassword } from './logicaPersistente/gestionDeUsuarios/verificarPassword';
import { ActualizarRostro } from './logicaPersistente/gestionDeUsuarios/actualizarRostro';

// Pantalla de inicio
import { ObtenerFondoInicio, ActualizarFondoInicio } from './logicaPersistente/gestionDeInicio/fondoInicio';
import { Inicio } from './administracionDePersistencia/inicio';
import { registerInicioIpc } from './ipc/inicio.ipc';

// Gestion de flashcards
import { CrearDeck } from './logicaPersistente/gestionDeFlashcards/crearDeck';
import { ListarDecks } from './logicaPersistente/gestionDeFlashcards/listarDecks';
import { CrearFlashcard } from './logicaPersistente/gestionDeFlashcards/crearFlashcard';
import { ListarFlashcards } from './logicaPersistente/gestionDeFlashcards/listarFlashcards';
import { ModificarFlashcard } from './logicaPersistente/gestionDeFlashcards/modificarFlashcard';
import { ModificarDeck } from './logicaPersistente/gestionDeFlashcards/modificarDeck';
import { EliminarDecks } from './logicaPersistente/gestionDeFlashcards/eliminarDecks';
import { EliminarFlashcards } from './logicaPersistente/gestionDeFlashcards/eliminarFlashcards';
import { Flashcards } from './administracionDePersistencia/flashcards';
import { registerFlashcardsIpc } from './ipc/flashcards.ipc';
import { RegistrarRevision } from './logicaPersistente/gestionDeRepeticionEspaciada/registrarRevision';
import { ListarFlashcardsPendientes } from './logicaPersistente/gestionDeRepeticionEspaciada/listarFlashcardsPendientes';
import { ListarRepeticionesMaterial } from './logicaPersistente/gestionDeRepeticionEspaciada/listarRepeticionesMaterial';
import { GuardarRepeticionMaterial } from './logicaPersistente/gestionDeRepeticionEspaciada/guardarRepeticionMaterial';
import { RepeticionEspaciada } from './administracionDePersistencia/repeticionEspaciada';
import { registerRepeticionEspaciadaIpc } from './ipc/repeticionEspaciada.ipc';
import { EnviarRecordatoriosPendientes } from './logicaPersistente/gestionDeRepeticionEspaciada/enviarRecordatoriosPendientes';

// Notificaciones
import { CrearNotificacion } from './logicaPersistente/gestionDeNotificaciones/crearNotificacion';
import { ListarNotificaciones } from './logicaPersistente/gestionDeNotificaciones/listarNotificaciones';
import { MarcarLeidas } from './logicaPersistente/gestionDeNotificaciones/marcarLeidas';
import { BorrarLeidas } from './logicaPersistente/gestionDeNotificaciones/borrarLeidas';
import { ObtenerSilencio, CambiarSilencio } from './logicaPersistente/gestionDeNotificaciones/silencio';
import type { Notificacion } from './logicaPersistente/gestionDeNotificaciones/entidades';
import { Notificaciones } from './administracionDePersistencia/notificaciones';
import { Notificador } from './logicaNoPersistente/notificaciones/notificador';
import { VigiaNotificaciones } from './logicaNoPersistente/notificaciones/vigiaNotificaciones';
import { Bienestar } from './administracionDePersistencia/bienestar';
import { ObtenerCargaDelDia } from './logicaPersistente/gestionDeBienestar/cargaDelDia';
import { CambiarBienestar, ObtenerBienestar } from './logicaPersistente/gestionDeBienestar/preferenciaBienestar';
import { registerBienestarIpc } from './ipc/bienestar.ipc';
import { NotasRapidas } from './administracionDePersistencia/notasRapidas';
import { ListarNotas } from './logicaPersistente/gestionDeNotasRapidas/listarNotas';
import { CrearNota } from './logicaPersistente/gestionDeNotasRapidas/crearNota';
import { ModificarNota } from './logicaPersistente/gestionDeNotasRapidas/modificarNota';
import { EliminarNota } from './logicaPersistente/gestionDeNotasRapidas/eliminarNota';
import { registerNotasRapidasIpc } from './ipc/notasRapidas.ipc';
import { AgendaParaIA } from './logicaPersistente/gestionDeChatIA/agendaParaIA';
import { CalendarioGoogle } from './administracionDePersistencia/calendarioGoogle';
import { ItemsParaCalendario } from './logicaPersistente/gestionDeCalendarioGoogle/itemsParaCalendario';
import { registerCalendarioGoogleIpc } from './ipc/calendarioGoogle.ipc';
import { activarMenuContextual } from './logicaNoPersistente/ventana/menuContextual';
import { registerNotificacionesIpc } from './ipc/notificaciones.ipc';

// Gestion de proyectos
import { CrearProyecto } from './logicaPersistente/gestionDeProyectos/crearProyecto';
import { ModificarProyecto } from './logicaPersistente/gestionDeProyectos/modificarProyecto';
import { EliminarProyecto } from './logicaPersistente/gestionDeProyectos/eliminarProyecto';
import { ObtenerProyecto } from './logicaPersistente/gestionDeProyectos/obtenerProyecto';
import { ListarProyectos } from './logicaPersistente/gestionDeProyectos/listarProyectos';
import { ListarMiembros } from './logicaPersistente/gestionDeProyectos/listarMiembros';
import { AgregarMiembroPorMail } from './logicaPersistente/gestionDeProyectos/agregarMiembroPorMail';
import { AgregarMiembro } from './logicaPersistente/gestionDeProyectos/agregarMiembro';
import { CambiarRolMiembro } from './logicaPersistente/gestionDeProyectos/cambiarRolMiembro';
import { Proyectos } from './administracionDePersistencia/proyectos';
import { registrarProyectosIpc } from './ipc/proyectos.ipc';
import { ListarInvitaciones } from './logicaPersistente/gestionDeProyectos/listarInvitaciones';
import { CancelarInvitacion } from './logicaPersistente/gestionDeProyectos/cancelarInvitacion';
import {
  ObtenerPortadaProyecto,
  ActualizarPortadaProyecto,
  QuitarPortadaProyecto,
} from './logicaPersistente/gestionDeProyectos/portadaProyecto';
import { PortadasProyectos } from './administracionDePersistencia/portadasProyectos';
import { registerPortadasProyectosIpc } from './ipc/portadasProyectos.ipc';
import { ServicioIA } from './logicaNoPersistente/ia/servicioIA.js';
import { GuardarGuiaPreguntas } from './logicaPersistente/gestionDeMaterialIA/guardarGuiaPreguntas';
import { GuardarResumenIA } from './logicaPersistente/gestionDeMaterialIA/guardarResumenIA';

// Estadísticas
import { ResumenProyectos } from './logicaPersistente/gestionDeEstadisticas/resumenProyectos';
import { ResumenSesionesEstudio } from './logicaPersistente/gestionDeEstadisticas/resumenSesiones';
import { ResumenDeMaterial } from './logicaPersistente/gestionDeEstadisticas/resumenMaterial';
import { ResumenDeCuestionarios } from './logicaPersistente/gestionDeEstadisticas/resumenCuestionarios';
import { ResumenDeFlashcards } from './logicaPersistente/gestionDeEstadisticas/resumenFlashcards';
import { Estadisticas } from './administracionDePersistencia/estadisticas';
import { registerEstadisticasIpc } from './ipc/estadisticas.ipc';
// Gestion de edicion compartida y sincronizacion
import {
  componerSincronizacion,
  crearProveedorIdentidad,
} from './logicaPersistente/gestionDeProyectos/componerSincronizacion';
import type { RegistroManejadores } from './logicaPersistente/gestionDeProyectos/edicionCompartida';
import {
  ManejadorEvento,
  ManejadorMeta,
  ManejadorTarea,
} from './logicaPersistente/gestionDeProyectos/manejadoresEntidades';
import { ManejadorCategoria } from './logicaPersistente/gestionDeCategorias/manejadorCategoria';
import { ManejadorNodo, ManejadorArchivo } from './logicaPersistente/gestionDeProyectos/manejadoresContenido';
import { Edicion } from './administracionDePersistencia/edicion';
import { ClaveEdicion } from './logicaPersistente/gestionDeProyectos/claveEdicion';
import { registerEdicionIpc } from './ipc/edicion.ipc'; // ajustá si tu archivo se llama distinto
import {
  fijarSesionSync,
  limpiarSesionSync,
  usuarioSesionSync,
} from './sesionSync';

// Gestion de metas
import { Metas } from './administracionDePersistencia/metas';
import { CrearMeta } from './logicaPersistente/gestionDeMetas/crearMeta';
import { registerMetasIpc } from './ipc/metas.ipc';
import { AlternarMeta } from './logicaPersistente/gestionDeMetas/alternarMeta';
import { CopiarMetas } from './logicaPersistente/gestionDeMetas/copiarMetas';
import { EliminarMeta } from './logicaPersistente/gestionDeMetas/eliminarMeta';
import { EstadisticasMetasProyecto } from './logicaPersistente/gestionDeMetas/estadisticasMetas';
import { ListarMetas } from './logicaPersistente/gestionDeMetas/listarMetas';
import { ModificarMeta } from './logicaPersistente/gestionDeMetas/modificarMeta';

// Gestion de tareas
import { Tareas } from './administracionDePersistencia/tareas';
import { CrearTarea } from './logicaPersistente/gestionDeTareas/crearTarea';
import { ListarTareas } from './logicaPersistente/gestionDeTareas/listarTareas';
import { ModificarTarea } from './logicaPersistente/gestionDeTareas/modificarTarea';
import { AlternarTarea } from './logicaPersistente/gestionDeTareas/alternarTarea';
import { AsignarTarea } from './logicaPersistente/gestionDeTareas/asignarTarea';
import { RepartirTareas } from './logicaPersistente/gestionDeTareas/repartirTareas';
import { EliminarTarea } from './logicaPersistente/gestionDeTareas/eliminarTarea';
import { registerTareasIpc } from './ipc/tareas.ipc';

// Gestion de sesion de estudio
import { CrearSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/crearSesionEstudio';
import { ListarSesionesEstudio } from './logicaPersistente/gestionDeSesionEstudio/listarSesionesEstudio';
import { ObtenerSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/obtenerSesionEstudio';
import { ModificarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/modificarSesionEstudio';
import { IniciarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/iniciarSesionEstudio';
import { PausarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/pausarSesionEstudio';
import { ReanudarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/reanudarSesionEstudio';
import { FinalizarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/finalizarSesionEstudio';
import { EliminarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/eliminarSesionEstudio';
import { GestionarObjetivos } from './logicaPersistente/gestionDeSesionEstudio/gestionarObjetivos';
import { GestionarPestanas } from './logicaPersistente/gestionDeSesionEstudio/gestionarPestanas';
import { GestionarPomodoro } from './logicaPersistente/gestionDeSesionEstudio/gestionarPomodoro';
import { ListarOpcionesSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/listarOpcionesSesionEstudio';
import { GestionarMaterias } from './logicaPersistente/gestionDeSesionEstudio/gestionarMaterias';
import { BuscarSesionesSuperpuestas } from './logicaPersistente/gestionDeSesionEstudio/buscarSesionesSuperpuestas';
import { ObtenerResumenSesiones } from './logicaPersistente/gestionDeSesionEstudio/obtenerResumenSesiones';
import { VerificarSesionesEstudioAtrasadas } from './logicaPersistente/gestionDeSesionEstudio/verificarSesionesEstudioAtrasadas';
import { RecuperarSesionInterrumpida } from './logicaPersistente/gestionDeSesionEstudio/recuperarSesionInterrumpida';
import { ObtenerSesionEnCurso } from './logicaPersistente/gestionDeSesionEstudio/obtenerSesionEnCurso';
import { RegistrarLatidoSesion } from './logicaPersistente/gestionDeSesionEstudio/registrarLatidoSesion';
import { GuardarContenidoSesion } from './logicaPersistente/gestionDeSesionEstudio/guardarContenidoSesion';
import { ImportarContenidoDesdeMaterial } from './logicaPersistente/gestionDeSesionEstudio/importarContenidoDesdeMaterial';
import { SesionesEstudio } from './administracionDePersistencia/sesionesEstudio';
import { ProcesoSesionEstudio } from './logicaNoPersistente/procesoSesionEstudio/procesoSesionEstudio';
import { CANAL_SALIDA_BLOQUEADA } from './logicaNoPersistente/procesoSesionEstudio/practicaActiva';
import { DocumentoSesionEstudio } from './logicaNoPersistente/procesoSesionEstudio/documentoSesionEstudio';
import { registerSesionesEstudioIpc } from './ipc/sesionesEstudio.ipc';

// Spotify
import { GuardarCuentaSpotify } from './logicaPersistente/gestionDeSpotify/guardarCuentaSpotify';
import { ObtenerCuentaSpotify } from './logicaPersistente/gestionDeSpotify/obtenerCuentaSpotify';
import { EliminarCuentaSpotify } from './logicaPersistente/gestionDeSpotify/eliminarCuentaSpotify';
import { CuentasSpotify } from './administracionDePersistencia/spotify';
import { AutenticacionSpotify } from './logicaNoPersistente/spotify/autenticacionSpotify';
import { ClienteSpotify } from './logicaNoPersistente/spotify/clienteSpotify';
import { registerSpotifyIpc } from './ipc/spotify.ipc';

//comando de vox
import { registerVozIpc } from './ipc/voz.ipc';
import { registerDictadoIpc } from './ipc/dictado.ipc';
import { ModeloDictado } from './logicaNoPersistente/dictado/modeloDictado';
// Inteligencia artificial (router, proveedores, claves y cola) y Material con IA
import { crearServiciosIA, type ServiciosIA } from './logicaNoPersistente/ia/index.js';
import { registrarIpcIA } from './ipc/ia.ipc';
import { GeneradorMaterialIA } from './logicaNoPersistente/ia/generadorMaterialIA';
import { GuardarMaterialIA } from './logicaPersistente/gestionDeMaterialIA/guardarMaterialIA';
import { ListarMaterialesIA } from './logicaPersistente/gestionDeMaterialIA/listarMaterialesIA';
import { ObtenerMaterialIA } from './logicaPersistente/gestionDeMaterialIA/obtenerMaterialIA';
import { EditarMapaMentalIA } from './logicaPersistente/gestionDeMaterialIA/editarMapaMentalIA';
import { EliminarMaterialIA } from './logicaPersistente/gestionDeMaterialIA/eliminarMaterialIA';
import { ListarIntentosCuestionario, ResponderCuestionario } from './logicaPersistente/gestionDeMaterialIA/intentosCuestionario';
import { MaterialIA } from './administracionDePersistencia/materialIA';
import { registerMaterialIAIpc } from './ipc/materialIA.ipc';
import { AsistenteChat } from './logicaNoPersistente/ia/asistenteChat';
import { ListarConversacionesIA } from './logicaPersistente/gestionDeChatIA/listarConversacionesIA';
import { ObtenerConversacionIA } from './logicaPersistente/gestionDeChatIA/obtenerConversacionIA';
import { GuardarIntercambioIA } from './logicaPersistente/gestionDeChatIA/guardarIntercambioIA';
import { RenombrarConversacionIA } from './logicaPersistente/gestionDeChatIA/renombrarConversacionIA';
import { EliminarConversacionIA } from './logicaPersistente/gestionDeChatIA/eliminarConversacionIA';
import { ChatIA } from './administracionDePersistencia/chatIA';
import { registerChatIAIpc } from './ipc/chatIA.ipc';
// junto a los otros imports de ipc
import { registrarIpcPlanArchivo } from './ipc/planArchivo.ipc';

let mainWindow: BrowserWindow | null = null;
let procesoSesion: ProcesoSesionEstudio | null = null;
// Servicios de IA (router, claves, cola y Ollama). Se guardan para apagar Ollama al cerrar la app.
let iaServicios: ServiciosIA | null = null;

// Se guardan mientras están en pantalla: si no, Windows puede perder el clic.
const avisosVisibles = new Set<Notification>();

// Muestra el aviso en las notificaciones de la compu. Al tocarlo se abre Syntra con la campanita.
function mostrarEnSistema(notificacion: Notificacion): void {
  if (!Notification.isSupported()) return;
  // Sin sonido de Windows: el sonido lo pone la app, así suena aunque Windows tenga los avisos sin sonido.
  const aviso = new Notification({ title: notificacion.titulo, body: notificacion.mensaje, silent: true });
  avisosVisibles.add(aviso);
  aviso.on('close', () => avisosVisibles.delete(aviso));
  aviso.on('click', () => {
    avisosVisibles.delete(aviso);
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('notificaciones:abrir');
  });
  aviso.show();
  mainWindow?.webContents.send('notificaciones:sonar');
}

// Se guarda para poder liberar los bloqueos de edición al cerrar la app.
let edicion: Edicion | null = null;
// Se guarda para frenar el barrido de la sincronización antes de cerrar la base al salir.
let detenerSincronizacion: (() => Promise<void>) | null = null;
// Se guarda para cortar los pedidos a la IA que estén en curso al cerrar la app.
let cancelarIA: (() => void) | null = null;
let cerrando = false;

// Raíz global bajo la que cuelgan los proyectos (según el comentario de DepsSincronizacion: hoy 2).
const ID_NODO_PADRE_PROYECTOS = 2;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'modelos',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);


function wireDependencies(): ProcesoSesionEstudio {
  const persistencia = new Persistencia(pool);

  // Gestion de material de estudio
  const crearNodo = new CrearNodo(persistencia);
  const modificarNodo = new ModificarNodo(persistencia);
  const buscarNodos = new BuscarNodos(persistencia);
  const buscarArchivos = new BuscarArchivos(persistencia);
  const listarContenido = new ListarContenido(buscarNodos, buscarArchivos, persistencia, new BuscarNodosPorMateria(persistencia));
  const moverNodo = new MoverNodo(persistencia);
  const eliminarNodo = new EliminarNodo(persistencia);
  const nodos = new Nodos(crearNodo, modificarNodo, listarContenido, eliminarNodo, moverNodo);
  registrarNodosIpc(nodos);

  const almacenamiento = new Almacenamiento(path.join(app.getPath('userData'), 'archivos'));
  const crearArchivo = new CrearArchivo(persistencia, almacenamiento);
  const modificarArchivo = new ModificarArchivo(persistencia);
  const eliminarArchivo = new EliminarArchivo(persistencia, almacenamiento);
  const moverArchivos = new MoverArchivos(persistencia);
  const obtenerArchivo = new ObtenerArchivo(persistencia);
  const actualizarContenidoArchivo = new ActualizarContenidoArchivo(persistencia, almacenamiento);
  const guardarDriveId = new GuardarDriveId(persistencia);
  const archivos = new Archivos(crearArchivo, buscarArchivos, modificarArchivo, eliminarArchivo, moverArchivos,
    obtenerArchivo, actualizarContenidoArchivo, guardarDriveId);


  // Google Drive
  const almacenTokens = new AlmacenTokensDrive(path.join(app.getPath('userData'), 'drive-token.bin'), cifradorElectron);
  const oauth = new OAuthDrive(
    { clientId: process.env.GOOGLE_CLIENT_ID ?? '', clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '' },
    almacenTokens,
    (url) => shell.openExternal(url),
  );
  // Google Calendar: copia de Syntra al calendario "Syntra" de Google (cada 15 minutos y al tocar "Sincronizar").
  const calendarioGoogle = new CalendarioGoogle(
    new ItemsParaCalendario(persistencia),
    app.getPath('userData'),
    { clientId: process.env.GOOGLE_CLIENT_ID ?? '', clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '' },
    cifradorElectron,
    (url) => shell.openExternal(url),
  );
  registerCalendarioGoogleIpc(calendarioGoogle);
  setTimeout(() => void calendarioGoogle.sincronizarEnSegundoPlano(), 30_000);
  setInterval(() => void calendarioGoogle.sincronizarEnSegundoPlano(), 15 * 60_000);

  const driveServicio = new DriveServicio(
    new DriveCliente(() => oauth.obtenerAccessToken()),
    archivos,
    almacenamiento,
    // Abre el documento con la misma cuenta de Google con la que se dio el permiso.
    async (url) => {
      if (!oauth.cuenta()) await oauth.obtenerAccessToken().catch(() => {});
      await shell.openExternal(conCuenta(url, oauth.cuenta()));
    },
  );
  

  // Gestion de usuarios (el IPC se registra más abajo, cuando existe la sincronización)
  const iniciarSesion = new IniciarSesion(persistencia);
  const registrarUsuario = new RegistrarUsuario(persistencia);
  const verificarMail = new VerificarMail(persistencia);
  const recuperarPassword = new RecuperarPassword(persistencia);
  const validarCodigo = new ValidarCodigo(persistencia);
  const cambiarPassword = new CambiarPassword(persistencia);
  const verificarPassword = new VerificarPassword(persistencia);
  const usuarios = new Usuarios(
    iniciarSesion, registrarUsuario, verificarMail, recuperarPassword, validarCodigo, cambiarPassword,
    new ObtenerPerfil(persistencia), new ModificarPerfil(persistencia),
    new CambiarPasswordActual(verificarPassword, persistencia), new EliminarUsuario(persistencia),
    new ObtenerFotoPerfil(persistencia),
    new ActualizarFotoPerfil(persistencia, path.join(app.getPath('userData'), 'fotosPerfil')),
    verificarPassword, new ActualizarRostro(verificarPassword), new ElegirAvatar(persistencia),
    new ElegirColorAvatar(persistencia)
  );

  // Gestion de eventos
  const crearEvento = new CrearEvento(persistencia);
  const listarEventos = new ListarEventos(persistencia);
  const modificarEvento = new ModificarEvento(persistencia);
  const eliminarEvento = new EliminarEvento(persistencia);
  const eventos = new Eventos(crearEvento, listarEventos, modificarEvento, eliminarEvento);
  registerEventosIpc(eventos);

  // Gestion de categorias
  const categorias = new Categorias(
    new CrearCategoria(persistencia), new ListarCategorias(persistencia),
    new ModificarCategoria(persistencia), new EliminarCategoria(persistencia)
  );
  registerCategoriasIpc(categorias);

  // Gestion de horarios
  const horarios = new Horarios(
    new CrearHorario(persistencia), new ListarHorarios(persistencia),
    new ModificarHorario(persistencia), new EliminarHorario(persistencia)
  );
  registerHorariosIpc(horarios);

  // Gestion de materias
  const materias = new Materias(
    new ListarFormaciones(persistencia), new CrearFormacion(persistencia),
    new ModificarFormacion(persistencia), new EliminarFormacion(persistencia),
    new ListarMaterias(persistencia), new CrearMaterias(persistencia),
    new ModificarMateria(persistencia), new EliminarMateria(persistencia),
    new ListarMateriasUsuario(persistencia),
    new ListarCorrelativas(persistencia), new GuardarCorrelativas(persistencia)
  );
  registerMateriasIpc(materias);

  // Gestion de cuadernos (los crea el usuario y les asocia una materia) y sus notas
  const listarCuadernos = new ListarCuadernos(persistencia);
  const cuadernos = new Cuadernos(
    listarCuadernos, new ObtenerCuaderno(persistencia, listarCuadernos),
    new CrearCuaderno(persistencia), new ModificarCuaderno(persistencia), new EliminarCuaderno(persistencia),
    new CrearNota(persistencia), new ModificarNota(persistencia), new EliminarNota(persistencia),
    new AgregarMazo(persistencia), new QuitarMazo(persistencia),
    new AgregarMaterialIA(persistencia), new QuitarMaterialIA(persistencia)
  );
  registerCuadernosIpc(cuadernos);

  // Gestion de metas
  const metas = new Metas(
    new CrearMeta(persistencia),
    new ListarMetas(persistencia),
    new ModificarMeta(persistencia),
    new AlternarMeta(persistencia),
    new EliminarMeta(persistencia),
    new CopiarMetas(persistencia),
    new EstadisticasMetasProyecto(persistencia),
  );
  registerMetasIpc(metas);

  // Pantalla de inicio
  const inicio = new Inicio(
    new ObtenerFondoInicio(persistencia),
    new ActualizarFondoInicio(persistencia, path.join(app.getPath('userData'), 'fondosInicio'))
  );
  registerInicioIpc(inicio);

  // Notificaciones
  const notificaciones = new Notificaciones(
    new CrearNotificacion(persistencia), new ListarNotificaciones(persistencia),
    new MarcarLeidas(persistencia), new ObtenerSilencio(persistencia), new CambiarSilencio(persistencia),
    new BorrarLeidas(persistencia)
  );
  const notificador = new Notificador(
    notificaciones, mostrarEnSistema, () => mainWindow?.webContents.send('notificaciones:nuevas')
  );
  // Bienestar: avisa si planificás o estudiás demasiado en el día (se desactiva en Ajustes).
  const bienestar = new Bienestar(new ObtenerCargaDelDia(persistencia), new ObtenerBienestar(persistencia), new CambiarBienestar(persistencia));
  registerBienestarIpc(bienestar);

  // Notas rápidas (post-its) de las carpetas de Material y de los proyectos.
  registerNotasRapidasIpc(new NotasRapidas(
    new ListarNotas(persistencia), new CrearNota(persistencia), new ModificarNota(persistencia), new EliminarNota(persistencia)
  ));
  const vigia = new VigiaNotificaciones(
    {
      eventos: (usuarioId, desde) => eventos.listar({ usuarioId, desde }),
      metas: (usuarioId, dia) => metas.listar({ idUsuario: usuarioId, desde: dia, hasta: dia }),
      bienestar: (usuarioId, ahora) => bienestar.cargaDeHoy(usuarioId, ahora),
    },
    notificador
  );
  registerNotificacionesIpc(notificaciones, vigia);

  // Enlaces externos
  registerEnlacesIpc();

  // Gestion de flashcards
  const flashcards = new Flashcards(
    new CrearDeck(persistencia),
    new ListarDecks(persistencia),
    new CrearFlashcard(persistencia),
    new ListarFlashcards(persistencia),
    new ModificarFlashcard(persistencia),
    new ModificarDeck(persistencia),
    new EliminarDecks(persistencia),
    new EliminarFlashcards(persistencia)
  );
    // Modo voz
  registerVozIpc(() => mainWindow);
  registerFlashcardsIpc(flashcards);

  const repeticionEspaciada = new RepeticionEspaciada(
    new ListarFlashcardsPendientes(persistencia),
    new RegistrarRevision(persistencia),
    new ListarRepeticionesMaterial(persistencia),
    new GuardarRepeticionMaterial(persistencia)
  );
  registerRepeticionEspaciadaIpc(repeticionEspaciada);

  // Sincronizacion y edicion compartida
  const identidad = crearProveedorIdentidad(
    async () => {
      const idUsuario = usuarioSesionSync();
      if (idUsuario === null) throw new Error('No hay sesión iniciada para sincronizar.');

      const f = await persistencia.ejecutar<{ email: string; nombre: string; apodo: string | null }>(
        `SELECT email, nombre, apodo FROM usuarios WHERE id_usuario = $1`,
        [idUsuario],
      );
      if (!f[0]) throw new Error(`Usuario ${idUsuario} inexistente`);
      return { mail: f[0].email, nombre: f[0].apodo?.trim() || f[0].nombre };
    },
  );

  // Un manejador por entidad: aplican en la BD local los cambios que llegan de otros miembros.
  // Sin manejador, un cambio remoto se descarta y la versión igual avanza (se pierde para siempre).
  const manejadores: RegistroManejadores = {
    nodo: new ManejadorNodo(persistencia),
    archivo: new ManejadorArchivo(persistencia, almacenamiento),
    evento: new ManejadorEvento(persistencia, usuarioSesionSync),
    meta: new ManejadorMeta(persistencia, usuarioSesionSync),
    tarea: new ManejadorTarea(persistencia, usuarioSesionSync),
    categoria: new ManejadorCategoria(persistencia, usuarioSesionSync),
  };

  const sync = componerSincronizacion({
    persistencia,
    crearNodo,
    manejadores,
    identidad,
    mailDe: async (idUsuario: number) => {
      const f = await persistencia.ejecutar<{ email: string }>(
        `SELECT email FROM usuarios WHERE id_usuario = $1`,
        [idUsuario],
      );
      if (!f[0]) throw new Error(`Usuario ${idUsuario} inexistente`);
      return f[0].email;
    },
    emitir: (e) => mainWindow?.webContents.send('sincronizacion:evento', e),
    idNodoPadreProyectos: ID_NODO_PADRE_PROYECTOS,
  });

  // IPC de usuarios: ahora que existe la sincronización, el login la arranca y el logout la detiene.
  registerUsuariosIpc(usuarios, {
    alIniciarSesion: (idUsuario, password) => {
      console.log('[sync] hook de login, usuario:', idUsuario);
      fijarSesionSync(idUsuario, password);
      void sync.coordinador.iniciar(idUsuario)
        .then(() => console.log('[sync] coordinador iniciado'))
        .catch((e) => console.warn('[sync] no pudo iniciar:', e));
    },
    alCerrarSesion: async () => {
      await sync.coordinador.detener();
      limpiarSesionSync();
    },
  });

  // Gestion de proyectos (usa las piezas reales de la sincronización, sin mock)
  const agregarMiembro = new AgregarMiembro(persistencia, sync.sync);
  const listarInvitaciones = new ListarInvitaciones(persistencia);
  const agregarMiembroPorMail = new AgregarMiembroPorMail(persistencia, sync.sync);
  const cancelarInvitacion = new CancelarInvitacion(persistencia, sync.sync);
  void agregarMiembro;

  const proyectos = new Proyectos(
    new CrearProyecto(persistencia, crearNodo),
    new ModificarProyecto(persistencia, modificarNodo),
    new EliminarProyecto(persistencia, sync.sync, (id) => sync.coordinador.dejarDeVigilar(id)),
    new ObtenerProyecto(persistencia),
    new ListarProyectos(persistencia),
    sync.agregarMiembro,
    sync.quitarMiembro,
    new ListarMiembros(persistencia, sync.sync),
    sync.sincronizarProyecto,
    agregarMiembroPorMail,
    new CambiarRolMiembro(persistencia, sync.sync),
    listarInvitaciones,
    cancelarInvitacion,
  );
  registrarProyectosIpc(proyectos);

  // Portadas de los proyectos (locales de cada compu)
  const portadas = new PortadasProyectos(
    new ObtenerPortadaProyecto(persistencia),
    new ActualizarPortadaProyecto(persistencia, path.join(app.getPath('userData'), 'portadasProyectos')),
    new QuitarPortadaProyecto(persistencia)
  );
  registerPortadasProyectosIpc(portadas);

  // Estadísticas
  registerEstadisticasIpc(new Estadisticas(
    new ResumenProyectos(persistencia), new ResumenSesionesEstudio(persistencia), new ResumenDeMaterial(persistencia),
    new ResumenDeCuestionarios(persistencia), new ResumenDeFlashcards(persistencia)
  ));

  // Gestion de edicion y conflictos
  edicion = new Edicion(sync.edicion, sync.coordinador, sync.unirseAProyecto, new ClaveEdicion(persistencia));
  detenerSincronizacion = () => sync.coordinador.detener();
  registerEdicionIpc(edicion);

  // Gestion de tareas
  const tareas = new Tareas(
    new CrearTarea(persistencia),
    new ListarTareas(persistencia),
    new ModificarTarea(persistencia),
    new AlternarTarea(persistencia),
    new AsignarTarea(persistencia),
    new RepartirTareas(persistencia),
    new EliminarTarea(persistencia),
  );
  registerTareasIpc(tareas);

  // Gestion de sesion de estudio (el contenido se guarda en la base y en su Word de Material)
  const documentoSesion = new DocumentoSesionEstudio(archivos, nodos, persistencia);
  const sesionesEstudio = new SesionesEstudio({
    crear: new CrearSesionEstudio(persistencia, documentoSesion),
    listar: new ListarSesionesEstudio(persistencia),
    obtener: new ObtenerSesionEstudio(persistencia),
    modificar: new ModificarSesionEstudio(persistencia),
    iniciar: new IniciarSesionEstudio(persistencia),
    pausar: new PausarSesionEstudio(persistencia),
    reanudar: new ReanudarSesionEstudio(persistencia),
    finalizar: new FinalizarSesionEstudio(persistencia),
    eliminar: new EliminarSesionEstudio(persistencia),
    metas: new GestionarObjetivos(persistencia),
    pestanas: new GestionarPestanas(persistencia),
    pomodoro: new GestionarPomodoro(persistencia),
    opciones: new ListarOpcionesSesionEstudio(persistencia),
    materias: new GestionarMaterias(persistencia),
    superpuestas: new BuscarSesionesSuperpuestas(persistencia),
    resumen: new ObtenerResumenSesiones(persistencia),
    verificarAtrasadas: new VerificarSesionesEstudioAtrasadas(persistencia),
    recuperarInterrumpida: new RecuperarSesionInterrumpida(persistencia),
    enCurso: new ObtenerSesionEnCurso(persistencia),
    latido: new RegistrarLatidoSesion(persistencia),
    guardarContenido: new GuardarContenidoSesion(persistencia, documentoSesion),
    importarDesdeMaterial: new ImportarContenidoDesdeMaterial(persistencia),
  });
  // Se registra acá porque al guardar un Word desde Material avisa a Sesión de estudio.
  registerArchivosIpc(archivos, almacenamiento, nodos, (idArchivo, html) =>
    sesionesEstudio.importarDesdeMaterial(idArchivo, html)
  );
  // Lo mismo al traer la versión de Google Drive: si es el Word de una sesión, la sesión se actualiza.
  registerDriveIpc(driveServicio, () => oauth.cancelar(), async (idArchivo) => {
    const archivo = await archivos.obtener({ id: idArchivo });
    if (archivo.extension.toLowerCase() !== 'docx') return;
    const html = await documentoSesion.leerHtml(almacenamiento.rutaCompleta(archivo.rutaFisica));
    await sesionesEstudio.importarDesdeMaterial(idArchivo, html);
  });
  const proceso = new ProcesoSesionEstudio(sesionesEstudio, (canal, datos) =>
    mainWindow?.webContents.send(canal, datos)
  );
  registerSesionesEstudioIpc(sesionesEstudio, proceso);

  // Aviso del sistema cuando termina una fase del Pomodoro (aunque la app esté minimizada).
  proceso.on('faseCambio', (_terminada: string, nueva: string) => {
    if (!Notification.isSupported()) return;
    const cuerpo = nueva === 'pomodoro'
      ? 'Terminó el descanso. ¡A enfocarse de nuevo!'
      : nueva === 'descanso_largo'
        ? '¡Bien! Completaste 4 pomodoros: tomate un descanso largo.'
        : 'Terminó el pomodoro: tomate un descanso corto.';
    new Notification({ title: 'Pomodoro', body: cuerpo }).show();
  });

  // Spotify (solo control remoto de la reproducción)
  const configSpotify = {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    puerto: Number(process.env.SPOTIFY_PUERTO_REDIRECCION) || 8888,
  };
  const cuentasSpotify = new CuentasSpotify(
    new GuardarCuentaSpotify(persistencia),
    new ObtenerCuentaSpotify(persistencia),
    new EliminarCuentaSpotify(persistencia)
  );
  const clienteSpotify = new ClienteSpotify(
    cuentasSpotify,
    configSpotify,
    new AutenticacionSpotify(configSpotify, (url) => shell.openExternal(url))
  );
  registerSpotifyIpc(clienteSpotify);
  // Inteligencia artificial: router (GptMini → Gemini → Gemma), claves, Ollama y una sola cola para todo.
  // Se crea UNA sola vez: registrarIpcIA no puede llamarse dos veces (ipcMain.handle falla con el mismo canal).
  const ia = crearServiciosIA({
    alProgreso: (e) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('ia:progreso', e)),
    alOllama: (e) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('ia:ollama', e)),
  });
  iaServicios = ia;
  // El IPC de la IA (generar, cancelar, claves, Ollama) habla con ServicioIA, no con los servicios sueltos.
  const servicioIA = new ServicioIA(ia);
  registrarIpcIA(servicioIA);

  // Material con IA: la IA propone, el usuario revisa en la pantalla previa y recién ahí se guarda.
  const obtenerMaterialIA = new ObtenerMaterialIA(persistencia);
  const generadorMaterial = new GeneradorMaterialIA(ia.router, {
    maxTokens: Number(process.env.IA_MAX_TOKENS_FRAGMENTO) || 3000,
    solapamientoTokens: 150,
  });
  const materialIA = new MaterialIA(
    archivos,
    almacenamiento,
    generadorMaterial,
    ia.cola,
    new GuardarMaterialIA(persistencia),
    new ListarMaterialesIA(persistencia),
    obtenerMaterialIA,
    new EliminarMaterialIA(persistencia),
    new ResponderCuestionario(persistencia, obtenerMaterialIA),
    new ListarIntentosCuestionario(persistencia),
    new EditarMapaMentalIA(persistencia, obtenerMaterialIA),
    new GuardarGuiaPreguntas(archivos, nodos, persistencia),
    servicioIA,
    new GuardarResumenIA(archivos, nodos, persistencia),
  );
  registerMaterialIAIpc(materialIA);
  registrarIpcPlanArchivo(ia.router, ia.cola);

  // Chat con IA: usa el mismo router (GptMini → Gemma) y la misma cola; las conversaciones se guardan.
  const chatIA = new ChatIA(
    new AsistenteChat(ia.router),
    ia.cola,
    new ListarConversacionesIA(persistencia),
    new ObtenerConversacionIA(persistencia),
    new GuardarIntercambioIA(persistencia),
    new RenombrarConversacionIA(persistencia),
    new EliminarConversacionIA(persistencia),
    archivos,
    almacenamiento,
    new AgendaParaIA(persistencia),
  );
  registerChatIAIpc(chatIA);
  // Una sola cola para toda la IA: al cerrar se cancela todo lo que esté en curso.
  cancelarIA = () => ia.cola.cancelarTodo();

  return proceso;
}

// Avisa a la pantalla que se intentó cerrar la app durante una sesión de Práctica activa.
function avisarSalidaBloqueada(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send(CANAL_SALIDA_BLOQUEADA, procesoSesion?.obtenerSnapshot() ?? null);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Para que el sonido de los avisos pueda reproducirse sin que se haya hecho clic.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  // Corrector ortográfico con sugerencias en el clic derecho.
  activarMenuContextual(mainWindow.webContents);
  mainWindow.on('ready-to-show', () => mainWindow?.show());
  // Práctica activa: mientras no se cumpla el tiempo de la sesión, la ventana no se cierra.
  mainWindow.on('close', (event) => {
    if (cerrando || !procesoSesion?.salidaBloqueada()) return;
    event.preventDefault();
    avisarSalidaBloqueada();
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

}

// Una sola Syntra abierta por usuario: si se abre otra, se muestra la que ya estaba.
// (Dos a la vez se pelean por la misma base y la segunda no puede arrancar.)
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(async () => {
  // Sin la barra de menú de Electron (File, Edit, View...).
  Menu.setApplicationMenu(null);
  // Windows necesita este nombre para mostrar las notificaciones de la app.
  if (process.platform === 'win32') app.setAppUserModelId(is.dev ? process.execPath : 'com.syntra.app');

  const carpetaModelos = resolve(__dirname, '../renderer/models');
  // Dictado con Whisper: el modelo se baja la primera vez a la carpeta de la app (no viene en el instalador).
  const modeloDictado = new ModeloDictado(path.join(app.getPath('userData'), 'dictado'), (url, opciones) => net.fetch(url, opciones));
  registerDictadoIpc(modeloDictado);

  // modelos://local/... son los modelos que vienen con la app; modelos://dictado/... el de Whisper.
  protocol.handle('modelos', (request) => {
    const url = new URL(request.url);
    const carpetas: Record<string, string> = { local: carpetaModelos, dictado: modeloDictado.carpeta };
    const carpetaBase = carpetas[url.hostname];
    if (!carpetaBase) return new Response('', { status: 403 });

    let archivo: string;
    try {
      archivo = decodeURIComponent(url.pathname);
    } catch {
      return new Response('', { status: 400 });
    }

    const ruta = resolve(carpetaBase, `.${archivo}`);
    const rutaRelativa = relative(carpetaBase, ruta);
    if (rutaRelativa.startsWith('..') || isAbsolute(rutaRelativa)) {
      return new Response('', { status: 403 });
    }
    // transformers.js pide algunos archivos opcionales: tiene que recibir un 404, no un error de red.
    if (!existsSync(ruta)) return new Response('', { status: 404 });

    return net.fetch(pathToFileURL(ruta).toString());
  });

  try {
    await iniciarBaseEmbebida();
    await verifyDbConnection();
  } catch (error) {
    console.error('[startup] No se pudo preparar la base de datos:', error);
    dialog.showErrorBox(
      'No se pudo preparar la base de datos',
      'Revisá la conexión y el esquema de PostgreSQL y volvé a abrir la aplicación.'
    );
    app.quit();
    return;
  }

  // Los handlers IPC se registran antes de crear la ventana.
  procesoSesion = wireDependencies();

  const recordatorios = new EnviarRecordatoriosPendientes(new Persistencia(pool));
  let recordatoriosEnCurso = false;
  const enviarRecordatorios = async (): Promise<void> => {
    if (recordatoriosEnCurso) return;
    recordatoriosEnCurso = true;
    try {
      await recordatorios.ejecutar();
    } catch (error) {
      console.error('[repeticion-espaciada] No se pudieron enviar los recordatorios pendientes.', error);
    } finally {
      recordatoriosEnCurso = false;
    }
  };
  void enviarRecordatorios();
  setInterval(() => void enviarRecordatorios(), 15 * 60 * 1000);
  createWindow();
  // Inicia Ollama si está apagado y revisa el modelo. Sin await: no frena el arranque de la app.
  void iaServicios?.gestorOllama.preparar();
  await procesoSesion.arrancar();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  console.error('[startup] Falló el arranque:', err);
  app.quit();
});

app.on('window-all-closed', () => {
  // El pool se cierra en before-quit, después de liberar los bloqueos de edición.
  procesoSesion?.detener();
  if (process.platform !== 'darwin') app.quit();
});

// Cierre ordenado: libera los bloqueos de edición y recién después cierra el pool.
app.on('before-quit', (event) => {
  if (cerrando) return;
  // Práctica activa sin cumplir el tiempo: tampoco se sale con Cmd+Q / el menú.
  if (procesoSesion?.salidaBloqueada()) {
    event.preventDefault();
    avisarSalidaBloqueada();
    return;
  }
  event.preventDefault();
  cerrando = true;

  // Corta lo que la IA tenga en curso y apaga el Ollama que inició la app (si ya estaba corriendo, no lo toca).
  cancelarIA?.();
  iaServicios?.gestorOllama.detener();

  void (async () => {
    // Primero se frena el barrido de la sincronización: si no, sigue consultando la base ya cerrada.
    try {
      await detenerSincronizacion?.();
    } catch (err) {
      console.error('[shutdown] No se pudo frenar la sincronización:', err);
    }
    try {
      await edicion?.cerrarTodas();
    } catch (err) {
      console.error('[shutdown] No se pudieron liberar los bloqueos:', err);
    }
    try {
      await pool.end();
    } catch (err) {
      console.error('[shutdown] Error al cerrar el pool:', err);
    }
    try {
      await detenerBaseEmbebida();
    } catch (err) {
      console.error('[shutdown] No se pudo apagar la base:', err);
    }
    app.quit();
  })();
});