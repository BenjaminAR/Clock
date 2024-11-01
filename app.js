// Constantes de configuración
const CONFIG = {
    INTERVALO_RELOJ: 1000,
    VIDEO_HEIGHT: '240',
    VIDEO_WIDTH: '426'  // Mantenemos proporción 16:9
};

// Clase para manejar el reloj digital
class RelojDigital {
    constructor() {
        this.relojElement = document.getElementById('reloj');
        this.ampmElement = document.getElementById('ampm');
        this.clockContainer = document.querySelector('.clock-container');
        
        if (!this.relojElement || !this.ampmElement) {
            throw new Error('Elementos del reloj no encontrados en el DOM');
        }
    }

    formatearHora(numero) {
        return String(numero).padStart(2, '0');
    }

    actualizar() {
        const ahora = new Date();
        let horas = ahora.getHours();
        const minutos = this.formatearHora(ahora.getMinutes());
        const segundos = this.formatearHora(ahora.getSeconds());
        const ampm = horas >= 12 ? 'PM' : 'AM';

        horas = horas % 12 || 12;
        const horasFormateadas = this.formatearHora(horas);

        this.relojElement.textContent = `${horasFormateadas}:${minutos}:${segundos}`;
        this.ampmElement.textContent = ampm;
    }

    ajustarTamañoConVideo() {
        this.clockContainer.classList.add('with-player');
    }

    iniciar() {
        this.actualizar();
        setInterval(() => this.actualizar(), CONFIG.INTERVALO_RELOJ);
    }
}

// Clase para manejar el Wake Lock
class PantallaActiva {
    constructor() {
        this.wakeLock = null;
    }

    async activar() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock activado exitosamente');
            } else {
                console.warn('Wake Lock API no soportada en este navegador');
            }
        } catch (err) {
            console.error('Error al activar Wake Lock:', err);
        }
    }

    async desactivar() {
        try {
            if (this.wakeLock) {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('Wake Lock liberado exitosamente');
            }
        } catch (err) {
            console.error('Error al liberar Wake Lock:', err);
        }
    }
}

// Clase para manejar el reproductor de YouTube
class ReproductorYouTube {
    constructor(videoId, horaReproduccion, relojDigital) {
        this.videoId = this.extraerVideoId(videoId);
        this.horaReproduccion = horaReproduccion;
        this.player = null;
        this.relojDigital = relojDigital;
        this.playerContainer = document.getElementById('playerContainer');
    }

    extraerVideoId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : url;
    }

    inicializar() {
        return new Promise((resolve) => {
            window.onYouTubeIframeAPIReady = () => {
                this.player = new YT.Player('player', {
                    height: CONFIG.VIDEO_HEIGHT,
                    width: CONFIG.VIDEO_WIDTH,
                    videoId: this.videoId,
                    events: {
                        'onReady': (event) => this.configurarReproduccionProgramada(event),
                        'onStateChange': (event) => this.manejarCambioEstado(event)
                    }
                });
                resolve();
            };

            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        });
    }

    manejarCambioEstado(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            this.playerContainer.classList.remove('hidden');
            this.relojDigital.ajustarTamañoConVideo();
        }
    }

    configurarReproduccionProgramada(event) {
        const [horas, minutos] = this.horaReproduccion.split(':');
        const horaReproduccion = new Date();
        horaReproduccion.setHours(parseInt(horas));
        horaReproduccion.setMinutes(parseInt(minutos));
        horaReproduccion.setSeconds(0);

        // Si la hora de reproducción ya pasó hoy, programarla para el día siguiente
        const ahora = new Date();
        if (horaReproduccion < ahora) {
            horaReproduccion.setDate(horaReproduccion.getDate() + 1);
        }

        const tiempoRestante = horaReproduccion.getTime() - ahora.getTime();

        if (tiempoRestante > 0) {
            const tiempoFormateado = new Date(tiempoRestante).toISOString().substr(11, 8);
            console.log(`Video programado para reproducirse en ${tiempoFormateado}`);
            setTimeout(() => {
                this.player.playVideo();
            }, tiempoRestante);
        } else {
            console.warn('La hora de reproducción programada ya pasó');
            alert('La hora seleccionada ya pasó. Por favor, recarga la página y selecciona una hora futura.');
        }
    }
}
// Clase para manejar la configuración inicial
class ConfiguracionInicial {
    constructor() {
        this.form = document.getElementById('formConfiguracion');
        this.contenidoPrincipal = document.getElementById('contenidoPrincipal');
        this.configuracionInicial = document.getElementById('configuracionInicial');
    }

    async iniciar() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const urlVideo = document.getElementById('youtubeUrl').value;
            const horaReproduccion = document.getElementById('horaReproduccion').value;

            if (!this.validarURL(urlVideo)) {
                alert('Por favor, introduce una URL válida de YouTube');
                return;
            }

            this.configuracionInicial.classList.add('hidden');
            this.contenidoPrincipal.classList.remove('hidden');

            await this.iniciarAplicacion(urlVideo, horaReproduccion);
        });
    }

    validarURL(url) {
        const regExp = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        return regExp.test(url);
    }

    async iniciarAplicacion(urlVideo, horaReproduccion) {
        try {
            // Iniciar reloj
            const reloj = new RelojDigital();
            reloj.iniciar();

            // Activar mantener pantalla encendida
            const pantallaActiva = new PantallaActiva();
            await pantallaActiva.activar();

            // Inicializar reproductor de YouTube
            const reproductor = new ReproductorYouTube(urlVideo, horaReproduccion, reloj);
            await reproductor.inicializar();

        } catch (error) {
            console.error('Error durante la inicialización:', error);
            alert('Hubo un error al iniciar la aplicación. Por favor, recarga la página.');
        }
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const config = new ConfiguracionInicial();
    config.iniciar();
});

// Función para abrir en pantalla completa
function abrirPantallaCompleta() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { // Chrome, Safari y Opera
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
    }
    this.divButtonabrirPantallaCompleta = document.getElementById('fullScreenButton');
    this.divButtonexitFullScreenButton = document.getElementById('exitFullScreenButton');
    this.divButtonabrirPantallaCompleta.classList.add('d-none');
    this.divButtonexitFullScreenButton.classList.remove('d-none');
}

// Botón para activar pantalla completa
document.getElementById('fullScreenButton').onclick = abrirPantallaCompleta;

// Función para salir del modo de pantalla completa
function salirPantallaCompleta() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari y Opera
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
    }
    this.divButtonabrirPantallaCompleta = document.getElementById('fullScreenButton');
    this.divButtonexitFullScreenButton = document.getElementById('exitFullScreenButton');
    this.divButtonabrirPantallaCompleta.classList.remove('d-none');
    this.divButtonexitFullScreenButton.classList.add('d-none');
}

// Botón para salir de pantalla completa
document.getElementById('exitFullScreenButton').onclick = salirPantallaCompleta;
