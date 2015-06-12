var OSM = {

    lat:12.93331,
    lon: 77.61349,
    zoom: 12,
    maxZoom: 19,
    timeOut: 500,
    rtfsTileLayer : {},
    popup : {},
    map : {},
    circleVectorLayer : new ol.layer.Vector({source: new ol.source.Vector()}),
    markerVectorLayer : new ol.layer.Vector({source: new ol.source.Vector()}),
    lineVectorLayer : new ol.layer.Vector({source: new ol.source.Vector()}),
    spiderFyFeaures : [],
    spiderFyFeauresCord : [],
    spiderFyRadius : 100,
    
    init : function(lat, lon, mapId) {
        OSM.lat = lat;
        OSM.lon = lon;
        OSM.drawMap(mapId);
        OSM.setPopUp();
        jQuery(document).click(function (e){
            var container = jQuery("#"+mapId);
            if (!container.is(e.target) // if the target of the click isn't the container...
                && container.has(e.target).length === 0){ // ... nor a descendant of the container
                OSM.removeSpiderFy();
            }
        });
    },

    setSource : function() {
        OSM.rtfsTileLayer = new ol.layer.Tile({
            source: new ol.source.OSM({
                crossOrigin: null,
                url: 'http://rtfs01.tfsit.de/osm/{z}/{x}/{y}.png'
            })
        });
    },

    addZoomSlider : function() {
        var zoomslider = new ol.control.ZoomSlider();
        OSM.map.addControl(zoomslider);
    },

    drawMap : function(mapId) {
        OSM.setSource();
        
        OSM.map = new ol.Map({
            layers: [
                OSM.rtfsTileLayer,
                OSM.circleVectorLayer,
                OSM.markerVectorLayer
            ],
            target: mapId,
            view: new ol.View({
                center: ol.proj.transform([OSM.lon, OSM.lat], 'EPSG:4326', 'EPSG:3857'),
                zoom: OSM.zoom,
                maxZoom : OSM.maxZoom
            })
        });

        OSM.addZoomSlider();
    },

    setPopUp : function() {
        OSM.popup = new ol.Overlay({
            element: jQuery("#popup"),
            positioning: 'bottom-center',
            stopEvent: false
        });
        OSM.map.addOverlay(OSM.popup);
    },

    createFeature : function(lat, lon, title, content, imgPath) {
        var iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform([lon, lat], 'EPSG:4326',   'EPSG:3857')),
            title: title,
            content: content,
        });
        var iconStyle = OSM.createFeatureStyle(imgPath);
        iconFeature.setStyle(iconStyle);
        return iconFeature;
    },

    createFeatureStyle : function(imgPath) {
        //create the style
        var iconStyle = new ol.style.Style({
            image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
                src: imgPath
            }))
        });
        return  iconStyle;
    },

    handleMarkerClick : function(evt, callBack) {
        // Hide existing popup and reset it's offset
        // OSM.popup.setOffset([0, 0]);
        // Attempt to find a feature in one of the visible vector layers
        var features = [];
        OSM.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
            features.push(feature);
        });
        OSM.destroyPopover();
        if(features.length == 1){
            setTimeout(function(){ callBack(features[0]); }, OSM.timeOut);
        }else if(features.length > 1){
            OSM.removeSpiderFy();
            OSM.handleSpiderFy(features);
        }else{
            //OSM.removeSpiderFy();
        }
    },
    
    createLineFeature : function(point1, point2, vectorSource) {
        var lineFeature = new ol.Feature({
            geometry: new ol.geom.LineString([point1, point2]),
        });
        var style = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    width: 2,
                    color: 'rgb(65, 65, 65)'
                })
        });
        lineFeature.setStyle(style);
        vectorSource.addFeature(lineFeature);
    },

    handleSpiderFy : function(features) {
		var points = features.length;
        var centerXY = features[0].getGeometry().getCoordinates(); 
        OSM.spiderFyRadius = OSM.setRadius(centerXY);
        var circlePoints = OSM.getCirclePoints(OSM.spiderFyRadius, points, centerXY[0], centerXY[1]);
        var vectorSource = new ol.source.Vector({});
        jQuery.each(features, function(key, feature){
            if(typeof(feature) != 'undefined' && feature != null){
                var coord = feature.getGeometry().getCoordinates();
                var newCoord = [circlePoints.x[key], circlePoints.y[key]];
                OSM.spiderFyFeaures.push(feature);
                OSM.spiderFyFeauresCord.push(coord);
                OSM.createLineFeature(newCoord, coord, vectorSource);
                feature.setGeometry(new ol.geom.Point(newCoord));
            }
        });
        OSM.lineVectorLayer = new ol.layer.Vector({
            source: vectorSource
        });
        OSM.map.addLayer(OSM.lineVectorLayer);
    },

    removeSpiderFy : function() {

        var len = OSM.spiderFyFeaures.length;
        for(var i=len-1; i>=0; i--){
            var coord = OSM.spiderFyFeauresCord[i];
            OSM.spiderFyFeaures[i].setGeometry(new ol.geom.Point(coord));
        }
        OSM.map.removeLayer(OSM.lineVectorLayer);
        OSM.spiderFyFeaures = [];
        OSM.spiderFyFeauresCord = [];
    },

    setRadius : function(centerXY){
        var zoom = OSM.map.getView().getZoom();
        if(zoom <= 9){
            OSM.map.getView().setCenter(centerXY); 
            OSM.changeZoomLevel(9);
            return 10000;
        }else if(zoom > 9 && zoom < OSM.maxZoom){
            switch (zoom) {
                case 10:
                    return 5000;
                break;
                case 11:
                    return 3000;
                break;
                case 12:
                    return 1000;
                break;
                case 13:
                    return 500;
                break;
                case 14:
                    return 250;
                break;
                case 15:
                    return 125;
                break;
                case 16:
                    return 80;
                break;
                default:
                    return 50;
                break;
            }
        }else{
            return 50;
        }
    },

    getCirclePoints : function(radius, steps, centerX, centerY){
        var xValues = [];
        var yValues = [];
        for (var i = 0; i < steps; i++) {
            xValues[i] = (centerX + radius * Math.cos(2 * Math.PI * i / steps));
            yValues[i] = (centerY + radius * Math.sin(2 * Math.PI * i / steps));
        }
        return {'x':xValues, 'y': yValues};
    },

    handlePopover : function(feature) {
        if (feature) {
            var coord = feature.getGeometry().getCoordinates();
            var props = feature.getProperties();
            OSM.popup.setOffset([0, -3]);
            OSM.popup.setPosition(coord);
            jQuery("#popup").popover({
                placement: 'top',
                html: true,
                content: props.content,
                title: '<span class="text-info"><strong>'+props.title+'</strong></span>'+
                       '<span class="close" onclick="OSM.destroyPopover();">X</span>',
            });
            jQuery("#popup").popover("show");
        }
    },

    destroyPopover : function() {
        jQuery("#popup").popover('destroy');
    },

    clearMarker : function() {
        OSM.map.removeLayer(OSM.markerVectorLayer);
    },
    
    changeMapCenter : function(lat, lon) {
        var view = OSM.map.getView(); 
        view.setCenter(ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857')); 
    },

    changeZoomLevel : function(zoom) {
        if(zoom <= OSM.maxZoom && zoom >= 0) {
            OSM.map.getView().setZoom(zoom);
        }
    },

    clearCircleVector : function() {
        OSM.circleVectorLayer.getSource().clear();
    },

    createCircleFeature : function(lat, lon, radius) {
        var wgs84Sphere = new ol.Sphere(6378137);
        return ol.geom.Polygon.circular(wgs84Sphere, [lon, lat], radius, 64).transform('EPSG:4326', 'EPSG:3857');
    },

    drawCircle : function(lat, lon, radius) {

        OSM.clearCircleVector();
        var circle = OSM.createCircleFeature(lat, lon, radius);
        var featureCircle = new ol.Feature({
            geometry: circle,
        });

        var circleStyle = new ol.style.Style({
            fill : new ol.style.Fill({
                color: 'rgba(255,255,0,0.4)'
            }),
            stroke: new ol.style.Stroke({
                color: 'rgb(255,255,0)',
                opacity: 0.4
            })
        });
        featureCircle.setStyle(circleStyle);
        OSM.circleVectorLayer.getSource().addFeature(featureCircle);
        OSM.changeMapCenter(lat, lon);
    }

}

var AjaxUtil = {
    ajaxAction: function(url, type, ajaxData, callback, responseType){
        jQuery.ajax({
            url : url,
            type : type,
            data : ajaxData,
            success : function(transport) {
                if(responseType == 'plain-response') {
                    var response = transport;
                }else {
                    var response = jQuery.parseJSON(transport);
                }
                ajaxResponse =  {"type": "success", "msg": response};
            },
            error: function(){
                ajaxResponse =  {"type": "failure", "msg": "Some Error Occured"};
            },
            complete: function(){
                if(typeof(callback) !== "undefined"){
                    callback(ajaxResponse);
                }
            }
        });
    }    
}