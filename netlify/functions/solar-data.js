// ============================================================================
// FONCTION NETLIFY - DONNÉES SOLAIRES
// ============================================================================
// 
// Cette fonction serverless agit comme un proxy entre le frontend et les 
// webhooks n8n qui récupèrent les données solaires depuis diverses sources.
//
// Endpoints:
// - GET /.netlify/functions/solar-data?date=YYYY-MM-DD&type=TYPE
//
// Paramètres:
// - date (required): Date au format YYYY-MM-DD
// - type (optional): Type de données à récupérer
//   - 'hourly' (par défaut): Données horaires de production/consommation
//   - 'astro': Données astronomiques (lever/coucher du soleil)
//   - 'history': Historique quotidien depuis Google Sheets
//
// Réponse:
// {
//   success: boolean,
//   type: string,
//   data: Array<Object>,
//   rowCount: number,
//   date: string
// }
// ============================================================================

// ============================================================================
// CONSTANTES DE CONFIGURATION
// ============================================================================

/** Timeout pour les requêtes vers n8n (en millisecondes) */
const REQUEST_TIMEOUT = 30000; // 30 secondes

/** 
 * Mapping des types de données vers leurs webhooks n8n respectifs
 * @type {Object.<string, string>}
 */
const WEBHOOK_URLS = {
    hourly: 'https://n8n.gehringer.fr/webhook/solar-data',
    astro: 'https://n8n.gehringer.fr/webhook/astro-data',
    history: 'https://n8n.gehringer.fr/webhook/solar-history'
};

/** Types de données supportés */
const SUPPORTED_TYPES = Object.keys(WEBHOOK_URLS);

/** Type par défaut si non spécifié */
const DEFAULT_TYPE = 'hourly';

/** Format de date attendu (pour validation) */
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Valide le format d'une date (YYYY-MM-DD)
 * @param {string} date - La date à valider
 * @returns {boolean} true si la date est valide
 */
function isValidDateFormat(date) {
    if (!date || typeof date !== 'string') {
        return false;
    }

    // Vérifier le format
    if (!DATE_FORMAT_REGEX.test(date)) {
        return false;
    }

    // Vérifier que la date est valide (pas de 2024-13-45 par exemple)
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

/**
 * Valide que le type de données est supporté
 * @param {string} type - Le type à valider
 * @returns {boolean} true si le type est supporté
 */
function isValidType(type) {
    return SUPPORTED_TYPES.includes(type);
}

/**
 * Effectue un fetch avec timeout
 * @param {string} url - L'URL à appeler
 * @param {number} timeout - Le timeout en millisecondes
 * @returns {Promise<Response>} La réponse du fetch
 */
async function fetchWithTimeout(url, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('La requête a expiré après ' + (timeout / 1000) + ' secondes');
        }
        throw error;
    }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

/**
 * Handler Netlify Function pour récupérer les données solaires
 * @param {Object} event - L'événement Netlify
 * @returns {Object} Réponse HTTP
 */
exports.handler = async (event) => {
    // En-têtes CORS pour permettre les appels depuis le frontend
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Gérer les requêtes preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Vérifier que c'est une requête GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'Méthode non autorisée. Utilisez GET.'
            })
        };
    }

    try {
        // Extraire et valider les paramètres
        const { date, type = DEFAULT_TYPE } = event.queryStringParameters || {};

        // Validation du paramètre date
        if (!date) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Le paramètre date est requis (format: YYYY-MM-DD)'
                })
            };
        }

        if (!isValidDateFormat(date)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Format de date invalide. Utilisez le format YYYY-MM-DD'
                })
            };
        }

        // Validation du paramètre type
        if (!isValidType(type)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: `Type invalide. Types supportés: ${SUPPORTED_TYPES.join(', ')}`
                })
            };
        }

        // Sélectionner l'URL du webhook en fonction du type
        const webhookUrl = WEBHOOK_URLS[type];
        const n8nUrl = `${webhookUrl}?date=${encodeURIComponent(date)}`;

        console.log('Type de données demandé:', type);
        console.log('Appel du webhook n8n:', n8nUrl);

        // Appeler le webhook n8n avec timeout
        const response = await fetchWithTimeout(n8nUrl);

        // Gérer les erreurs HTTP
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur n8n:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });

            throw new Error(
                `Le webhook n8n a retourné une erreur ${response.status}: ${errorText}`
            );
        }

        // Lire la réponse en texte brut d'abord
        const responseText = await response.text();

        // Vérifier que la réponse n'est pas vide
        if (!responseText || responseText.trim() === '') {
            console.error('Réponse vide du webhook n8n');
            throw new Error('Le webhook n8n a retourné une réponse vide');
        }

        // Parser le JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Erreur de parsing JSON:', {
                error: parseError.message,
                response: responseText.substring(0, 200) // Premiers 200 caractères
            });
            throw new Error('La réponse du webhook n8n n\'est pas du JSON valide');
        }

        // Valider que nous avons bien reçu des données
        if (!data) {
            throw new Error('Aucune donnée reçue du webhook n8n');
        }

        // Normaliser la réponse pour le frontend
        // Le webhook n8n peut retourner soit un tableau, soit un objet unique
        const dataArray = Array.isArray(data) ? data : [data];

        const formattedResponse = {
            success: true,
            type: type,
            data: dataArray,
            rowCount: dataArray.length,
            date: date
        };

        console.log('Succès - Données récupérées:', {
            type: type,
            date: date,
            rowCount: dataArray.length
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(formattedResponse)
        };

    } catch (error) {
        // Logger l'erreur complète côté serveur
        console.error('Erreur dans solar-data handler:', {
            message: error.message,
            stack: error.stack,
            event: {
                httpMethod: event.httpMethod,
                queryStringParameters: event.queryStringParameters
            }
        });

        // Retourner une erreur HTTP 500 au client
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};