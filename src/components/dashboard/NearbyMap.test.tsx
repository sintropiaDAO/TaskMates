// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NearbyMap } from './NearbyMap';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'pt' }) }));
vi.mock('leaflet', () => ({
  default: {
    map: () => {
      const map = { setView: () => map, on: vi.fn(), off: vi.fn(), remove: vi.fn() };
      return map;
    },
    control: { zoom: () => ({ addTo: vi.fn() }) },
    tileLayer: () => ({ addTo: vi.fn() }),
  },
}));

afterEach(cleanup);

describe('nearby map touch navigation', () => {
  it('keeps map gestures from switching dashboard sections while gestures outside the map still navigate', () => {
    const navigate = vi.fn();
    const { getByPlaceholderText, getByTestId } = render(
      <div onTouchEnd={navigate}>
        <div data-testid="outside-map" />
        <NearbyMap tasks={[]} userLocation={null} onTaskClick={vi.fn()} />
      </div>,
    );
    fireEvent.touchStart(getByPlaceholderText('Buscar localidade no mapa...'));
    fireEvent.touchEnd(getByPlaceholderText('Buscar localidade no mapa...'));
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.touchEnd(getByTestId('outside-map'));
    expect(navigate).toHaveBeenCalledOnce();
  });
});