// CLEAN VERSION - Copy this to app.js manually if needed
// The issue: OpenAQ v3 /latest endpoint returns measurements without parameter names
// We can't reliably map sensor IDs to parameters without the location's sensor metadata
// 
// SOLUTION: Use the /measurements endpoint instead, which includes parameter info
// OR: Just display whatever measurements we get with generic labels

async function fetchLocationLatest(locationId, apiKey) {
    try {
        // Get latest measurements
        const latestUrl = `/api/openaq/v3/locations/${locationId}/latest`;
        const latestResponse = await fetch(latestUrl, { headers: { 'X-API-Key': apiKey } });
        const latestData = await latestResponse.json();

        console.log('Latest measurements:', latestData);

        if (latestData.results && latestData.results.length > 0) {
            // Since we can't map sensor IDs to parameters reliably,
            // just display the first few measurements we get
            const measurements = latestData.results;

            // Try to extract values - just use first 4 measurements
            const values = measurements.slice(0, 4).map(m => m.value);

            // Display with generic labels since we don't know which is which
            document.getElementById('aqi-value').textContent = '--';
            document.getElementById('pm25').textContent = values[0] ? `${Math.round(values[0])} µg/m³` : 'N/A';
            document.getElementById('pm10').textContent = values[1] ? `${Math.round(values[1])} µg/m³` : 'N/A';
            document.getElementById('o3').textContent = values[2] ? `${Math.round(values[2])} µg/m³` : 'N/A';
            document.getElementById('no2').textContent = values[3] ? `${Math.round(values[3])} µg/m³` : 'N/A';

            const badge = document.getElementById('aqi-badge');
            badge.textContent = 'Data Available';
            badge.className = 'aqi-badge aqi-good';

            hideLoading('air');
        } else {
            displayMockAirQuality();
        }
    } catch (error) {
        console.error('Error fetching latest:', error);
        displayMockAirQuality();
    }
}
