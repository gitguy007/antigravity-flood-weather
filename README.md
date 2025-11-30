# JavaScript Weather & Air Quality App

A real-time weather and air quality dashboard built with vanilla JavaScript.

## Features

- 🌤️ Real-time weather data from OpenMeteo
- 💨 Air quality data from OpenAQ
- 🌍 40+ cities across 19 countries
- 📊 Displays AQI, PM2.5, PM10, O₃, NO₂
- 🎨 Modern, responsive design

## Setup

### 1. Get an OpenAQ API Key

1. Visit [https://explore.openaq.org/register](https://explore.openaq.org/register)
2. Register for a free account
3. Get your API key from your account settings

### 2. Configure the API Key

1. Open `config.js`
2. Add your OpenAQ API key:

```javascript
const config = {
    OPENAQ_API_KEY: 'your-api-key-here'
};
```

### 3. Run the App

Open `index.html` in your browser or serve it through the launcher:

```bash
# From the launcher_web directory
npm start
```

Then click "JavaScript Weather" button.

## APIs Used

- **Weather Data**: [OpenMeteo](https://open-meteo.com/) - Free, no API key required
- **Air Quality Data**: [OpenAQ v3](https://docs.openaq.org/) - Free API key required

## Data Sources

- Weather: OpenMeteo
- Air Quality: OpenAQ (crowdsourced global air quality data)
