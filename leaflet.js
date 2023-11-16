var buildings = {
    "Building_name": "Art Culture & Technology (ACT)",
    "Building_type": "Academic Units & Schools",
    "School_type": "Arts",
    "Latlon": "33.65071192475636, -117.84493567558403",
    "_id": "dVLCLXm22a2RA2Qt"
};

createMap([buildings]);

function createMap(buildings) {
    buildings.forEach(function (building) {
        if (building.Latlon && typeof building.Latlon === 'string') {
            var [lat, lon] = building.Latlon.split(',');
            var coords = [parseFloat(lat), parseFloat(lon)];
            var map = L.map('map').setView(coords, 17);
            // Credits to Leaflet API
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            plotMarkers(building, coords, map);
        }
    })
}

function plotMarkers(building, coords, map) {
    var marker = L.marker(coords).addTo(map);
    marker.bindPopup('<b>' + building.Building_name + '</b><br>' + 'Type: ' + building.Building_type + '</b><br>' + 'School: ' + building.School_type);
}
