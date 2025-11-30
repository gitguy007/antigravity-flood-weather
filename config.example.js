// Configuration file for API keys
// Copy this file to config.js and add your API keys

const config = {
    // Get your free OpenAQ API key from: https://explore.openaq.org/register
    OPENAQ_API_KEY: 'your-openaq-key-here',

    // Get your free WAQI API token from: https://aqicn.org/api/
    WAQI_API_TOKEN: 'your-waqi-token-here'
};

// For browser usage
if (typeof window !== 'undefined') {
    window.APP_CONFIG = config;
}
