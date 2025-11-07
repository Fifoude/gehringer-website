// netlify/functions/apsystems.js
const crypto = require('crypto');
const https = require('https');

function generateUUID() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () => 
        (Math.random() * 16 | 0).toString(16)
    );
}

function calculateSignature(appSecret, method, path, timestamp, nonce, appId, algorithm = 'HmacSHA256') {
    const stringToSign = `${timestamp}/${nonce}/${appId}/${path}/${method}/${algorithm}`;
    
    const hmac = crypto.createHmac(
        algorithm === 'HmacSHA256' ? 'sha256' : 'sha1',
        appSecret
    );
    
    hmac.update(stringToSign);
    return hmac.digest('base64');
}

function makeApiRequest(url, headers) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: headers,
            rejectUnauthorized: false
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (e) {
                    reject(new Error('Réponse invalide: ' + data));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        req.end();
    });
}

exports.handler = async (event) => {
    // Configuration CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Gérer les requêtes OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const params = event.queryStringParameters || {};
        const { appId, appSecret, endpoint } = params;

        if (!appId || !appSecret || !endpoint) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Paramètres manquants (appId, appSecret, endpoint)' })
            };
        }

        // Extraire le path pour la signature (dernier segment de l'URL)
        const pathParts = endpoint.split('/');
        const path = pathParts[pathParts.length - 1];

        const timestamp = Date.now().toString();
        const nonce = generateUUID();
        const method = 'GET';
        const algorithm = 'HmacSHA256';

        const signature = calculateSignature(appSecret, method, path, timestamp, nonce, appId, algorithm);

        const apiHeaders = {
            'X-CA-AppId': appId,
            'X-CA-Timestamp': timestamp,
            'X-CA-Nonce': nonce,
            'X-CA-Signature-Method': algorithm,
            'X-CA-Signature': signature
        };

        const baseUrl = 'https://api.apsystemsema.com:9282';
        const fullUrl = baseUrl + endpoint;

        console.log('Requête vers:', fullUrl);

        const data = await makeApiRequest(fullUrl, apiHeaders);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Erreur:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};