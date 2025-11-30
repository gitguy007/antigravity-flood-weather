// Default location (Singapore)
const DEFAULT_LAT = 1.3521;
const DEFAULT_LON = 103.8198;
const DEFAULT_LOCATION = 'Singapore';

let currentLat = DEFAULT_LAT;
let currentLon = DEFAULT_LON;
let currentLocationName = DEFAULT_LOCATION;

// Cities organized by country
const citiesByCountry = {
    'SG': [{ name: 'Singapore', coords: '1.3521,103.8198' }],
    'US': [
        { name: 'New York', coords: '40.7128,-74.0060' },
        { name: 'Los Angeles', coords: '34.0522,-118.2437' },
        { name: 'Chicago', coords: '41.8781,-87.6298' },
        { name: 'Houston', coords: '29.7604,-95.3698' },
        { name: 'Miami', coords: '25.7617,-80.1918' },
        { name: 'San Francisco', coords: '37.7749,-122.4194' }
    ],
    'GB': [
        { name: 'London', coords: '51.5074,-0.1278' },
        { name: 'Manchester', coords: '53.4808,-2.2426' }
    ],
    'JP': [
        { name: 'Tokyo', coords: '35.6762,139.6503' },
        { name: 'Osaka', coords: '34.6937,135.5023' },
        { name: 'Kyoto', coords: '35.0116,135.7681' }
    ],
    'CN': [
        { name: 'Beijing', coords: '39.9042,116.4074' },
        { name: 'Shanghai', coords: '31.2304,121.4737' },
        { name: 'Hong Kong', coords: '22.3193,114.1694' },
        { name: 'Shenzhen', coords: '22.5431,114.0579' }
    ],
    'AU': [
        { name: 'Sydney', coords: '-33.8688,151.2093' },
        { name: 'Melbourne', coords: '-37.8136,144.9631' },
        { name: 'Brisbane', coords: '-27.4698,153.0251' }
    ],
    'FR': [
        { name: 'Paris', coords: '48.8566,2.3522' },
        { name: 'Lyon', coords: '45.7640,4.8357' }
    ],
    'DE': [
        { name: 'Berlin', coords: '52.5200,13.4050' },
        { name: 'Munich', coords: '48.1351,11.5820' }
    ],
    'IN': [
        { name: 'New Delhi', coords: '28.7041,77.1025' },
        { name: 'Mumbai', coords: '19.0760,72.8777' },
        { name: 'Bangalore', coords: '12.9716,77.5946' }
    ],
    'KR': [
        { name: 'Seoul', coords: '37.5665,126.9780' },
        { name: 'Busan', coords: '35.1796,129.0756' }
    ],
    'TH': [{ name: 'Bangkok', coords: '13.7563,100.5018' }],
    'MY': [{ name: 'Kuala Lumpur', coords: '3.1390,101.6869' }],
    'ID': [{ name: 'Jakarta', coords: '-6.2088,106.8456' }],
    'PH': [{ name: 'Manila', coords: '14.5995,120.9842' }],
    'VN': [{ name: 'Ho Chi Minh City', coords: '10.8231,106.6297' }],
    'CA': [
        { name: 'Toronto', coords: '43.6532,-79.3832' },
        { name: 'Vancouver', coords: '49.2827,-123.1207' }
    ],
    'BR': [
        { name: 'São Paulo', coords: '-23.5505,-46.6333' },
        { name: 'Rio de Janeiro', coords: '-22.9068,-43.1729' }
    ],
    'MX': [{ name: 'Mexico City', coords: '19.4326,-99.1332' }],
    'AE': [{ name: 'Dubai', coords: '25.2048,55.2708' }]
};

function updateCities() {
    const countrySelect = document.getElementById('country-select');
    const citySelect = document.getElementById('city-select');
    const country = countrySelect.value;
    citySelect.innerHTML = '<option value="">Choose a city...</option>';
    if (country && citiesByCountry[country]) {
        const cities = citiesByCountry[country];
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.coords;
            option.textContent = city.name;
            citySelect.appendChild(option);
        });
        if (cities.length > 0) {
            citySelect.value = cities[0].coords;
            changeLocation();
        }
    }
}

function changeLocation() {
    const citySelect = document.getElementById('city-select');
    const coords = citySelect.value;
    if (!coords) return;
    const [lat, lon] = coords.split(',').map(Number);
    currentLat = lat;
    currentLon = lon;
    currentLocationName = citySelect.options[citySelect.selectedIndex].text;
    updateLocation();
}

function updateLocation() {
    document.getElementById('location').textContent = currentLocationName;
    document.getElementById('weather-loading').style.display = 'block';
    document.getElementById('weather-content').style.display = 'none';
    document.getElementById('air-loading').style.display = 'block';
    document.getElementById('air-content').style.display = 'none';
    fetchWeatherData();
    fetchAirQualityData();
}

async function init() {
    updateLastUpdate();
    document.getElementById('location').textContent = currentLocationName;
    document.getElementById('country-select').value = 'SG';
    updateCities();
    fetchWeatherData();
    fetchAirQualityData();
}

async function fetchWeatherData() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        displayWeatherData(data);
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError('weather');
    }
}

async function fetchAirQualityData() {
    try {
        const apiKey = window.APP_CONFIG?.OPENAQ_API_KEY;
        if (!apiKey) {
            console.error('OpenAQ API key not configured');
            displayMockAirQuality();
            showNoApiKeyMessage();
            return;
        }

        // Use measurements endpoint which includes parameter info
        const url = `/api/openaq/v3/measurements?coordinates=${currentLat},${currentLon}&radius=25000&limit=100`;
        console.log('Fetching AQI via proxy:', url);

        const response = await fetch(url, {
            headers: { 'X-API-Key': apiKey }
        });
        const data = await response.json();
        console.log('OpenAQ Measurements Response:', data);

        if (data.results && data.results.length > 0) {
            displayAirQualityFromMeasurements(data.results);
        } else {
            displayMockAirQuality();
            showNoStationsMessage();
        }
    } catch (error) {
        console.error('Error fetching AQI:', error);
        displayMockAirQuality();
        showNoStationsMessage();
    }
}

function displayAirQualityFromMeasurements(measurements) {
    console.log('Processing measurements:', measurements);

    // Group by parameter and get the most recent value for each
    const parameterData = {};
    let locationName = 'Unknown Station';

    measurements.forEach(m => {
        const paramId = m.parameter?.id || m.parameter?.name;
        if (paramId && (!parameterData[paramId] || new Date(m.datetime.utc) > new Date(parameterData[paramId].datetime.utc))) {
            parameterData[paramId] = m;
            if (m.location?.name) {
                locationName = m.location.name;
            }
        }
    });

    console.log('Parameter data:', parameterData);

    // Extract values for each pollutant
    const pm25 = parameterData['pm25']?.value || parameterData['2']?.value;
    const pm10 = parameterData['pm10']?.value || parameterData['1']?.value;
    const o3 = parameterData['o3']?.value || parameterData['7']?.value;
    const no2 = parameterData['no2']?.value || parameterData['3']?.value;

    const aqi = pm25 ? calculateAQI(pm25) : 0;

    document.getElementById('aqi-value').textContent = aqi > 0 ? Math.round(aqi) : '--';
    document.getElementById('pm25').textContent = pm25 ? `${Math.round(pm25)} µg/m³` : 'N/A';
    document.getElementById('pm10').textContent = pm10 ? `${Math.round(pm10)} µg/m³` : 'N/A';
    document.getElementById('o3').textContent = o3 ? `${Math.round(o3)} µg/m³` : 'N/A';
    document.getElementById('no2').textContent = no2 ? `${Math.round(no2)} µg/m³` : 'N/A';

    if (aqi > 0) {
        updateAQIBadge(aqi);
    } else {
        const badge = document.getElementById('aqi-badge');
        badge.textContent = 'Data Available';
        badge.className = 'aqi-badge aqi-good';
    }

    hideLoading('air');
    showStationInfo(locationName);
}

function displayWeatherData(data) {
    const current = data.current;
    document.getElementById('temperature').textContent = Math.round(current.temperature_2m);
    document.getElementById('feels-like').textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('wind-speed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('conditions').textContent = getWeatherDescription(current.weather_code);
    hideLoading('weather');
}

function calculateAQI(pm25) {
    if (pm25 <= 12) return pm25 * 4.17;
    if (pm25 <= 35.4) return 51 + (pm25 - 12.1) * 2.1;
    if (pm25 <= 55.4) return 101 + (pm25 - 35.5) * 2.5;
    return 151 + (pm25 - 55.5) * 2;
}

function showStationInfo(stationName) {
    const airCard = document.querySelector('.air-quality-card .card-content');
    const existing = document.getElementById('nearby-stations');
    if (existing) existing.remove();
    const infoDiv = document.createElement('div');
    infoDiv.id = 'nearby-stations';
    infoDiv.className = 'nearby-stations mt-3';
    infoDiv.innerHTML = `<p class="small text-muted mb-0"><strong>📍 Data from:</strong> ${stationName}</p>`;
    airCard.appendChild(infoDiv);
}

function displayMockAirQuality() {
    document.getElementById('aqi-value').textContent = '--';
    document.getElementById('pm25').textContent = 'N/A';
    document.getElementById('pm10').textContent = 'N/A';
    document.getElementById('o3').textContent = 'N/A';
    document.getElementById('no2').textContent = 'N/A';
    const badge = document.getElementById('aqi-badge');
    badge.textContent = 'Not Found';
    badge.className = 'aqi-badge aqi-not-found';
    hideLoading('air');
}

function showNoStationsMessage() {
    const airCard = document.querySelector('.air-quality-card .card-content');
    const existing = document.getElementById('nearby-stations');
    if (existing) existing.remove();
    const messageDiv = document.createElement('div');
    messageDiv.id = 'nearby-stations';
    messageDiv.className = 'nearby-stations mt-3';
    messageDiv.innerHTML = `<p class="small text-warning">⚠️ No AQI stations within 25km</p>`;
    airCard.appendChild(messageDiv);
}

function showNoApiKeyMessage() {
    const airCard = document.querySelector('.air-quality-card .card-content');
    const existing = document.getElementById('nearby-stations');
    if (existing) existing.remove();
    const messageDiv = document.createElement('div');
    messageDiv.id = 'nearby-stations';
    messageDiv.className = 'nearby-stations mt-3';
    messageDiv.innerHTML = `<p class="small text-warning">⚠️ API key not configured in config.js</p>`;
    airCard.appendChild(messageDiv);
}

function updateAQIBadge(aqi) {
    const badge = document.getElementById('aqi-badge');
    if (aqi <= 50) {
        badge.textContent = 'Good';
        badge.className = 'aqi-badge aqi-good';
    } else if (aqi <= 100) {
        badge.textContent = 'Moderate';
        badge.className = 'aqi-badge aqi-moderate';
    } else if (aqi <= 150) {
        badge.textContent = 'Unhealthy for Sensitive';
        badge.className = 'aqi-badge aqi-moderate';
    } else if (aqi <= 200) {
        badge.textContent = 'Unhealthy';
        badge.className = 'aqi-badge aqi-unhealthy';
    } else if (aqi <= 300) {
        badge.textContent = 'Very Unhealthy';
        badge.className = 'aqi-badge aqi-unhealthy';
    } else {
        badge.textContent = 'Hazardous';
        badge.className = 'aqi-badge aqi-unhealthy';
    }
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 61: 'Light rain',
        63: 'Moderate rain', 65: 'Heavy rain', 71: 'Light snow',
        80: 'Rain showers', 95: 'Thunderstorm'
    };
    return descriptions[code] || 'Unknown';
}

function hideLoading(type) {
    document.getElementById(`${type}-loading`).style.display = 'none';
    document.getElementById(`${type}-content`).style.display = 'block';
}

function showError(type) {
    document.getElementById(`${type}-loading`).style.display = 'none';
    document.getElementById(`${type}-error`).style.display = 'block';
}

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString();
}

init();
