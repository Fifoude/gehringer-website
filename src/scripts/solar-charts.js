import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

console.log('🚀 Solar Charts Script Loaded');

// Register annotation plugin
Chart.register(annotationPlugin);
console.log('✅ Chart plugin registered');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const tabsCache = {
    production: { hourly: null, astro: null, loaded: false },
    energy: { hourly: null, loaded: false },
    balance: { history: null, loaded: false },
    solar: { history: null, loaded: false }
};

// Separate chart instances for each tab
let prodChartInstance = null;
let energyChartInstance = null;
let balanceChartInstance = null;
let solarChartInstance = null;

// ============================================================================
// HELPERS
// ============================================================================

function timeToDecimal(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours + (minutes / 60) + (seconds / 3600);
}

function parsePercentage(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove % and replace comma with dot (e.g. "12,5%" -> 12.5)
    let clean = value.toString().replace('%', '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
}

function formatDateDDMM(dateStr) {
    if (!dateStr) return '';
    // Handle "YYYY-MM-DD" or "DD/MM/YYYY"
    // Assuming ISO format from n8n or standard date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Fallback
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function showLoading(show) {
    const loader = document.getElementById('globalLoading');
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorEl = document.getElementById('error');
    const successEl = document.getElementById('success');
    if (errorEl) {
        errorEl.textContent = '❌ ' + message;
        errorEl.classList.add('visible');
    }
    if (successEl) successEl.classList.remove('visible');
    setTimeout(() => errorEl?.classList.remove('visible'), 5000);
}

function showSuccess(message) {
    const successEl = document.getElementById('success');
    const errorEl = document.getElementById('error');
    if (successEl) {
        successEl.textContent = '✅ ' + message;
        successEl.classList.add('visible');
    }
    if (errorEl) errorEl.classList.remove('visible');
    setTimeout(() => successEl?.classList.remove('visible'), 5000);
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchData(type, date) {
    console.log(`📡 Fetching: type=${type}, date=${date}`);

    const response = await fetch(
        `/.netlify/functions/solar-data?type=${type}&date=${date}`
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
        throw new Error(error.error || `Erreur HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Data received for ${type}:`, result);

    if (!result.success || !result.data) {
        throw new Error('Données invalides reçues');
    }

    return result.data;
}

// ============================================================================
// CHART RENDERING
// ============================================================================

function renderProductionChart(hourlyData, astroData) {
    console.log('🎨 Rendering Production Chart', { hourlyData, astroData });

    const canvas = document.getElementById('productionChart');
    if (!canvas) {
        console.error('Canvas productionChart not found');
        return;
    }
    const ctx = canvas.getContext('2d');

    if (prodChartInstance) {
        prodChartInstance.destroy();
        prodChartInstance = null;
    }

    const sorted = [...hourlyData].sort((a, b) => a.hour - b.hour);
    const hours = sorted.map(d => d.hour);

    // Helper to decumulate (calculate hourly delta)
    const decumulate = (arr) => {
        return arr.map((val, i, a) => {
            if (i === 0) return val;
            const diff = val - a[i - 1];
            return diff > -0.1 ? diff : 0; // Ignore small negative drops (resets)
        });
    };

    const productionCumul = sorted.map(d => parseFloat(d.produced_kwh) || 0);
    const forecastCumul = sorted.map(d => parseFloat(d.forecast_hour_cumul_kwh) || 0);

    // Calculate hourly values
    const production = decumulate(productionCumul);
    const forecast = decumulate(forecastCumul);

    const astroRecord = astroData && astroData.length > 0 ? astroData[0] : null;
    const sunrise = astroRecord ? timeToDecimal(astroRecord.sunrise) : 6;
    const sunset = astroRecord ? timeToDecimal(astroRecord.sunset) : 18;
    const solarNoon = astroRecord ? timeToDecimal(astroRecord.solar_noon) : 12;

    prodChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Production (kWh)',
                    data: production,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    order: 1
                },
                {
                    label: 'Prévision (kWh)',
                    data: forecast,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#fbbf24',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 14, weight: 'bold' }, color: '#333', padding: 15, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kWh`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        solarNoon: {
                            type: 'line',
                            xMin: solarNoon,
                            xMax: solarNoon,
                            borderColor: '#f59e0b',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                display: true,
                                content: 'Midi Solaire',
                                position: 'start',
                                backgroundColor: '#f59e0b',
                                color: '#fff',
                                font: { size: 11, weight: 'bold' },
                                padding: 4
                            }
                        },
                        nightBefore: {
                            type: 'box',
                            xMin: 0,
                            xMax: sunrise,
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            borderWidth: 0,
                            label: {
                                display: true,
                                content: 'Nuit',
                                position: { x: 'center', y: 'start' },
                                color: '#666',
                                font: { size: 10 }
                            }
                        },
                        nightAfter: {
                            type: 'box',
                            xMin: sunset,
                            xMax: 24,
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            borderWidth: 0,
                            label: {
                                display: true,
                                content: 'Nuit',
                                position: { x: 'center', y: 'start' },
                                color: '#666',
                                font: { size: 10 }
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Production Horaire (kWh)', font: { size: 13, weight: 'bold' } },
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    type: 'linear',
                    min: 0,
                    max: 23,
                    title: { display: true, text: 'Heure de la journée', font: { size: 13, weight: 'bold' } },
                    ticks: { color: '#666', callback: function (value) { return `${value}h`; }, stepSize: 2 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });

    const lastUpdate = sorted[sorted.length - 1]?.timestamp;
    if (lastUpdate) {
        const date = new Date(lastUpdate);
        const timestampEl = document.getElementById('chartTimestamp');
        if (timestampEl) {
            timestampEl.textContent = `Dernière mise à jour: ${date.toLocaleString('fr-FR')}`;
        }
    }
}

function renderEnergyChart(hourlyData) {
    console.log('🎨 Rendering Energy Chart', hourlyData);

    const canvas = document.getElementById('energyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (energyChartInstance) {
        energyChartInstance.destroy();
        energyChartInstance = null;
    }

    const sorted = [...hourlyData].sort((a, b) => a.hour - b.hour);
    const hours = sorted.map(d => d.hour);

    const decumulate = (arr) => {
        return arr.map((val, i, a) => {
            if (i === 0) return val;
            const diff = val - a[i - 1];
            return diff > -0.1 ? diff : 0;
        });
    };

    const produced = decumulate(sorted.map(d => parseFloat(d.produced_kwh) || 0));
    const consumed = decumulate(sorted.map(d => parseFloat(d.consumed_kwh) || 0));
    const imported = decumulate(sorted.map(d => parseFloat(d.imported_kwh) || 0));
    const exported = decumulate(sorted.map(d => parseFloat(d.exported_kwh) || 0));

    energyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Production',
                    data: produced,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: 'Consommation',
                    data: consumed,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: 'Importation',
                    data: imported,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2,
                    borderDash: [3, 3]
                },
                {
                    label: 'Exportation',
                    data: exported,
                    borderColor: '#6b7280',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2,
                    borderDash: [3, 3]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 14, weight: 'bold' }, color: '#333', padding: 15, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kWh`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Énergie Horaire (kWh)', font: { size: 13, weight: 'bold' } },
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    type: 'linear',
                    min: 0,
                    max: 23,
                    title: { display: true, text: 'Heure de la journée', font: { size: 13, weight: 'bold' } },
                    ticks: { color: '#666', callback: function (value) { return `${value}h`; }, stepSize: 2 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

function renderBalanceChart(historyData) {
    console.log('🎨 Rendering Balance Chart', historyData);

    const canvas = document.getElementById('balanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (balanceChartInstance) {
        balanceChartInstance.destroy();
        balanceChartInstance = null;
    }

    // Take last 30 entries
    const recentData = historyData.slice(-30);

    const labels = recentData.map(d => formatDateDDMM(d.Date));
    const autoconsommation = recentData.map(d => parsePercentage(d['Autoconsommation (%)']));
    const autosuffisance = recentData.map(d => parsePercentage(d['Autosuffisance (%)']));

    balanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Autoconsommation (%)',
                    data: autoconsommation,
                    backgroundColor: '#eab308', // Yellow/Gold
                    borderRadius: 4,
                },
                {
                    label: 'Autosuffisance (%)',
                    data: autosuffisance,
                    backgroundColor: '#3b82f6', // Blue
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12, weight: 'bold' }, usePointStyle: true }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Pourcentage (%)' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderAccuracyChart(historyData) {
    console.log('🎨 Rendering Accuracy Chart', historyData);

    const canvas = document.getElementById('solarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (solarChartInstance) {
        solarChartInstance.destroy();
        solarChartInstance = null;
    }

    // Take last 30 entries
    const recentData = historyData.slice(-30);

    const labels = recentData.map(d => formatDateDDMM(d.Date));
    const deviation = recentData.map(d => parsePercentage(d['Écart (%)']));

    solarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Écart Prévision vs Réel (%)',
                    data: deviation,
                    backgroundColor: (context) => {
                        const value = context.raw;
                        return value >= 0 ? '#22c55e' : '#ef4444'; // Green if >= 0, Red if < 0
                    },
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Single dataset, legend not needed
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Écart: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        zeroLine: {
                            type: 'line',
                            yMin: 0,
                            yMax: 0,
                            borderColor: '#333',
                            borderWidth: 1,
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Écart (%)' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================================================
// TAB LOADING LOGIC
// ============================================================================

async function loadTab(tabName) {
    console.log(`🔄 Loading tab: ${tabName}`);

    if (tabsCache[tabName].loaded) {
        console.log(`💾 Using cached data for: ${tabName}`);
        renderTab(tabName);
        return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    try {
        showLoading(true);

        switch (tabName) {
            case 'production':
                const [hourly, astro] = await Promise.all([
                    fetchData('hourly', today),
                    fetchData('astro', today)
                ]);
                tabsCache.production.hourly = hourly;
                tabsCache.production.astro = astro;
                tabsCache.production.loaded = true;
                showSuccess(`Données chargées: ${hourly.length} enregistrements`);
                break;

            case 'energy':
                const energyData = await fetchData('hourly', today);
                tabsCache.energy.hourly = energyData;
                tabsCache.energy.loaded = true;
                showSuccess(`Données chargées: ${energyData.length} enregistrements`);
                break;

            case 'balance':
            case 'solar':
                // Check if history is already loaded in the other tab
                if (tabsCache.balance.history || tabsCache.solar.history) {
                    const history = tabsCache.balance.history || tabsCache.solar.history;
                    tabsCache.balance.history = history;
                    tabsCache.solar.history = history;
                    tabsCache.balance.loaded = true;
                    tabsCache.solar.loaded = true;
                } else {
                    // Use YESTERDAY for history data
                    const historyData = await fetchData('history', yesterday);
                    tabsCache.balance.history = historyData;
                    tabsCache.solar.history = historyData;
                    tabsCache.balance.loaded = true;
                    tabsCache.solar.loaded = true;
                    showSuccess(`Données chargées: ${historyData.length} enregistrements`);
                }
                break;
        }

        renderTab(tabName);
        const dataSection = document.getElementById('dataSection');
        if (dataSection) dataSection.classList.add('visible');

    } catch (error) {
        console.error(`❌ Error loading ${tabName}:`, error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function renderTab(tabName) {
    console.log(`🎨 Rendering: ${tabName}`, tabsCache[tabName]);

    switch (tabName) {
        case 'production':
            if (tabsCache.production.hourly && tabsCache.production.astro) {
                renderProductionChart(
                    tabsCache.production.hourly,
                    tabsCache.production.astro
                );
            }
            break;

        case 'energy':
            if (tabsCache.energy.hourly) {
                renderEnergyChart(tabsCache.energy.hourly);
            }
            break;

        case 'balance':
            if (tabsCache.balance.history) {
                renderBalanceChart(tabsCache.balance.history);
            }
            break;

        case 'solar':
            if (tabsCache.solar.history) {
                renderAccuracyChart(tabsCache.solar.history);
            }
            break;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Solar Dashboard with Charts...');

    // Setup tab click handlers
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            const tabName = tab.dataset.tab;

            // Update UI
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');

            // Load tab data
            await loadTab(tabName);
        });
    });

    // Auto-load production tab
    await loadTab('production');
});
