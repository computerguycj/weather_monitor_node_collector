# Weather Monitoring App

A Node.js application that monitors and compares weather data from two Weather Underground stations in your local area, and collects forecast data. Data is stored in a PostgreSQL database hosted on Neon.tech.

## Features

- **Real-time Weather Monitoring**: Scrapes data from two weather stations every 30 minutes
- **Weather Comparison**: Compares temperature, humidity, and wind speed between stations
- **Forecast Collection**: Collects 5-day weather forecast data every hour
- **PostgreSQL Storage**: All data is stored in a Neon.tech PostgreSQL database
- **REST API**: Simple API endpoints to access collected data
- **Automated Scheduling**: Uses cron jobs for automated data collection

## Database Schema

Before you begin, ensure you have the following installed:

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** for cloning the repository
- A **Neon.tech** PostgreSQL database account (free tier available at [neon.tech](https://neon.tech))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd collector
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

### 4. Configure Database Credentials

Edit your `.env` file with your Neon.tech credentials:

```env
# Database Configuration
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Weather Underground API Keys (if using API instead of scraping)
# WEATHER_API_KEY=your-api-key
```

**Important:** Never commit your `.env` file to version control. It contains sensitive credentials.

### 5. Initialize Database

The application will automatically create the necessary tables on first run. Ensure your Neon.tech account is set up and the connection string is correct.

## Running the Application

### Development Mode
```bash
npm run dev
```
Runs with automatic restart on file changes (requires `nodemon`).

### Production Mode
```bash
npm start
```
Runs the application in production mode.

### Health Check
Once running, verify the app is operational:
```bash
curl http://localhost:3000/api/health
```

## Configuration

### Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Neon.tech database host | `project.neon.tech` | Yes |
| `DB_PORT` | PostgreSQL port | `5432` | Yes |
| `DB_NAME` | Database name | `weather_db` | Yes |
| `DB_USER` | Database username | `neondb_user` | Yes |
| `DB_PASSWORD` | Database password | (sensitive) | Yes |
| `PORT` | Application port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` or `production` | No |

### Data Collection Intervals

You can customize collection schedules by modifying the cron expressions in the application code:
- **Weather stations**: Default 30 minutes
- **Forecast data**: Default 1 hour (at top of hour)

## Database Schema

### weather_stations
Stores raw weather observations from both monitoring stations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key, auto-incremented |
| `station_id` | VARCHAR | Weather station identifier (e.g., KWABLAIN153) |
| `timestamp` | TIMESTAMP | UTC timestamp of data collection |
| `temperature` | NUMERIC | Temperature in Fahrenheit |
| `humidity` | INTEGER | Relative humidity percentage (0-100) |
| `wind_speed` | NUMERIC | Wind speed in mph |
| `wind_direction` | VARCHAR | Wind direction (e.g., NW, SE) |
| `pressure` | NUMERIC | Atmospheric pressure in inches |
| `precipitation` | NUMERIC | Precipitation in inches |
| `conditions` | VARCHAR | Weather condition description |

### forecasts
Stores collected forecast data for the Blaine, WA area.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key, auto-incremented |
| `timestamp` | TIMESTAMP | UTC timestamp of collection |
| `forecast_date` | DATE | Date the forecast applies to |
| `high_temp` | NUMERIC | Predicted high temperature (°F) |
| `low_temp` | NUMERIC | Predicted low temperature (°F) |
| `conditions` | VARCHAR | Predicted weather conditions |
| `precipitation_chance` | INTEGER | Precipitation probability (0-100) |
| `wind_speed` | NUMERIC | Expected wind speed (mph) |
| `humidity` | INTEGER | Expected humidity percentage (0-100) |

### weather_comparisons
Computed comparison metrics between the two weather stations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key, auto-incremented |
| `timestamp` | TIMESTAMP | Time of comparison calculation |
| `station_1_temp` | NUMERIC | Station 1 temperature (°F) |
| `station_2_temp` | NUMERIC | Station 2 temperature (°F) |
| `temp_difference` | NUMERIC | Temperature delta (Station 1 - Station 2) |
| `station_1_humidity` | INTEGER | Station 1 humidity (%) |
| `station_2_humidity` | INTEGER | Station 2 humidity (%) |
| `humidity_difference` | INTEGER | Humidity delta (Station 1 - Station 2) |
| `station_1_wind` | NUMERIC | Station 1 wind speed (mph) |
| `station_2_wind` | NUMERIC | Station 2 wind speed (mph) |
| `wind_difference` | NUMERIC | Wind speed delta (Station 1 - Station 2) |

## Data Collection Schedule

- **Weather Stations**: Every 30 minutes
- **Forecast Data**: Every hour (at the top of the hour)

## Data Collection Schedule

- **Weather Stations**: Every 30 minutes
- **Forecast Data**: Every hour (at the top of the hour)

## API Documentation

### GET /api/latest-comparison

Returns the most recent weather comparison between the two stations.

**Response Status:** `200 OK`

```json
{
  "id": 123,
  "timestamp": "2025-08-26T10:30:00.000Z",
  "station_1_temp": 72.5,
  "station_2_temp": 71.8,
  "temp_difference": 0.7,
  "station_1_humidity": 65,
  "station_2_humidity": 68,
  "humidity_difference": -3,
  "station_1_wind": 8.2,
  "station_2_wind": 7.5,
  "wind_difference": 0.7
}
```

### GET /api/recent-weather/:hours

Returns weather data from both stations for the specified number of hours.

**Parameters:**
- `hours` (path parameter, optional): Number of hours to retrieve (default: 24)

**Examples:**
- `/api/recent-weather/` - Last 24 hours
- `/api/recent-weather/48` - Last 48 hours
- `/api/recent-weather/7` - Last 7 hours

**Response Status:** `200 OK`

```json
[
  {
    "id": 456,
    "station_id": "KWABLAIN153",
    "timestamp": "2025-08-26T10:30:00.000Z",
    "temperature": 72.5,
    "humidity": 65,
    "wind_speed": 8.2,
    "wind_direction": "NW",
    "pressure": 30.12,
    "precipitation": 0.0,
    "conditions": "Partly Cloudy"
  }
]
```

### GET /api/health

Health check endpoint to verify the application is running and database connectivity.

**Response Status:** `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2025-08-26T10:30:00.000Z",
  "database": "connected"
}
```

## Weather Data Collection

### Data Sources

This application collects weather data through **web scraping** from Weather Underground's personal weather station network:

- **Primary Method**: CSS selectors scrape real-time data from PWS station pages
- **Frequency**: Every 30 minutes for weather stations, hourly for forecasts
- **Time Zone**: UTC for all timestamps in the database

### Important Considerations

⚠️ **Terms of Service**: Ensure your use complies with Weather Underground's terms of service and robots.txt file.

⚠️ **HTML Structure**: Weather Underground may update their website structure periodically. If data collection fails, CSS selectors may need adjustment.

⚠️ **Rate Limiting**: The application implements respectful scraping practices with appropriate delays between requests.

## Deployment

### Using PM2 (Recommended for Production)

PM2 is a process manager that keeps your application running, auto-starts on system reboot, and provides logging.

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Start the application**
   ```bash
   pm2 start app.js --name weather-collector
   ```

3. **Enable auto-startup**
   ```bash
   pm2 startup
   pm2 save
   ```

4. **Monitor logs**
   ```bash
   pm2 logs weather-collector
   ```

### Environment-Specific Configuration

**Development:**
```env
NODE_ENV=development
PORT=3000
```

**Production:**
```env
NODE_ENV=production
PORT=3000
# Set stricter timeouts and implement blue-green deployments as needed
```

### Database Backups

Neon.tech provides automated backups. To manually backup:

1. Connect to your Neon.tech database via psql or a database tool
2. Use `pg_dump` to create backups
3. Store backups securely and off-site

```bash
pg_dump postgresql://user:password@host:port/database > backup.sql
```

## Monitoring & Maintenance

### Daily Checks

- **Data Insertion**: Verify that new records are being added to all tables
- **Latest Comparison**: Check `/api/latest-comparison` has recent timestamps
- **Application Logs**: Review for any connection or scraping errors

### Weekly Tasks

- **Data Quality**: Review collected data for anomalies or gaps
- **Storage**: Check database size and optimize if needed
- **Website Changes**: Monitor if Weather Underground has made layout changes

### Monthly Tasks

- **Performance Review**: Analyze data collection success rates
- **Database Maintenance**: Run `VACUUM ANALYZE` to optimize PostgreSQL
- **Credential Rotation**: Update API credentials and database passwords as per security policy

### Common Maintenance Issues

| Issue | Solution |
|-------|----------|
| Data collection gaps | Check CSS selectors haven't broken; restart application |
| Database growth | Archive old data to separate tables/database |
| High CPU usage | Check for infinite loops; review cron schedules |
| Memory leaks | Monitor with PM2; restart on schedule if needed |

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
- Verify database credentials in `.env` match Neon.tech account
- Confirm database exists on Neon.tech
- Check if your IP needs to be whitelisted (if Neon.tech has IP restrictions)
- Test connection manually: `psql postgresql://user:password@host:5432/database`

#### 2. No Weather Data Collected

**Symptoms:**
- No new records in `weather_stations` table
- Weather collection logs show errors

**Solutions:**
- Weather Underground may have changed their HTML structure - inspect page and update CSS selectors
- Check network connectivity: `curl https://www.wunderground.com`
- Verify station IDs are still active: https://www.wunderground.com/dashboard/pws/KWABLAIN153
- Review application logs for specific scraping errors

#### 3. Scheduling Issues

**Symptoms:**
- Collections not running at expected times
- Cron jobs appear to run but produce no data

**Solutions:**
- Verify server time zone is correct: `date`
- Check system cron logs: `journalctl -u cron` (Linux) or Event Viewer (Windows)
- Confirm cron expressions in code are valid: https://crontab.guru
- Restart application: `pm2 restart weather-collector`

#### 4. High Memory or CPU Usage

**Symptoms:**
- Application memory grows over time
- CPU spikes during scheduled collection times

**Solutions:**
- Check for connection pool leaks in database connection code
- Limit result sets in API endpoints
- Implement pagination for large data queries
- Consider archiving old data

### Getting Help

1. Check the application logs first
2. Review this troubleshooting guide
3. Verify your `.env` configuration
4. Ensure database connectivity with test queries
5. Check Weather Underground's website hasn't changed significantly

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and test thoroughly
4. **Commit** with clear messages: `git commit -m "Add feature: description"`
5. **Push** to your fork: `git push origin feature/your-feature-name`
6. **Submit a Pull Request** with a description of your changes

### Contribution Guidelines

- Write clear, commented code
- Test all changes before submitting
- Update documentation if adding features
- Follow the existing code style

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

See the [LICENSE](LICENSE) file for the full text.

---

**Last Updated:** April 2026  
**Maintainer:** Chris

For questions or issues, please check the logs first and ensure your environment is properly configured.
