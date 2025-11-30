let currentLat = null;
let currentLon = null;
let currentLocationName = '';
let selectedWeekStart = null;
let selectedCountry = '';

// ============================================
// FLOOD DETECTION CONSTANTS
// ============================================
const FLOOD_HISTORY_DAYS = 90;
const FLOOD_THRESHOLD_PERCENTILE = 0.95;
const FLOOD_TRIGGER_MULTIPLIER = 1.2;

// ============================================
// GDACS FLOOD API INTEGRATION
// ============================================
async function fetchGDACSFlood(lat, lon, locationName) {
    if (!lat || !lon) return null;

    console.log(`🌍 Checking GDACS for floods near ${lat}, ${lon} (${locationName})...`);

    try {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - 30);

        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromdate=${formatDate(pastDate)}&todate=${formatDate(today)}&alertlevel=red;orange;green`;

        console.log('🔍 GDACS Query URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
            console.warn('GDACS API error:', response.status);
            return null;
        }

        const data = await response.json();

        console.log('📊 GDACS Response:', data);

        const userCountry = locationName.split(',').pop().trim().toLowerCase();
        console.log('🌏 User country:', userCountry);

        if (data.features && data.features.length > 0) {
            for (const event of data.features) {
                const eventLat = event.geometry.coordinates[1];
                const eventLon = event.geometry.coordinates[0];
                const eventName = event.properties.name || '';
                const eventCountry = event.properties.country || '';

                const eventCountryLower = eventCountry.toLowerCase();
                const eventNameLower = eventName.toLowerCase();

                const isCountryMatch = eventCountryLower.includes(userCountry) ||
                    eventNameLower.includes(userCountry) ||
                    userCountry.includes(eventCountryLower);

                if (!isCountryMatch) {
                    console.log(`⏭️ Skipping ${eventName} - different country (${eventCountry})`);
                    continue;
                }

                const distance = Math.sqrt(
                    Math.pow((lat - eventLat) * 111, 2) +
                    Math.pow((lon - eventLon) * 111 * Math.cos(lat * Math.PI / 180), 2)
                );

                console.log(`📍 Distance to ${eventName}: ${distance.toFixed(0)} km (Country: ${eventCountry})`);

                if (distance < 300) {
                    console.log('🚨 GDACS Flood Alert Found:', eventName);

                    const eventId = event.properties.eventid || event.id;
                    const reportUrl = `https://www.gdacs.org/report.aspx?eventid=${eventId}`;

                    return {
                        confirmed: true,
                        title: eventName,
                        alertLevel: event.properties.alertlevel || 'unknown',
                        severity: event.properties.severity || {},
                        date: event.properties.fromdate,
                        url: reportUrl,
                        distance: Math.round(distance),
                        country: eventCountry
                    };
                }
            }

            console.log('✅ No GDACS flood alerts near this location');
        }

        return null;

    } catch (error) {
        console.error('GDACS fetch error:', error);
        return null;
    }
}

// ============================================
// COUNTRY-CITY DATABASE
// ============================================
const COUNTRIES = {
    'Singapore': ['Singapore'],
    'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Newcastle', 'Sheffield', 'Bristol', 'Edinburgh'],
    'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Hiroshima', 'Sendai'],
    'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Xian', 'Chongqing', 'Tianjin'],
    'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Dusseldorf', 'Dortmund', 'Essen', 'Leipzig'],
    'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
    'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Victoria'],
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Hobart'],
    'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'],
    'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang'],
    'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Venice', 'Verona'],
    'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante'],
    'Brazil': ['Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'],
    'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Leon', 'Juarez', 'Zapopan', 'Merida', 'Cancun'],
    'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen'],
    'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St Gallen', 'Lugano', 'Biel'],
    'Sweden': ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala', 'Vasteras', 'Orebro', 'Linkoping', 'Helsingborg', 'Jonkoping', 'Norrkoping'],
    'Norway': ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes', 'Tromso', 'Sarpsborg'],
    'Denmark': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde'],
    'Malaysia': ['Kuala Lumpur', 'George Town', 'Ipoh', 'Johor Bahru', 'Malacca City', 'Kota Kinabalu', 'Kuching', 'Petaling Jaya', 'Shah Alam', 'Seremban'],
    'Thailand': ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Hat Yai', 'Nakhon Ratchasima', 'Udon Thani', 'Surat Thani', 'Khon Kaen', 'Nakhon Si Thammarat'],
    'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Palembang', 'Makassar', 'Tangerang', 'Depok', 'Bekasi'],
    'Philippines': ['Manila', 'Quezon City', 'Davao City', 'Cebu City', 'Zamboanga City', 'Taguig', 'Antipolo', 'Pasig', 'Cagayan de Oro', 'Paranaque'],
    'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Haiphong', 'Can Tho', 'Bien Hoa', 'Hue', 'Nha Trang', 'Buon Ma Thuot', 'Phan Thiet']
};

const countryInput = document.getElementById('country-input');
const cityInput = document.getElementById('city-input');
const countryList = document.getElementById('country-list');
const cityList = document.getElementById('city-list');
const weekSelect = document.getElementById('week-select');

async function init() {
    console.log('Initializing Weather App...');
    populateCountryList();
    setupWeekSelector();
    setupEventListeners();
    initializeTooltips();
    updateLastUpdate();

    const defaultCity = loadDefaultCity();
    if (defaultCity) {
        console.log('Loading default city:', defaultCity);
        countryInput.value = defaultCity.country;
        await onCountryChange();
        cityInput.value = defaultCity.city;
        await onCityChange();
    } else {
        console.log('No default city found, showing welcome prompt');
        showWelcomePrompt();
    }
}

function populateCountryList() {
    countryList.innerHTML = '';
    const countries = Object.keys(COUNTRIES).sort();
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        countryList.appendChild(option);
    });
    console.log(`Populated ${countries.length} countries`);
}

function populateCityList(country) {
    cityList.innerHTML = '';
    const cities = COUNTRIES[country] || [];
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        cityList.appendChild(option);
    });
    console.log(`Populated ${cities.length} cities for ${country}`);
}

async function onCountryChange() {
    const country = countryInput.value.trim();
    console.log('Country changed to:', country);

    if (!country || !COUNTRIES[country]) {
        cityInput.disabled = true;
        cityInput.value = '';
        return;
    }

    selectedCountry = country;
    populateCityList(country);
    cityInput.disabled = false;
    cityInput.value = '';
    hideDataCards();
    showWelcomePrompt();
}

async function onCityChange() {
    const city = cityInput.value.trim();
    console.log('City changed to:', city);

    if (!city || !selectedCountry) {
        return;
    }

    await geocodeLocation(city, selectedCountry);
}

async function geocodeLocation(city, country) {
    try {
        console.log(`Geocoding: ${city}, ${country}`);
        showLoading();

        const searchQuery = `${city}, ${country}`;
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const location = data.results[0];
            currentLat = location.latitude;
            currentLon = location.longitude;
            currentLocationName = `${location.name}, ${location.country}`;

            console.log('Location found:', {
                name: currentLocationName,
                lat: currentLat,
                lon: currentLon
            });

            document.getElementById('location').textContent = currentLocationName;
            document.getElementById('country-iso').textContent = location.country_code || '';

            hideWelcomePrompt();
            showDataCards();

            const [weather, aqi, forecast, floodData] = await Promise.all([
                fetchWeatherData(),
                fetchAirQualityData(),
                fetchForecastData(),
                fetchFloodData()
            ]);

            if (floodData) {
                displayFloodData(floodData, window.currentRainfall, window.currentElevation, window.currentSoilMoisture, window.currentSnowDepth);
            }

            updateLastUpdate();
            hideLoading();
            saveDefaultCity(country, city);
        } else {
            console.error('Location not found');
            alert('Location not found. Please try another city.');
            hideLoading();
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        alert('Error finding location. Please try again.');
        hideLoading();
    }
}

async function fetchWeatherData() {
    const weatherLoading = document.getElementById('weather-loading');
    const weatherContent = document.getElementById('weather-content');
    const weatherError = document.getElementById('weather-error');

    weatherLoading.style.display = 'block';
    weatherContent.style.display = 'none';
    weatherError.style.display = 'none';

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.current) {
            const current = data.current;
            document.getElementById('temperature').textContent = Math.round(current.temperature_2m);
            document.getElementById('feels-like').textContent = Math.round(current.apparent_temperature) + '°';
            document.getElementById('humidity').textContent = current.relative_humidity_2m + '%';
            document.getElementById('wind-speed').textContent = current.wind_speed_10m + ' km/h';
            document.getElementById('conditions').textContent = getWeatherDescription(current.weather_code);
            document.getElementById('weather-icon').innerHTML = getWeatherIcon(current.weather_code);

            weatherLoading.style.display = 'none';
            weatherContent.style.display = 'block';
        } else {
            throw new Error('No weather data');
        }
    } catch (error) {
        console.error('Weather fetch error:', error);
        weatherLoading.style.display = 'none';
        weatherError.style.display = 'block';
    }
}

async function fetchAirQualityData() {
    const airLoading = document.getElementById('air-loading');
    const airContent = document.getElementById('air-content');
    const airError = document.getElementById('air-error');

    airLoading.style.display = 'block';
    airContent.style.display = 'none';
    airError.style.display = 'none';

    try {
        const token = window.APP_CONFIG?.WAQI_API_TOKEN;
        if (!token) {
            console.warn('WAQI API Token missing! Check config.js');
            throw new Error('Missing API Token');
        }
        const url = `https://api.waqi.info/feed/geo:${currentLat};${currentLon}/?token=${token}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'ok' && data.data) {
            const aqi = data.data.aqi;
            document.getElementById('aqi-value').textContent = aqi;
            updateAQIBadge(aqi);

            const iaqi = data.data.iaqi || {};
            document.getElementById('pm25').textContent = iaqi.pm25 ? `${iaqi.pm25.v} µg/m³` : '-- µg/m³';
            document.getElementById('pm10').textContent = iaqi.pm10 ? `${iaqi.pm10.v} µg/m³` : '-- µg/m³';
            document.getElementById('o3').textContent = iaqi.o3 ? `${iaqi.o3.v} µg/m³` : '-- µg/m³';
            document.getElementById('no2').textContent = iaqi.no2 ? `${iaqi.no2.v} µg/m³` : '-- µg/m³';

            if (data.data.city && data.data.city.name) {
                showStationInfo(data.data.city.name);
            }

            airLoading.style.display = 'none';
            airContent.style.display = 'block';
        } else {
            throw new Error('No AQI data');
        }
    } catch (error) {
        console.error('AQI fetch error:', error);
        airLoading.style.display = 'none';
        airError.style.display = 'block';
        setUnknownAQIBadge();
    }
}

async function fetchForecastData() {
    const forecastLoading = document.getElementById('forecast-loading');
    const forecastContent = document.getElementById('forecast-content');
    const forecastError = document.getElementById('forecast-error');

    forecastLoading.style.display = 'block';
    forecastContent.innerHTML = '';
    forecastError.style.display = 'none';

    try {
        const startDate = selectedWeekStart || new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const formatDate = (d) => d.toISOString().split('T')[0];

        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&daily=weather_code,temperature_2m_max,temperature_2m_min&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&timezone=auto`;

        const today = new Date();
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);

        const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${currentLat}&longitude=${currentLon}&start_date=${formatDate(threeDaysAgo)}&end_date=${formatDate(today)}&daily=precipitation_sum&hourly=soil_moisture_0_to_1cm,snow_depth&timezone=auto`;

        const [forecastResponse, archiveResponse] = await Promise.all([
            fetch(forecastUrl),
            fetch(archiveUrl)
        ]);

        const forecastData = await forecastResponse.json();
        const archiveData = await archiveResponse.json();

        if (forecastData.daily && forecastData.daily.time) {
            forecastContent.innerHTML = '';

            forecastData.daily.time.forEach((date, i) => {
                const card = document.createElement('div');
                card.className = 'col';
                card.innerHTML = `
                    <div class="forecast-day-card">
                        <div class="fw-bold mb-2">${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div class="fs-1 mb-2">${getWeatherIcon(forecastData.daily.weather_code[i])}</div>
                        <div class="fw-bold">${Math.round(forecastData.daily.temperature_2m_max[i])}° / ${Math.round(forecastData.daily.temperature_2m_min[i])}°</div>
                        <div class="small text-muted mt-1">${getWeatherDescription(forecastData.daily.weather_code[i])}</div>
                    </div>
                `;
                forecastContent.appendChild(card);
            });

            if (archiveData.daily && archiveData.daily.precipitation_sum) {
                const rainData = archiveData.daily.precipitation_sum;
                window.currentRainfall = rainData.reduce((sum, val) => sum + (val || 0), 0);
                console.log('72h Historical Rainfall:', window.currentRainfall, 'mm');
            } else {
                window.currentRainfall = 0;
                console.warn('No historical rainfall data available');
            }

            window.currentElevation = forecastData.elevation || archiveData.elevation || 0;

            if (archiveData.hourly && archiveData.hourly.time) {
                const hourlyLength = archiveData.hourly.time.length;
                const recentIndex = Math.max(0, hourlyLength - 1);

                window.currentSoilMoisture = archiveData.hourly.soil_moisture_0_to_1cm ? (archiveData.hourly.soil_moisture_0_to_1cm[recentIndex] || 0) : 0;
                window.currentSnowDepth = archiveData.hourly.snow_depth ? (archiveData.hourly.snow_depth[recentIndex] || 0) : 0;
            } else {
                window.currentSoilMoisture = 0;
                window.currentSnowDepth = 0;
            }

            forecastLoading.style.display = 'none';
        } else {
            throw new Error('No forecast data');
        }
    } catch (error) {
        console.error('Forecast fetch error:', error);
        forecastLoading.style.display = 'none';
        forecastError.style.display = 'block';
    }
}

async function fetchFloodData() {
    const floodLoading = document.getElementById('flood-loading');
    const floodContent = document.getElementById('flood-content');
    const floodError = document.getElementById('flood-error');
    const floodBadge = document.getElementById('flood-badge');

    if (!floodLoading || !floodContent || !floodError || !floodBadge) {
        console.error('Flood elements not found in DOM');
        return;
    }

    floodLoading.style.display = 'block';
    floodContent.style.display = 'none';
    floodError.style.display = 'none';

    try {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - FLOOD_HISTORY_DAYS);

        const formatDate = (d) => d.toISOString().split('T')[0];

        const forecastUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${currentLat}&longitude=${currentLon}&daily=river_discharge`;
        const historyUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${currentLat}&longitude=${currentLon}&daily=river_discharge&start_date=${formatDate(pastDate)}&end_date=${formatDate(today)}`;

        const [forecastResponse, historyResponse, gdacsData] = await Promise.all([
            fetch(forecastUrl),
            fetch(historyUrl),
            fetchGDACSFlood(currentLat, currentLon, currentLocationName)
        ]);

        if (!forecastResponse.ok) throw new Error('Flood forecast API error');

        const forecastData = await forecastResponse.json();
        const historyData = historyResponse.ok ? await historyResponse.json() : null;

        if (forecastData.daily && forecastData.daily.river_discharge) {
            return {
                forecast: forecastData,
                history: historyData,
                gdacs: gdacsData
            };
        } else {
            throw new Error('No flood data');
        }
    } catch (error) {
        console.error('Flood fetch error:', error);
        floodLoading.style.display = 'none';
        floodError.style.display = 'block';
        floodBadge.textContent = 'N/A';
        floodBadge.className = 'flood-badge flood-unknown';
    }
}

function calculateFloodThresholds(historyData) {
    if (!historyData || !historyData.daily || !historyData.daily.river_discharge) {
        return null;
    }

    const discharges = historyData.daily.river_discharge.filter(d => d !== null && d !== undefined);
    if (discharges.length === 0) return null;

    const sorted = [...discharges].sort((a, b) => a - b);

    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const p95Index = Math.floor(sorted.length * 0.95);
    const highWaterMark = sorted[p95Index];

    const max = sorted[sorted.length - 1];

    return {
        median,
        highWaterMark,
        max,
        sampleSize: discharges.length
    };
}

function displayFloodData(data, rainfall = 0, elevation = 0, soilMoisture = 0, snowDepth = 0) {
    console.log('🌊 displayFloodData called for location:', currentLocationName);

    const floodLoading = document.getElementById('flood-loading');
    const floodContent = document.getElementById('flood-content');
    const floodBadge = document.getElementById('flood-badge');
    const riverDischarge = document.getElementById('river-discharge');
    const dischargePeak = document.getElementById('discharge-peak');
    const rainfallValue = document.getElementById('rainfall-value');
    const elevationValue = document.getElementById('elevation-value');
    const soilValue = document.getElementById('soil-moisture');
    const snowValue = document.getElementById('snow-depth');
    const floodStatus = document.getElementById('flood-status');

    const forecast = data.forecast;
    const history = data.history;
    const gdacs = data.gdacs;

    const discharges = forecast.daily.river_discharge;
    const currentDischarge = discharges[0];
    const peakDischarge = Math.max(...discharges.slice(0, 7));

    const stats = calculateFloodThresholds(history);
    let isLikelyFlooded = false;
    let floodReason = '';
    let deviation = 0;

    if (floodStatus) {
        floodStatus.style.display = 'none';
        floodStatus.innerHTML = '';
        floodStatus.className = 'alert alert-danger mt-3';
    }

    if (gdacs && gdacs.confirmed) {
        isLikelyFlooded = true;
        console.log('⚠️ GDACS FLOOD ALERT:', gdacs.title);

        if (floodStatus) {
            const reportDate = new Date(gdacs.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const alertColor = gdacs.alertLevel === 'red' ? 'danger' : gdacs.alertLevel === 'orange' ? 'warning' : 'info';
            floodStatus.className = `alert alert-${alertColor} mt-3`;

            floodStatus.innerHTML = `
                <strong>🚨 OFFICIAL FLOOD ALERT (GDACS)</strong><br>
                <strong>Event:</strong> ${gdacs.title}<br>
                <strong>Alert Level:</strong> <span class="badge bg-${alertColor}">${gdacs.alertLevel.toUpperCase()}</span><br>
                <strong>Distance:</strong> ~${gdacs.distance} km from location<br>
                <small><strong>Date:</strong> ${reportDate} • <strong>Source:</strong> UN/EC GDACS</small><br>
                <small><a href="${gdacs.url}" target="_blank" class="alert-link">View Official Report →</a></small>
            `;
            floodStatus.style.display = 'block';
        }
    }
    else if (stats && currentDischarge > 0) {
        console.log('📊 Flood Statistics (90 days):', stats);
        console.log('💧 Current Discharge:', currentDischarge);

        if (currentDischarge > stats.highWaterMark * FLOOD_TRIGGER_MULTIPLIER) {
            isLikelyFlooded = true;
            deviation = Math.round((currentDischarge / stats.highWaterMark) * 100);
            floodReason = `River discharge is <strong>${deviation}%</strong> of the 90-day high water mark.`;
            console.log('🚨 DETECTED FLOOD ANOMALY:', floodReason);
        }
        else if (currentDischarge > stats.max) {
            isLikelyFlooded = true;
            floodReason = `River discharge is at record highs for the past 3 months.`;
            console.log('🚨 DETECTED RECORD DISCHARGE');
        }

        if (isLikelyFlooded && floodStatus) {
            floodStatus.innerHTML = `
                <strong>⚠️ POTENTIAL FLOODING DETECTED</strong><br>
                ${floodReason}<br>
                <small>Based on statistical analysis of past 90 days.</small>
            `;
            floodStatus.style.display = 'block';
        }
    }

    let riskLevel = 'Low';
    let riskClass = 'flood-low';

    if (isLikelyFlooded) {
        riskLevel = 'High';
        riskClass = 'flood-high';
    } else {
        let score = 0;

        if (stats) {
            if (currentDischarge > stats.highWaterMark) score += 2;
            else if (currentDischarge > stats.median * 1.5) score += 1;
        } else {
            if (peakDischarge > 200) score += 3;
            else if (peakDischarge > 50) score += 1;
        }

        if (rainfall > 150) score += 4;
        else if (rainfall > 50) score += 2;
        else if (rainfall > 20) score += 1;

        if (soilMoisture > 0.35) score += 1;
        if (snowDepth > 0.3) score += 1;

        if (score >= 4) {
            riskLevel = 'High';
            riskClass = 'flood-high';
        } else if (score >= 2) {
            riskLevel = 'Moderate';
            riskClass = 'flood-moderate';
        }
    }

    floodBadge.textContent = riskLevel;
    floodBadge.className = `flood-badge ${riskClass}`;

    riverDischarge.textContent = currentDischarge ? currentDischarge.toFixed(1) + ' m³/s' : '-- m³/s';
    dischargePeak.textContent = peakDischarge ? peakDischarge.toFixed(1) + ' m³/s' : '-- m³/s';

    if (rainfallValue) {
        rainfallValue.textContent = rainfall !== undefined ? rainfall.toFixed(1) + ' mm' : '-- mm';
    }

    if (elevationValue) elevationValue.textContent = elevation + ' m';
    if (soilValue) soilValue.textContent = soilMoisture.toFixed(2) + ' m³/m³';
    if (snowValue) snowValue.textContent = snowDepth.toFixed(2) + ' m';

    floodLoading.style.display = 'none';
    floodContent.style.display = 'block';
}

function setupWeekSelector() {
    const today = new Date();
    const year = today.getFullYear();
    const week = getWeekNumber(today);

    const currentWeekVal = `${year}-W${week.toString().padStart(2, '0')}`;
    weekSelect.value = currentWeekVal;
}

function onWeekChange() {
    const val = weekSelect.value;
    if (!val) return;

    const [year, week] = val.split('-W').map(Number);
    selectedWeekStart = getDateFromWeek(year, week);

    fetchForecastData();
}

function selectPrevWeek() {
    const current = new Date(weekSelect.value + '-1');
    current.setDate(current.getDate() - 7);
    const year = current.getFullYear();
    const week = getWeekNumber(current);
    weekSelect.value = `${year}-W${week.toString().padStart(2, '0')}`;
    onWeekChange();
}

function selectCurrentWeek() {
    const today = new Date();
    const year = today.getFullYear();
    const week = getWeekNumber(today);
    weekSelect.value = `${year}-W${week.toString().padStart(2, '0')}`;
    onWeekChange();
}

function selectNextWeek() {
    const current = new Date(weekSelect.value + '-1');
    current.setDate(current.getDate() + 7);
    const year = current.getFullYear();
    const week = getWeekNumber(current);
    weekSelect.value = `${year}-W${week.toString().padStart(2, '0')}`;
    onWeekChange();
}

function setupEventListeners() {
    countryInput.addEventListener('change', onCountryChange);
    cityInput.addEventListener('change', onCityChange);
    weekSelect.addEventListener('change', onWeekChange);

    countryInput.addEventListener('input', () => {
        const clearBtn = document.getElementById('clear-country');
        if (clearBtn) {
            clearBtn.style.display = countryInput.value ? 'flex' : 'none';
        }
    });

    cityInput.addEventListener('input', () => {
        const clearBtn = document.getElementById('clear-city');
        if (clearBtn) {
            clearBtn.style.display = cityInput.value ? 'flex' : 'none';
        }
    });
}

function clearCountry() {
    countryInput.value = '';
    cityInput.value = '';
    cityInput.disabled = true;
    document.getElementById('clear-country').style.display = 'none';
    document.getElementById('clear-city').style.display = 'none';
    hideDataCards();
    showWelcomePrompt();
}

function clearCity() {
    cityInput.value = '';
    document.getElementById('clear-city').style.display = 'none';
    hideDataCards();
    showWelcomePrompt();
}

function showLoading() {
    document.getElementById('weather-loading').style.display = 'block';
    document.getElementById('weather-content').style.display = 'none';
    document.getElementById('air-loading').style.display = 'block';
    document.getElementById('air-content').style.display = 'none';
    document.getElementById('forecast-loading').style.display = 'block';
    document.getElementById('forecast-content').innerHTML = '';
}

function hideLoading() {
    document.getElementById('weather-loading').style.display = 'none';
    document.getElementById('air-loading').style.display = 'none';
    document.getElementById('forecast-loading').style.display = 'none';
}

function showWelcomePrompt() {
    document.getElementById('welcome-prompt').style.display = 'block';
}

function hideWelcomePrompt() {
    document.getElementById('welcome-prompt').style.display = 'none';
}

function showDataCards() {
    document.getElementById('forecast-card').style.display = 'block';
    document.getElementById('flood-card').style.display = 'block';
    document.querySelectorAll('.data-card').forEach(card => {
        if (!card.classList.contains('welcome-prompt')) {
            card.style.display = 'block';
        }
    });
}

function hideDataCards() {
    document.getElementById('forecast-card').style.display = 'none';
    document.getElementById('flood-card').style.display = 'none';
    document.querySelectorAll('.data-card').forEach(card => {
        if (!card.classList.contains('welcome-prompt')) {
            card.style.display = 'none';
        }
    });
}

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString();
}

function getWeatherIcon(code) {
    const icons = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
        45: '🌫️', 48: '🌫️', 51: '🌦️', 61: '🌧️',
        63: '🌧️', 65: '⛈️', 71: '🌨️',
        80: '🌦️', 95: '⛈️'
    };
    return icons[code] || '❓';
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

function updateAQIBadge(aqi) {
    const badge = document.getElementById('aqi-badge');
    let className = 'aqi-badge ';
    let text = '';

    if (aqi <= 50) {
        className += 'aqi-good';
        text = 'Good';
    } else if (aqi <= 100) {
        className += 'aqi-moderate';
        text = 'Moderate';
    } else if (aqi <= 150) {
        className += 'aqi-unhealthy-sensitive';
        text = 'Unhealthy for Sensitive Groups';
    } else if (aqi <= 200) {
        className += 'aqi-unhealthy';
        text = 'Unhealthy';
    } else if (aqi <= 300) {
        className += 'aqi-very-unhealthy';
        text = 'Very Unhealthy';
    } else {
        className += 'aqi-hazardous';
        text = 'Hazardous';
    }

    badge.className = className;
    badge.textContent = text;
}

function setUnknownAQIBadge() {
    const badge = document.getElementById('aqi-badge');
    badge.className = 'aqi-badge aqi-unknown';
    badge.textContent = 'Unknown';
}

function showStationInfo(name) {
    const container = document.getElementById('aqi-station');
    if (container) {
        container.textContent = `Station: ${name}`;
        container.style.display = 'block';
    }
}

function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function getDateFromWeek(year, week) {
    const d = new Date(year, 0, 1);
    const dayNum = d.getDay();
    let requiredDate = --week * 7;
    if (((dayNum != 0) || dayNum > 4)) {
        requiredDate += 7;
    }
    d.setDate(1 - d.getDay() + ++requiredDate);
    return d;
}

function loadDefaultCity() {
    const saved = localStorage.getItem('weatherApp_defaultCity');
    if (saved) {
        return JSON.parse(saved);
    }
    return null;
}

function saveDefaultCity(country, city) {
    localStorage.setItem('weatherApp_defaultCity', JSON.stringify({ country, city }));
}

document.addEventListener('DOMContentLoaded', init);
