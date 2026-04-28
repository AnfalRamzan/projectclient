const http = require('http');

setInterval(() => {
    http.get('http://localhost:3000/api/health', (res) => {
        console.log('✅ Keep-alive ping sent');
    }).on('error', (err) => {
        console.log('⚠️ Server down?', err.message);
    });
}, 30000); // Har 30 seconds mein ping

console.log('🔄 Keep-alive service started...');