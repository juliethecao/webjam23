var map = L.map('map').setView([33.65071192475636, -117.84493567558403], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);


function plotMarkers(csvData) {
    var rows = Papa.parse(csvData, { header: true }).data;
    rows.forEach(function(row) {
        var latlon = row.Latlon.split(',');
        var lat = parseFloat(latlon[0]);
        var lon = parseFloat(latlon[1]);
        L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>${row.Building}</b><br>Type: ${row.Building_type}<br>School Type: ${row.School_type}`);
    });
}

var csvData;

function searchBuilding() {
    var searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm.trim() === '') {
        alert('Please enter a building name.');
        return;
    }
 
    var rows = Papa.parse(csvData, { header: true }).data;
    var building = rows.find(row => row.Building.toLowerCase() === searchTerm);
 
    if (building) {
        var latlon = building.Latlon.split(',');
        var lat = parseFloat(latlon[0]);
        var lon = parseFloat(latlon[1]);
 
        map.setView([lat, lon], 15);
        L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>${building.Building}</b><br>Type: ${building.Building_type}<br>School Type: ${building.School_type}`)
            .openPopup();
    } else {
        alert('Building not found.');
    }
 }
 

document.getElementById('search-container').addEventListener('submit', function(event) {
    event.preventDefault();
    searchBuilding();
 });
 
 fetch('uci_buildings.csv')
 .then(response => response.text())
 .then(data => {
     csvData = data;
     plotMarkers(csvData);
 })
 .catch(error => console.error('Error fetching CSV:', error));