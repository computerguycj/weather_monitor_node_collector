# Weather Monitoring App

A Node.js application that monitors and compares weather data from two Weather Underground stations in Blaine, WA, and collects forecast data. Data is stored in a PostgreSQL database hosted on Neon.tech.

## Features

- **Real-time Weather Monitoring**: Scrapes data from two weather stations every 30 minutes
- **Weather Comparison**: Compares temperature, humidity, and wind speed between stations
- **Forecast Collection**: Collects 5-day weather forecast data every hour
- **PostgreSQL Storage**: All data stored in a Neon.tech PostgreSQL database
- **REST API**: Simple API endpoints to access collected data
- **Automated Scheduling**: Uses cron jobs for automated data collection

## Weather Stations Monitored

- **Station 1**: KWABLAIN153 - https://www.wunderground.com/dashboard/pws/KWABLAIN153
- **Station 2**: KWABLAIN126 - https://www.wunderground.com/dashboard/pws/KWABLAIN126
- **Forecast**: Blaine, WA area forecast

## Database Schema

### weather_stations
- `id`: Primary key
- `station_id`: Weather station identifier
- `timestamp`: Data collection time
- `temperature`: Temperature in Fahrenheit
- `humidity`: Humidity percentage
- `wind_speed`: Wind speed in mph
- `wind_direction`: Wind direction
- `pressure`: Atmospheric pressure in inches
- `precipitation`: Precipitation in inches
- `conditions`: Weather conditions description

### forecasts
- `id`: Primary key
- `timestamp`: Data collection time
- `forecast_date`: Date for forecast
- `high_temp`: High temperature
- `low_temp`: Low temperature
- `conditions`: Weather conditions
- `precipitation_chance`: Precipitation probability
- `wind_speed`: Expected wind speed
- `humidity`: Expected humidity

### weather_comparisons
- `id`: Primary key
- `timestamp`: Comparison time
- `station_1_temp`, `station_2_temp`: Temperatures from both stations
- `temp_difference`: Temperature difference
- `station_1_humidity`, `station_2_humidity`: Humidity from both stations
- `humidity_difference`: Humidity difference
- `station_1_wind`, `station_2_wind`: Wind speeds from both stations
- `wind_difference`: Wind speed difference

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Neon.tech PostgreSQL database account

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database on [Neon.tech](https://neon.tech)
2. Copy your database connection details
3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Fill in your Neon.tech database credentials in `.env`:

```env
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
PORT=3000
```

### 3. Run the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The application will:
- Connect to your PostgreSQL database
- Create necessary tables automatically
- Start collecting weather data immediately
- Schedule ongoing data collection

## Data Collection Schedule

- **Weather Stations**: Every 30 minutes
- **Forecast Data**: Every hour (at the top of the hour)

## API Endpoints

### GET /api/latest-comparison
Returns the most recent weather comparison between the two stations.

**Response:**
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

### GET /api/recent-weather/{hours}
Returns weather data from both stations for the specified number of hours (default: 24).

**Example:** `/api/recent-weather/48` for 48 hours of data

### GET /api/health
Health check endpoint.

## Important Notes

### Web Scraping Considerations
- The app uses web scraping to collect data from Weather Underground
- CSS selectors may need adjustment if the website structure changes
- Rate limiting and respectful scraping practices are implemented
- Consider Weather Underground's terms of service and robots.txt

### Error Handling
- The app includes comprehensive error handling for network issues
- Database connection errors are logged and handled gracefully
- Failed data collection attempts are logged but don't stop the service

### Production Deployment
- Set `NODE_ENV=production` in your environment
- Consider using PM2 or similar process manager for production
- Monitor logs for any scraping issues
- Set up database backups on Neon.tech

## Monitoring and Maintenance

1. **Check Logs**: Monitor console output for scraping errors
2. **Database Health**: Verify data is being inserted regularly
3. **Website Changes**: Weather Underground may change their HTML structure
4. **Rate Limiting**: Be respectful of the source website's resources

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify Neon.tech credentials in `.env`
   - Check if your IP is whitelisted (if applicable)
   - Ensure database exists and is accessible

2. **No Weather Data Collected**
   - Check if Weather Underground changed their HTML structure
   - Verify the CSS selectors in the scraping functions
   - Check network connectivity

3. **Scheduling Issues**
   - Ensure the server time zone is correct
   - Check cron expressions if modifying schedules

## License

MIT License - feel free to modify and use as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For questions or issues, please check the logs first and ensure your environment is properly configured.