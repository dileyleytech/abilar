import { describe, it, expect } from 'vitest';
import { haversineKm, isWithinRadius } from './geo';

// Pontos conhecidos em São Paulo.
const paulista = { lat: -23.5613, lng: -46.6565 };
const se = { lat: -23.5505, lng: -46.6333 }; // ~2.5 km da Paulista
const rio = { lat: -22.9068, lng: -43.1729 }; // ~360 km

describe('geo — haversine (matching por raio)', () => {
  it('distância ~0 para o mesmo ponto', () => {
    expect(haversineKm(paulista, paulista)).toBeCloseTo(0, 5);
  });

  it('Paulista → Sé ~2.5 km', () => {
    const d = haversineKm(paulista, se);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(3.5);
  });

  it('SP → Rio ~360 km', () => {
    const d = haversineKm(paulista, rio);
    expect(d).toBeGreaterThan(340);
    expect(d).toBeLessThan(380);
  });

  it('isWithinRadius respeita o raio', () => {
    expect(isWithinRadius(paulista, se, 5)).toBe(true);
    expect(isWithinRadius(paulista, rio, 50)).toBe(false);
    expect(isWithinRadius(paulista, rio, 400)).toBe(true);
  });
});
