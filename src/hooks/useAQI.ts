import { useState, useEffect } from 'react';
import { AirQualityData } from '../types';
import { evaluateAQI } from '../utils/weatherCodes';
import { pm25ToAQI } from '../utils/aqiCalc';

export type AqiSource = 'openmeteo' | 'official' | 'hyperlocal';

export function useAQI(lat: number, lon: number, defaultAirQuality?: AirQualityData) {
  const [source, setSource] = useState<AqiSource>('openmeteo');
  const [data, setData] = useState<AirQualityData | undefined>(defaultAirQuality);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source === 'openmeteo') {
      setData(defaultAirQuality);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchAQI = async () => {
      try {
        if (source === 'official') {
          // IQAir AirVisual
          const res = await fetch(`/api/aqi/iqair?lat=${lat}&lon=${lon}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to fetch Official AQI');
          }
          const raw = await res.json();
          if (raw.data?.current?.pollution) {
            const aqiUs = raw.data.current.pollution.aqius;
            const evalData = evaluateAQI(aqiUs);
            if (isMounted) {
              setData({
                aqiUs,
                pm2_5: 0, // IQAir doesn't easily expose individual values on nearest_city
                pm10: 0,
                nitrogenDioxide: 0,
                ozone: 0,
                sulphurDioxide: 0,
                carbonMonoxide: 0,
                qualityLevel: evalData.level,
                qualityColor: evalData.color,
                advice: evalData.advice,
              });
            }
          } else {
            throw new Error('No pollution data available');
          }
        } else if (source === 'hyperlocal') {
          // PurpleAir
          const res = await fetch(`/api/aqi/purpleair?lat=${lat}&lon=${lon}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to fetch Hyperlocal AQI');
          }
          const raw = await res.json();
          if (raw.data && raw.data.length > 0) {
            // data is an array of sensors. Just take the first one (closest or inside bbox)
            // Fields: ["name", "latitude", "longitude", "pm2.5_10minute", "humidity", "temperature"]
            const pm25Index = raw.fields.indexOf('pm2.5_10minute');
            if (pm25Index === -1) throw new Error('PM2.5 field not found in response');
            
            const sensorData = raw.data[0];
            const pm25 = parseFloat(sensorData[pm25Index]);
            const aqiUs = pm25ToAQI(pm25);
            const evalData = evaluateAQI(aqiUs);
            
            if (isMounted) {
              setData({
                aqiUs,
                pm2_5: Math.round(pm25),
                pm10: 0,
                nitrogenDioxide: 0,
                ozone: 0,
                sulphurDioxide: 0,
                carbonMonoxide: 0,
                qualityLevel: evalData.level,
                qualityColor: evalData.color,
                advice: `Sensor ${sensorData[0]} | ${evalData.advice}`,
              });
            }
          } else {
            throw new Error('No hyperlocal sensors found near this location');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setData(undefined);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAQI();

    return () => {
      isMounted = false;
    };
  }, [lat, lon, source, defaultAirQuality]);

  return { source, setSource, data, isLoading, error };
}
