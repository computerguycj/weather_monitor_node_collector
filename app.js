const axios = require('axios');
const cheerio = require('cheerio');
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

// Database configuration for Neon.tech serverless
const sql = neon(process.env.DATABASE_URL);

// Helper to get yesterday's date in YYYY-MM-DD format
function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const YESTERDAY = getYesterdayDate();

const STATION_1_URL = `https://www.wunderground.com/dashboard/pws/KWABLAIN153/table/${YESTERDAY}/${YESTERDAY}/daily`;
const STATION_2_URL = `https://www.wunderground.com/dashboard/pws/KWABLAIN126/table/${YESTERDAY}/${YESTERDAY}/daily`;

// Initialize database and create tables
async function initializeDatabase() {
  try {
    // Create weather_stations table
    await sql`
      CREATE TABLE IF NOT EXISTS weather_stations (
        id SERIAL PRIMARY KEY,
        station_id VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        temperature DECIMAL(5,2),
        humidity INTEGER,
        wind_speed DECIMAL(5,2),
        wind_direction VARCHAR(10),
        pressure DECIMAL(6,2),
        precipitation DECIMAL(5,2),
        conditions VARCHAR(100)
      )
    `;

    // Create forecasts table
    await sql`
      CREATE TABLE IF NOT EXISTS forecasts (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        forecast_date TIMESTAMP,
        temp INTEGER,
        precip INTEGER,
        humidity INTEGER
      )
    `;

    // Create weather_comparisons table
    await sql`
      CREATE TABLE IF NOT EXISTS weather_comparisons (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        station_1_temp DECIMAL(5,2),
        station_2_temp DECIMAL(5,2),
        temp_difference DECIMAL(5,2),
        station_1_humidity INTEGER,
        station_2_humidity INTEGER,
        humidity_difference INTEGER,
        station_1_wind DECIMAL(5,2),
        station_2_wind DECIMAL(5,2),
        wind_difference DECIMAL(5,2)
      )
    `;

    console.log('Database tables created or ensured.');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Scrape weather data from a Weather Underground station (all rows)
async function scrapeWeatherStation(url, stationId) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Scrape the date from the <h3> element
    const dateText = $('.date-text strong').first().text().trim();
    // Convert to YYYY-MM-DD format
    const scrapedDate = new Date(dateText + ', 00:00').toISOString().slice(0, 10);

    // Check if data for this station and date already exists
    const existing = await sql`
      SELECT 1 FROM weather_stations
      WHERE station_id = ${stationId} AND timestamp::date = ${scrapedDate}
      LIMIT 1
    `;
    if (existing.length > 0) {
      fs.appendFileSync('scrape_debug.txt', `Data for ${stationId} on ${scrapedDate} already exists, skipping\n`);
      return [];
    }

    // Find the table rows
    const rows = $('.history-table.desktop-table tbody tr');
    const weatherRows = [];

    rows.each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 4) return; // skip if not enough columns

      const time = $(cells[0]).text().trim();
      const temperature = parseFloat($(cells[1]).text().replace('°F', '').trim()) || null;
      const humidity = parseInt($(cells[3]).text().replace('%', '').trim()) || null;

      // Combine date and time for timestamp
      const timestamp = `${scrapedDate} ${time}`;

      if (temperature !== null && humidity !== null) {
        weatherRows.push({
          stationId,
          timestamp,
          temperature,
          humidity
        });
      }
    });

    fs.appendFileSync('scrape_debug.txt', `Scraped ${weatherRows.length} rows for ${stationId} on ${scrapedDate}\n`);
    return weatherRows;

  } catch (error) {
    fs.appendFileSync('scrape_debug.txt', `Error scraping station ${stationId}: ${error.message}\n\n`);
    return [];
  }
}

// Helper to get an array of YYYY-MM-DD strings for the next N days after a given date
function getNextNDates(startDate, n) {
  const dates = [];
  const d = new Date(startDate);
  for (let i = 1; i <= n; i++) {
    d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Helper to get midnight timestamp for today
function getMidnightTimestamp() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

// Helper to parse time cell text into HH:mm format
function parseForecastTimeCell(cellText) {
  // Example input: "12 :00 am"
  const match = cellText.match(/(\d{1,2})\s*:?\s*(\d{2})?\s*(am|pm)/i);
  if (!match) return "00:00";
  let hour = parseInt(match[1]);
  let minute = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3].toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// Scrape forecast for a single date
async function scrapeForecastForDate(forecastDate) {
  const url = `https://www.wunderground.com/hourly/us/wa/blaine/48.99,-122.75/date/${forecastDate}`;
  console.log(`Scraping forecast for ${forecastDate} from ${url}`);
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for the table to appear (increase timeout if needed)
  try {
    await page.waitForSelector('#hourly-forecast-table tbody tr', { timeout: 20000 });
  } catch (err) {
    console.error(`Could not find forecast table for ${forecastDate}:`, err);
    await browser.close();
    return [];
  }

  // Get the table HTML
  const tableHTML = await page.$eval('#hourly-forecast-table', el => el.outerHTML);

  await browser.close();

  // Now use cheerio as before
  const $ = cheerio.load(tableHTML);
  const rows = $('tbody tr');
  const forecastRows = [];
  const timestamp = getMidnightTimestamp();

  rows.each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const timeCellText = $(cells[0]).text().replace(/\s+/g, ' ').trim();
    const timeStr = parseForecastTimeCell(timeCellText);

    // Format forecastDate as yyyy-mm-ddTHH:mm:00
    const forecastDateTime = `${forecastDate}T${timeStr}:00`;

    const temp = parseFloat($(cells[2]).text().replace('°', '').trim());
    const precip = parseFloat($(cells[4]).text().replace('%', '').trim());
    const humidity = parseInt($(cells[8]).text().replace('%', '').trim());

    if (!isNaN(temp) && !isNaN(humidity)) {
      forecastRows.push({
        timestamp,
        forecast_date: forecastDateTime,
        temp: temp,
        precip: precip,
        humidity: humidity
      });
    }
  });

  console.log(`Scraped ${forecastRows.length} forecast rows for ${forecastDate}`);
  return forecastRows;
}

// Save weather station data to database (array version)
async function saveWeatherData(weatherRows) {
  if (!weatherRows || weatherRows.length === 0) return;

  try {
    for (const row of weatherRows) {
      await sql`
        INSERT INTO weather_stations (station_id, timestamp, temperature, humidity)
        VALUES (${row.stationId}, ${row.timestamp}, ${row.temperature}, ${row.humidity})
      `;
    }
    console.log(`Saved ${weatherRows.length} rows for station ${weatherRows[0].stationId}`);
  } catch (error) {
    console.error('Error saving weather data:', error);
  }
}

// Compare station rows for a specific date and save to database
async function compareStationRowsForDate(date) {
  try {
    // Get all rows for both stations for the given date
    const station1Rows = await sql`
      SELECT * FROM weather_stations
      WHERE station_id = 'KWABLAIN153' AND timestamp::date = ${date}
    `;
    const station2Rows = await sql`
      SELECT * FROM weather_stations
      WHERE station_id = 'KWABLAIN126' AND timestamp::date = ${date}
    `;

    // Build a map of station2 rows by timestamp for fast lookup
    const station2Map = new Map();
    for (const row of station2Rows) {
      station2Map.set(row.timestamp.toISOString(), row);
    }

    // For each station1 row, find matching station2 row by timestamp
    for (const row1 of station1Rows) {
      const ts = row1.timestamp.toISOString();
      const row2 = station2Map.get(ts);
      if (row2) {
        const tempDiff = row1.temperature - row2.temperature;
        const humidityDiff = row1.humidity - row2.humidity;

        await sql`
          INSERT INTO weather_comparisons (
            station_1_temp, station_2_temp, temp_difference,
            station_1_humidity, station_2_humidity, humidity_difference,
            timestamp
          )
          VALUES (
            ${row1.temperature}, ${row2.temperature}, ${tempDiff},
            ${row1.humidity}, ${row2.humidity}, ${humidityDiff},
            ${row1.timestamp}
          )
        `;
      }
    }
    console.log(`Weather comparisons saved for ${date}`);
  } catch (error) {
    console.error('Error comparing station rows:', error);
  }
}

// Main function to collect weather station data (array version)
async function collectWeatherData() {
  console.log('Collecting weather station data...');
  
  try {
    // Scrape both weather stations
    const [station1Rows, station2Rows] = await Promise.all([
      scrapeWeatherStation(STATION_1_URL, 'KWABLAIN153'),
      scrapeWeatherStation(STATION_2_URL, 'KWABLAIN126')
    ]);

    // Save all rows for each station
    await Promise.all([
      saveWeatherData(station1Rows),
      saveWeatherData(station2Rows)
    ]);

    // Compare rows for the scraped date if both have data
    if (station1Rows.length > 0 && station2Rows.length > 0) {
      const date = station1Rows[0].timestamp.slice(0, 10);
      await compareStationRowsForDate(date);
    }

  } catch (error) {
    console.error('Error in collectWeatherData:', error);
  }
}

// Main function to collect forecast data
async function collectForecastData() {
  console.log('Collecting 10-day forecast data...');
  try {
    const midnightToday = getMidnightTimestamp();

    // Check if any forecast rows exist for today's midnight timestamp
    const existing = await sql`
      SELECT 1 FROM forecasts
      WHERE timestamp = ${midnightToday}
      LIMIT 1
    `;
    if (existing.length > 0) {
      console.log('Forecast data for today at midnight already exists, skipping collection.');
      return;
    }

    const next10Dates = getNextNDates(getYesterdayDate(), 10);
    let allForecastRows = [];

    for (const date of next10Dates) {
      const forecastRows = await scrapeForecastForDate(date);
      allForecastRows = allForecastRows.concat(forecastRows);
    }

    // Save all forecast rows to DB
    for (const forecast of allForecastRows) {
      await sql`
        INSERT INTO forecasts (timestamp, forecast_date, temp, precip, humidity)
        VALUES (${forecast.timestamp}, ${forecast.forecast_date}, ${forecast.temp}, ${forecast.precip}, ${forecast.humidity})
      `;
    }

    console.log('10-day hourly forecasts saved');
  } catch (error) {
    console.error('Error in collectForecastData:', error);
  }
}

// Initialize and start the application
async function startApp() {
  try {
    await initializeDatabase();

    await collectWeatherData();
    await collectForecastData();

    console.log('All data collection complete. Shutting down gracefully.');
    process.exit(0); // Graceful exit after all work is done

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

// Start the application
startApp();