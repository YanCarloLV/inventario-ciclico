// sw.js - Service Worker para Notificaciones Push WMS

// Escuchar el evento 'push' que viene del servidor
self.addEventListener('push', function(event) {
    console.log('[Service Worker] Notificación Push recibida.');
    
    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const title = data.titulo || 'Notificación WMS';
    const options = {
        body: data.mensaje || 'Tienes una nueva actualización en el almacén.',
        icon: '/logo.png', // El icono que aparecerá en la notificación
        badge: '/logo.png', // El icono pequeño de la barra de estado (Android)
        // Patrón de vibración: vibra, pausa, vibra, pausa... (Ideal para llamar la atención en bodega)
        vibrate: [200, 100, 200, 100, 200, 100, 200], 
        data: {
            url: data.urlAccion || '/' // A dónde nos lleva si el usuario toca la notificación
        }
    };

    // Mostrar la notificación en el sistema operativo
    event.waitUntil(self.registration.showNotification(title, options));
});

// Escuchar cuando el usuario toca la notificación en su celular
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Clic en la notificación.');
    
    event.notification.close(); // Cerramos el globito de notificación

    // Lógica para abrir la app o enfocar la pestaña si ya está abierta
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Si la app ya está abierta en alguna pestaña, la enfocamos
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si la app está cerrada, abrimos una nueva pestaña con la PWA
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});