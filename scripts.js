//CREACION DE MAPA Y ZOOM INICIAL//

var map = L.map('map', { zoomControl: false }).setView([6.24, -75.58], 13);

var colmayor = L.polygon([[6.273064, -75.592007],
[6.273671, -75.591695],
[6.273634, -75.591363],
[6.273752, -75.590807],
[6.273926, -75.590396],
[6.273696, -75.590115],
[6.273512, -75.590265],
[6.273281, -75.590454],
[6.273152, -75.590469],
[6.272956, -75.590426],
[6.272585, -75.590438],
[6.27251, -75.59071],
[6.272786, -75.591506],
[6.272929, -75.591764],
[6.273064, -75.592007],
]).addTo(map);

//AÑADIR SHAPEFILE//

function mostrarAtributos(feature, layer) {
  const contenido = document.createElement('pre');
  contenido.textContent = Object.entries(feature.properties || {})
    .map(([campo, valor]) => campo + ': ' + valor)
    .join('\n');
  layer.bindPopup(contenido);
}

var expansion = new L.Shapefile('data/AREA_EXPANSION_ROBLEDO_43262.zip', {
  onEachFeature: mostrarAtributos
}).addTo(map);



// cargar TIFF como capa raster
var capas = {'IU COLEGIO MAYOR DE ANTIOQUIA': colmayor, 'Area de expansion': expansion};
var limitesRasters = L.latLngBounds();


function cargarGeoTiff(ruta, nombre, opciones) {
  opciones = opciones || {};
  var grupo = L.layerGroup().addTo(map);
  capas[nombre] = grupo;


  fetch(ruta)
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.arrayBuffer();
    })
    .then(function (buffer) {
      return parseGeoraster(buffer, { readOnDemand: true });
    })
    .then(function (georaster) {
      if (georaster.numberOfRasters < 3) {
        throw new Error('Se necesitan al menos tres bandas para mostrar color natural.');
      }


      var capa = new GeoRasterLayer({
        georaster: georaster,
        resolution: 256,
        pixelValuesToColorFn: function (values) {
          if (values.slice(0, 3).some(function (value) { return value == null || Number.isNaN(value); })) return null;
          if (values.length > 3 && values[3] === 0) return null;


          var r, g, b;
          if (opciones.ycbcr) {
            var y = values[0], cb = values[1] - 128, cr = values[2] - 128;
            r = Math.round(y + 1.402 * cr);
            g = Math.round(y - 0.34414 * cb - 0.71414 * cr);
            b = Math.round(y + 1.772 * cb);
          } else {
            r = values[0]; g = values[1]; b = values[2];
          }


          if (opciones.fondoNegro && r <= 5 && g <= 5 && b <= 5) return null;
          if (values.length > 3) return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + values[3] / 255 + ')';
          return 'rgb(' + r + ', ' + g + ', ' + b + ')';
        }
      });


      grupo.addLayer(capa);
      limitesRasters.extend(capa.getBounds());
      map.fitBounds(limitesRasters);
    })
    .catch(function (error) {
      console.error('No se pudo cargar ' + ruta + ':', error);
    });


  return grupo;
}


var iguana = cargarGeoTiff('data/Iguana.tif', 'Iguana (GeoTIFF)', { ycbcr: true, fondoNegro: true });
var mede = cargarGeoTiff('data/mede.tif', 'Area Expansión 2008');



//MAPA//

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
});
var basemaps = {'Imágenes Esri': Esri_WorldImagery, 'Calles Esri': Esri_WorldStreetMap};

Esri_WorldImagery.addTo(map);

var layersControl = L.control.layers(basemaps, capas, {
  position: 'bottomright',
  collapsed: true
});
layersControl.addTo(map);
var layersToggle = layersControl.getContainer().querySelector('.leaflet-control-layers-toggle');
layersToggle.title = 'Seleccionar mapas base y capas';
layersToggle.setAttribute('aria-label', 'Seleccionar mapas base y capas');

var zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(map);
zoomControl.getContainer().querySelector('.leaflet-control-zoom-in').title = 'Acercar';
zoomControl.getContainer().querySelector('.leaflet-control-zoom-out').title = 'Alejar';
zoomControl.getContainer().querySelector('.leaflet-control-zoom-in').setAttribute('aria-label', 'Acercar');
zoomControl.getContainer().querySelector('.leaflet-control-zoom-out').setAttribute('aria-label', 'Alejar');

var drawnItems = new L.FeatureGroup().addTo(map);

L.drawLocal.draw.toolbar.buttons.polyline = 'Usar la regla para medir distancias';
L.drawLocal.draw.toolbar.buttons.polygon = 'Dibujar un polígono y consultar su área';
L.drawLocal.draw.toolbar.buttons.rectangle = 'Dibujar un rectángulo';
L.drawLocal.draw.toolbar.buttons.circle = 'Dibujar un círculo';
L.drawLocal.draw.toolbar.buttons.marker = 'Añadir un marcador';
L.drawLocal.draw.toolbar.buttons.circlemarker = 'Añadir un marcador circular';
L.drawLocal.draw.toolbar.actions.title = 'Cancelar el dibujo';
L.drawLocal.draw.toolbar.actions.text = 'Cancelar';
L.drawLocal.draw.toolbar.finish.title = 'Finalizar el dibujo';
L.drawLocal.draw.toolbar.finish.text = 'Finalizar';
L.drawLocal.draw.toolbar.undo.title = 'Eliminar el último punto';
L.drawLocal.draw.toolbar.undo.text = 'Deshacer';
L.drawLocal.draw.handlers.polyline.tooltip.start = 'Haz clic para iniciar la regla.';
L.drawLocal.draw.handlers.polyline.tooltip.cont = 'Haz clic para continuar midiendo.';
L.drawLocal.draw.handlers.polyline.tooltip.end = 'Haz clic en el último punto para finalizar la medida.';
L.drawLocal.draw.handlers.polyline.error = '<strong>Error:</strong> las líneas no pueden cruzarse.';
L.drawLocal.draw.handlers.polygon.tooltip.start = 'Haz clic para iniciar el polígono.';
L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Haz clic para añadir vértices.';
L.drawLocal.draw.handlers.polygon.tooltip.end = 'Haz clic en el primer punto para cerrar el polígono.';
L.drawLocal.draw.handlers.rectangle.tooltip.start = 'Haz clic y arrastra para dibujar el rectángulo.';
L.drawLocal.draw.handlers.circle.tooltip.start = 'Haz clic y arrastra para dibujar el círculo.';
L.drawLocal.draw.handlers.marker.tooltip.start = 'Haz clic en el mapa para añadir un marcador.';
L.drawLocal.draw.handlers.circlemarker.tooltip.start = 'Haz clic en el mapa para añadir un marcador circular.';
L.drawLocal.edit.toolbar.buttons.edit = 'Editar las geometrías dibujadas';
L.drawLocal.edit.toolbar.buttons.remove = 'Eliminar geometrías dibujadas';
L.drawLocal.edit.toolbar.actions.save.title = 'Guardar los cambios';
L.drawLocal.edit.toolbar.actions.save.text = 'Guardar';
L.drawLocal.edit.toolbar.actions.cancel.title = 'Cancelar la edición y descartar los cambios';
L.drawLocal.edit.toolbar.actions.cancel.text = 'Cancelar';
L.drawLocal.edit.toolbar.actions.clearAll.title = 'Eliminar todas las geometrías';
L.drawLocal.edit.toolbar.actions.clearAll.text = 'Eliminar todo';
L.drawLocal.edit.handlers.edit.tooltip.text = 'Arrastra los puntos para editar la geometría.';
L.drawLocal.edit.handlers.edit.tooltip.subtext = 'Haz clic en cancelar para descartar los cambios.';
L.drawLocal.edit.handlers.remove.tooltip.text = 'Selecciona una geometría para eliminarla.';

var drawControl = new L.Control.Draw({
  position: 'topright',
  draw: {
    polyline: {
      allowIntersection: false,
      metric: true,
      showLength: true,
      shapeOptions: { color: '#df762f', weight: 3 }
    },
    polygon: {
      allowIntersection: false,
      showArea: true,
      metric: true,
      shapeOptions: { color: '#df762f', weight: 2, fillOpacity: 0.18 }
    },
    rectangle: { shapeOptions: { color: '#df762f', weight: 2, fillOpacity: 0.16 } },
    circle: { shapeOptions: { color: '#df762f', weight: 2, fillOpacity: 0.16 } },
    marker: true,
    circlemarker: { radius: 6, color: '#df762f', fillOpacity: 0.8 }
  },
  edit: {
    featureGroup: drawnItems,
    edit: true,
    remove: true
  }
}).addTo(map);

function formatDistance(meters) {
  var number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
  return meters >= 1000 ? number.format(meters / 1000) + ' km' : number.format(meters) + ' m';
}

function formatArea(squareMeters) {
  var number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
  if (squareMeters >= 1000000) return number.format(squareMeters / 1000000) + ' km²';
  if (squareMeters >= 10000) return number.format(squareMeters / 10000) + ' ha';
  return number.format(squareMeters) + ' m²';
}

function measurePolyline(latlngs) {
  var distance = 0;
  for (var index = 1; index < latlngs.length; index++) {
    distance += latlngs[index - 1].distanceTo(latlngs[index]);
  }
  return distance;
}

map.on(L.Draw.Event.CREATED, function (event) {
  var layer = event.layer;
  var detail = '';

  if (event.layerType === 'polyline') {
    detail = 'Longitud: ' + formatDistance(measurePolyline(layer.getLatLngs()));
  } else if (event.layerType === 'polygon' || event.layerType === 'rectangle') {
    var ring = layer.getLatLngs()[0];
    detail = 'Área: ' + formatArea(L.GeometryUtil.geodesicArea(ring));
  } else if (event.layerType === 'circle') {
    detail = 'Radio: ' + formatDistance(layer.getRadius());
  } else if (event.layerType === 'marker' || event.layerType === 'circlemarker') {
    var point = layer.getLatLng();
    detail = 'Lat: ' + point.lat.toFixed(6) + ' · Lon: ' + point.lng.toFixed(6);
  }

  if (detail) layer.bindPopup('<strong>' + detail + '</strong>');
  drawnItems.addLayer(layer);
});

// CONTROL PARA MOSTRAR COORDENADAS DEL CURSOR EN LA ESQUINA INFERIOR
var coordsControl = L.control({ position: 'bottomleft' });

coordsControl.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'coordinate-readout');
    this._div.innerHTML = '<span class="coordinate-label">COORDENADAS</span><span>Lat. -- · Lon. --</span>';
    return this._div;
};

coordsControl.addTo(map);
L.control.scale({ position: 'bottomleft', metric: true, imperial: false, maxWidth: 120 }).addTo(map);

map.on('mousemove', function (e) {
    coordsControl._div.innerHTML = '<span class="coordinate-label">COORDENADAS</span><span>Lat. ' +
        e.latlng.lat.toFixed(5) + ' · Lon. ' + e.latlng.lng.toFixed(5) + '</span>';
});