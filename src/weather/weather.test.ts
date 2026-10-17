import { describe, expect, it } from 'vitest';
import {
  REFRESH_MS,
  cacheMatches,
  forecastUrl,
  formatHighLow,
  formatTemp,
  msUntilRefresh,
  parseCached,
  parseForecast,
  shortPlace,
  skyFor,
  toUnit,
  weatherLabel,
  type Cached,
  type Reading,
} from './weather';

const reading: Reading = { tempC: 12.2, highC: 16.1, lowC: 6.1, code: 2, isDay: true };

describe('unit conversion and formatting', () => {
  it('converts °C to °F and leaves °C alone', () => {
    expect(toUnit(0, 'F')).toBe(32);
    expect(toUnit(100, 'F')).toBe(212);
    expect(toUnit(-40, 'F')).toBe(-40);
    expect(toUnit(12.5, 'C')).toBe(12.5);
  });

  it('rounds to whole degrees with the mockup\'s "54°"', () => {
    expect(formatTemp(12.2, 'F')).toBe('54°');
    expect(formatTemp(12.2, 'C')).toBe('12°');
    expect(formatTemp(12.5, 'C')).toBe('13°');
    expect(formatTemp(-3.6, 'C')).toBe('-4°');
  });

  it('never shows "-0°"', () => {
    expect(formatTemp(-0.3, 'C')).toBe('0°');
    expect(formatTemp(-17.9, 'F')).toBe('0°');
  });

  it('writes the high and low as in the mockup', () => {
    expect(formatHighLow(reading, 'F')).toBe('High 61° · Low 43°');
    expect(formatHighLow(reading, 'C')).toBe('High 16° · Low 6°');
  });

  it('shortens the place to the town', () => {
    expect(shortPlace('Rochester, MI')).toBe('Rochester');
    expect(shortPlace('Springfield')).toBe('Springfield');
    expect(shortPlace('')).toBe('');
  });

  it('builds a spoken label', () => {
    expect(weatherLabel('Rochester, MI', reading, 'F')).toBe(
      'Weather in Rochester: Partly cloudy, 54°, High 61° · Low 43°',
    );
    expect(weatherLabel('', reading, 'C')).toBe('Weather: Partly cloudy, 12°, High 16° · Low 6°');
  });
});

describe('Open-Meteo', () => {
  it("asks for current and daily values in the location's time zone, in °C", () => {
    const u = new URL(forecastUrl(43.15, -77.61));
    expect(u.origin + u.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(u.searchParams.get('latitude')).toBe('43.15');
    expect(u.searchParams.get('longitude')).toBe('-77.61');
    expect(u.searchParams.get('current')).toBe('temperature_2m,weather_code,is_day');
    expect(u.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min');
    expect(u.searchParams.get('timezone')).toBe('auto');
    expect(u.searchParams.has('temperature_unit')).toBe(false);
  });

  it('parses a forecast response', () => {
    const json = {
      current: { time: '2026-10-16T19:30', temperature_2m: 11.5, weather_code: 3, is_day: 0 },
      daily: { time: ['2026-10-16'], temperature_2m_max: [14], temperature_2m_min: [8.3] },
    };
    expect(parseForecast(json)).toEqual({
      tempC: 11.5,
      highC: 14,
      lowC: 8.3,
      code: 3,
      isDay: false,
    });
  });

  it('rejects responses without temperatures', () => {
    expect(parseForecast(null)).toBeNull();
    expect(parseForecast({ error: true, reason: 'bad' })).toBeNull();
    expect(
      parseForecast({
        current: { temperature_2m: null },
        daily: { temperature_2m_max: [1], temperature_2m_min: [0] },
      }),
    ).toBeNull();
  });

  it('groups weather codes into icons', () => {
    expect(skyFor(0)).toBe('clear');
    expect(skyFor(1)).toBe('partly');
    expect(skyFor(3)).toBe('cloudy');
    expect(skyFor(45)).toBe('fog');
    expect(skyFor(53)).toBe('rain');
    expect(skyFor(66)).toBe('rain');
    expect(skyFor(81)).toBe('rain');
    expect(skyFor(73)).toBe('snow');
    expect(skyFor(86)).toBe('snow');
    expect(skyFor(95)).toBe('storm');
    expect(skyFor(42)).toBe('cloudy');
  });
});

describe('cache', () => {
  const c: Cached = { lat: 43.15, lon: -77.61, fetchedAt: 1_000_000, reading };

  it('round-trips through JSON and rejects junk', () => {
    expect(parseCached(JSON.stringify(c))).toEqual(c);
    expect(parseCached(null)).toBeNull();
    expect(parseCached('not json')).toBeNull();
    expect(parseCached(JSON.stringify({ ...c, reading: { tempC: 'x' } }))).toBeNull();
  });

  it('only counts for the same location', () => {
    expect(cacheMatches(c, 43.15, -77.61)).toBe(true);
    expect(cacheMatches(c, 43.152, -77.608)).toBe(true);
    expect(cacheMatches(c, 39.78, -89.65)).toBe(false);
    expect(cacheMatches(null, 43.15, -77.61)).toBe(false);
  });

  it('refreshes 30 minutes after the last fetch, or now if there is no usable cache', () => {
    expect(msUntilRefresh(c, 43.15, -77.61, c.fetchedAt)).toBe(REFRESH_MS);
    expect(msUntilRefresh(c, 43.15, -77.61, c.fetchedAt + 10 * 60_000)).toBe(20 * 60_000);
    expect(msUntilRefresh(c, 43.15, -77.61, c.fetchedAt + 2 * REFRESH_MS)).toBe(0);
    expect(msUntilRefresh(c, 39.78, -89.65, c.fetchedAt)).toBe(0);
    expect(msUntilRefresh(null, 43.15, -77.61, 0)).toBe(0);
  });
});
