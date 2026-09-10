// Convert PM2.5 to US AQI
export function pm25ToAQI(pm25: number): number {
  if (pm25 < 0) return 0;
  
  const breaks = [
    { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 }
  ];

  for (let i = 0; i < breaks.length; i++) {
    const b = breaks[i];
    if (pm25 >= b.cLow && pm25 <= b.cHigh) {
      return Math.round(((b.iHigh - b.iLow) / (b.cHigh - b.cLow)) * (pm25 - b.cLow) + b.iLow);
    }
  }
  
  if (pm25 > 500.4) return 500;
  return 0;
}
