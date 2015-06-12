var VtsMap = {

	city : '',
    locationsUrl : '',
    callCenterGetLatLonUrl : '',
    devices : {},
    pendingBookings : {},
    inProgress : 0,

	init : function() {
		VtsMap.initializeMemberVars();
		VtsMap.handleMarkerLayerDisplay(VtsMap.devices);
        OSM.map.on('click', function(evt) {
            OSM.handleMarkerClick(evt, OSM.handlePopover);
        });
        jQuery("#right-block").find(".select_all_state").on("click", function(e){
            jQuery("#right-block").find("input[type='checkbox']").attr('checked', 'checked');
            VtsMap.handleMarkerSelection(e);
        });
        jQuery("#right-block").find(".select_none_state").on("click", function(e){
            jQuery("#right-block").find("input[type='checkbox']").removeAttr('checked');
            VtsMap.handleMarkerSelection(e);
        });
        jQuery("#right-block").find("input[type='checkbox']").on("change", function(e){
           VtsMap.handleMarkerSelection(e);
        });
        jQuery("#id_map_area").autocomplete({
            source: VtsMap.locationsUrl,
            autoFocus: true,
            minLength: 2
        });

        jQuery("#map_button").on("click", function(e){
            e.preventDefault();
            VtsMap.handleMapAreaSelection();
        });
        jQuery('#id_refresh').click(function(){
            window.location.reload();
        });
		jQuery('#gps_operator').on('change', function() {
			var value = jQuery(this).val()
			window.location.href = '?operator_id=' + value;
		});
		jQuery('#carrier, #rt_cab, #car_type').on('change', function(e){
			VtsMap.handleMarkerSelection(e);
		});
		jQuery('#gps_driver,.status').change(function(e){
			jQuery('#carrier').val('');
			VtsMap.handleMarkerSelection(e);
		});
		jQuery('#gps_driver_search').change(function(e){
			jQuery('#gps_operator').val('');
			jQuery('#carrier').val('');
			jQuery('#rt_cab').val('');
			jQuery('#car_type').val('');
			jQuery('#gps_driver').val(jQuery(this).val());
			VtsMap.handleMarkerSelection(e);
		});
	},

    initializeMemberVars : function(){
        VtsMap.city = city;
        VtsMap.locationsUrl = locationsUrl;
        VtsMap.devices = devices;
        jQuery.merge(VtsMap.devices, clusterDrivers);
        jQuery.merge(VtsMap.devices, otherDrivers);
        jQuery.merge(VtsMap.devices, blockedDevicesJson);
        jQuery.merge(VtsMap.devices, blackmarkedDevicesJson);
        VtsMap.pendingBookings = pendingBookings;
        VtsMap.callCenterGetLatLonUrl = callCenterGetLatLonUrl;
        OSM.init(latitude, longitude, 'map');
    },

	handleMarkerSelection : function(e) {
        e.preventDefault();
        OSM.destroyPopover();
        setTimeout(function(){ VtsMap.handleMarkerLayerDisplay(VtsMap.devices) }, OSM.timeOut);
    },

    getImagePath : function(device){
        if(device.type = 'devices'){
            return '/static/images/tfs_device_'+device.state+'.png';
        }else if(device.type = 'blocked_devices'){
            return '/static/images/tfs_device_Blocked.png';
        }else if(device.type = 'blackmarked_devices'){
            return '/static/images/tfs_device_Blocked.png';
        }else{
            return '/static/images/tfs_device.png'; 
        }
    },

    handleMarkerLayerDisplay : function(devices) {

        var vectorSource = new ol.source.Vector({}); //create empty vector
        OSM.clearMarker();
        var checkboxSelected = [];
        
        jQuery("#right-block").find("input[type='checkbox']:checked").each(function(){
            checkboxSelected.push(jQuery(this).val());
        });
        
        var topFilters = VtsMap.getTopFilter();

        jQuery.each(devices, function(key, device){
            if(checkboxSelected.indexOf(device.state) >= 0 && device.latitude) {
            	if(VtsMap.validateTopFilter(device, topFilters)){
                    var title = device.state;
                    var content = device.map_info;
                    content += "<br>UUID - " + device.uuid;
                    var imgPath = VtsMap.getImagePath(device)
                    var iconFeature = OSM.createFeature(parseFloat(device.latitude), parseFloat(device.longitude), title, content, imgPath);
                    vectorSource.addFeature(iconFeature);
            	}
            }
        });

        jQuery.each(VtsMap.pendingBookings, function(key, booking){
            if(checkboxSelected.indexOf(booking.state) >= 0 && booking.latitude) {
                var title = booking.state;
                var content = booking.map_info;
                var imgPath = '/static/images/';
                if(booking.dispatch_status == 'manual-release'){
                    imgPath += 'manual_';
                }
                imgPath += booking.time+'_hour.png';
                var iconFeature = OSM.createFeature(parseFloat(booking.latitude), parseFloat(booking.longitude), title, content, imgPath);
                vectorSource.addFeature(iconFeature);
            }
        });

        OSM.markerVectorLayer = new ol.layer.Vector({
            source: vectorSource
        });
        OSM.map.addLayer(OSM.markerVectorLayer);

    },

    validateTopFilter : function(device, topFilters) {
		if ((topFilters.operatorId != '') && device.driver_operator_id != '' && (device.driver_operator_id != topFilters.operatorId)) {
			return false;
		}
		if ((topFilters.driverId != '') && device.driver_id != '' && (device.driver_id != topFilters.driverId)) {
			return false;
		}
		if ((topFilters.isCarrier != '') && (device.driver_has_carrier != topFilters.isCarrier)){
			return false;
		}
		if ((topFilters.isRtCab != '') && (VtsMap.isRtCab(device.vehicle_number) != topFilters.isRtCab )){
			return false;
		}
		if ((topFilters.carType != '') && (device.car_type != topFilters.carType )){
			return false;
		}
		if ((topFilters.carType == '') && (device.car_type == 25 )){
			return false;
		}
		return true;
    },

    getTopFilter : function() {
    	var retVal = {
    		'operatorId' : jQuery('#gps_operator').val(),
    		'driverId' : jQuery('#gps_driver').val(),
    		'isCarrier' : jQuery('#carrier').val(),
    		'isRtCab' : jQuery('#rt_cab').val(),
    		'carType' : jQuery('#car_type').val()
    	};

    	return retVal;
    },

    handleMapAreaSelection : function() {
    	jQuery("#map_button").attr("disabled", "disabled");
        var area = jQuery('#id_map_area').val();
        if (VtsMap.inProgress == 0 && area != '' && area.toLowerCase() != 'enter area') {
        	VtsMap.inProgress = 1;
        	var ajaxData = {'pickup_area': area, 'city': VtsMap.city};
        	AjaxUtil.ajaxAction(VtsMap.callCenterGetLatLonUrl, 'GET', ajaxData, VtsMap.postMapAreaSelection, 'plain-response');
        }else if(VtsMap.inProgress == 0){
        	jQuery("#map_button").removeAttr("disabled");
        }
    },

    postMapAreaSelection : function(response) {
    	VtsMap.inProgress = 0;
    	jQuery("#map_button").removeAttr("disabled");
       	if(typeof(response.msg) != 'undefined' && response.msg != ""){
        	var lat = parseFloat(response.msg[0][0]);
        	var lon = parseFloat(response.msg[0][1]);
        	var radius = parseInt(jQuery("#radius").val());
    		OSM.drawCircle(lat, lon, radius);
    		OSM.changeZoomLevel(13);
        }
        else{
        	//TO-DO Display error msg
        }
    },

    isRtCab : function(vehicleNumber) {
    	if(vehicleNumber){
    		if(vehicleNumber.split('-').length == 4 && vehicleNumber.split('-')[2] == 'RT') {
    			return 1;
    		}
    	}
    	return 0;
    }

}

jQuery(document).ready(function(){
    VtsMap.init();
});
