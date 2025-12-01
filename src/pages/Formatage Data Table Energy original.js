/**
 * Format data for energy_hourly Data Table
 * - Real production/consumption from APsystems
 * - Day forecast (total expected for the day)
 * - Hour forecast (cumulative expected up to current hour)
 */
const items = $input.all();

// Trouver chaque type de données
const apsData = items.find(item => item.json.ecuPV)?.json;
const forecastHourData = items.find(item => item.json.hourlyForecasts)?.json;
const forecastDayData = items.find(item => item.json.forecasts)?.json;

if (!apsData || !forecastHourData || !forecastDayData) {
  throw new Error('Données manquantes pour la table energy');
}

// Trouver la prévision du jour actuel
const currentDate = apsData.date;
const todayForecast = forecastDayData.forecasts.find(f => f.date === currentDate);

// Récupérer l'heure actuelle en timezone Paris
const now = new Date();
const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const currentHour = parisTime.getHours();

// Find forecast matching current hour (not end of day!)
const hourlyForecasts = forecastHourData.hourlyForecasts.filter(f => f.date === currentDate);

let currentHourForecast = null;

// Search for forecast at or before current hour
for (let i = hourlyForecasts.length - 1; i >= 0; i--) {
  const forecastTime = hourlyForecasts[i].time;
  const forecastHour = parseInt(forecastTime.split(':')[0]);
  
  if (forecastHour <= currentHour) {
    currentHourForecast = hourlyForecasts[i];
    break;
  }
}

// Si pas trouvé, prendre la première prévision du jour
if (!currentHourForecast && hourlyForecasts.length > 0) {
  currentHourForecast = hourlyForecasts[0];
}

// Convertir en timezone Europe/Paris
const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T');

const energyRow = {
  timestamp: timestamp,
  date: currentDate,
  hour: currentHour,
  
  // Real data from APsystems (cumulative for the day)
  produced_kwh: apsData.today.produced,
  consumed_kwh: apsData.today.consumed,
  imported_kwh: apsData.today.imported,
  exported_kwh: apsData.today.exported,
  autoconsumed_kwh: apsData.today.autoconsumed,
  autosufficiency_pct: apsData.today.autosufficiency,
  autoconsumption_pct: apsData.today.autoconsumption,
  
  // Forecasts
  forecast_day_kwh: todayForecast ? todayForecast.forecast_kwh : 0,
  forecast_hour_cumul_kwh: currentHourForecast ? currentHourForecast.forecast_kwh : 0
};

return [{ json: energyRow }];