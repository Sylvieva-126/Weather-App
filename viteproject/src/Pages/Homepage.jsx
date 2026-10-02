import { useEffect, useState } from 'react';
import { FaCloudShowersHeavy, FaSun, FaMapMarkerAlt } from 'react-icons/fa';

const isSunnyOrRainy = (weatherCode) => weatherCode === 0
  || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode);

const Homepage = () => {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const citiesResponse = await fetch(
          'https://countriesnow.space/api/v0.1/countries/capital',
        );

        if (!citiesResponse.ok) {
          throw new Error('Unable to load cities');
        }

        const capitalData = await citiesResponse.json();
        const capitals = capitalData.data
          .filter((country) => country.capital)
          .slice(0, 50);
        const cities = (await Promise.all(capitals.map(async (country) => {
          const locationResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(country.capital)}&count=1&language=en&format=json`,
          );
          const locationData = await locationResponse.json();
          const location = locationData.results?.[0];

          if (!location) return null;

          return {
            id: country.iso3,
            name: country.capital,
            latitude: location.latitude,
            longitude: location.longitude,
          };
        }))).filter(Boolean);

        const successfulResults = [];
        const batchSize = 50;

        for (let index = 0; index < cities.length; index += batchSize) {
          const cityBatch = cities.slice(index, index + batchSize);
          const latitudes = cityBatch.map((city) => city.latitude).join(',');
          const longitudes = cityBatch.map((city) => city.longitude).join(',');
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,weather_code&temperature_unit=celsius`,
          );
          const weatherBatch = await weatherResponse.json();
          const weatherResults = Array.isArray(weatherBatch) ? weatherBatch : [weatherBatch];

          weatherResults.forEach((weather, weatherIndex) => {
            if (isSunnyOrRainy(weather.current?.weather_code)) {
              const city = cityBatch[weatherIndex];
              successfulResults.push({
                id: city.id,
                name: city.name,
                temperature: weather.current.temperature_2m,
                weatherCode: weather.current.weather_code,
              });
            }
          });
        }

        if (successfulResults.length === 0) {
          throw new Error('No cities are currently sunny or rainy.');
        }

        setWeatherData(successfulResults);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) return <p>Loading weather data...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <main>
      {weatherData.map((weather) => {
        return (
          <section className="weather-card" key={weather.id}>
            <h1 className="city-name">Location: 
              <FaMapMarkerAlt className="city-icon" />
              {weather.name}
            </h1>

            <div className="weather-divider" />

            <div className="weather-details">
              <span className="weather-label">Weather:</span>
              {weather.weatherCode === 0 ? (
                <FaSun className="weather-icon sunny-icon" />
              ) : (
                <FaCloudShowersHeavy className="weather-icon rainy-icon" />
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
};

export default Homepage;
