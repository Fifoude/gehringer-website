/**
 * Format data for energy_hourly Data Table
 * - 24 lignes (0–23)
 * - forecast_* : issus de forecast.solar
 * - *_kwh réels : issus d'APsystems (data.produced/consumed/imported/exported)
 * - champs calculés :
 *    autoconsumed_kwh     = produced_kwh - exported_kwh (>= 0)
 *    autosufficiency_pct  = autoconsumed_kwh / consumed_kwh * 100
 *    autoconsumption_pct  = autoconsumed_kwh / produced_kwh * 100
 */

const main = $input.first().json; // ton gros objet combiné

// Données APsystems (arrays sur 24h)
const data = main.data || {};
const times = data.time || [];
const producedArr = data.produced || [];
const consumedArr = data.consumed || [];
const importedArr = data.imported || [];
const exportedArr = data.exported || [];

// Prévisions forecast.solar
const hourlyForecastsAll = main.hourlyForecasts || [];
const dayForecasts = main.forecasts || [];

// Récupérer l'heure actuelle en timezone Paris
const now = new Date();
const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const currentHour = parisTime.getHours();
const currentDate = parisTime.toISOString().split('T')[0];

// Prévision du jour (totale)
const todayForecast = dayForecasts.find(f => f.date === currentDate);
const forecastDayKwh = todayForecast ? todayForecast.forecast_kwh : 0;

// Prévisions horaires du jour
const hourlyForecasts = hourlyForecastsAll.filter(f => f.date === currentDate);

// Timestamp : on reprend celui de la donnée, ou fallback sur maintenant
const timestamp = main.timestamp ||
  new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T');

// Petite utilitaire pour lire proprement un tableau
function getNumericAt(arr, idx) {
  if (!arr || idx < 0 || idx >= arr.length) return null;
  const v = arr[idx];
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

const energyRows = [];

for (let hour = 0; hour < 24; hour++) {
  // Forecast cumulée pour cette heure
  const hourForecast = hourlyForecasts.find(f => {
    const h = parseInt(f.time.split(':')[0], 10);
    return h === hour;
  });
  const forecastHourCumulKwh = hourForecast ? hourForecast.forecast_kwh : 0;

  const row = {
    timestamp,
    date: currentDate,
    hour,
    forecast_day_kwh: forecastDayKwh,
    forecast_hour_cumul_kwh: forecastHourCumulKwh,
  };

  // Index dans les arrays APsystems (time = "00", "01", ..., "23")
  const hourStr = hour.toString().padStart(2, '0');
  const idx = times.indexOf(hourStr);

  // On ne met des données réelles que si on a un index valide et que l'heure est passée
  if (idx !== -1 && hour <= currentHour) {
    const produced_kwh = getNumericAt(producedArr, idx);
    const consumed_kwh = getNumericAt(consumedArr, idx);
    const imported_kwh = getNumericAt(importedArr, idx);
    const exported_kwh = getNumericAt(exportedArr, idx);

    row.produced_kwh = produced_kwh;
    row.consumed_kwh = consumed_kwh;
    row.imported_kwh = imported_kwh;
    row.exported_kwh = exported_kwh;

    // autoconsommation en kWh (production utilisée sur place)
    if (produced_kwh != null && exported_kwh != null) {
      let autoconsumed = produced_kwh - exported_kwh;
      if (autoconsumed < 0) autoconsumed = 0;
      row.autoconsumed_kwh = +autoconsumed.toFixed(6);
    } else {
      row.autoconsumed_kwh = null;
    }

    // % d'autonomie = part de la conso couverte par la production locale
    if (row.autoconsumed_kwh != null && consumed_kwh != null && consumed_kwh > 0) {
      row.autosufficiency_pct = +(
        (row.autoconsumed_kwh / consumed_kwh) * 100
      ).toFixed(1);
    } else {
      row.autosufficiency_pct = null;
    }

    // % d'autoconsommation = part de la production consommée sur place
    if (row.autoconsumed_kwh != null && produced_kwh != null && produced_kwh > 0) {
      row.autoconsumption_pct = +(
        (row.autoconsumed_kwh / produced_kwh) * 100
      ).toFixed(1);
    } else {
      row.autoconsumption_pct = null;
    }
  } else {
    // Futur ou pas de données → null
    row.produced_kwh = null;
    row.consumed_kwh = null;
    row.imported_kwh = null;
    row.exported_kwh = null;
    row.autoconsumed_kwh = null;
    row.autosufficiency_pct = null;
    row.autoconsumption_pct = null;
  }

  energyRows.push({ json: row });
}

return energyRows;
