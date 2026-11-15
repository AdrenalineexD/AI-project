import { FireDetection } from '../types';
import { mockFires } from '../data/fires';

export const fireService = {
  async getActiveFires(): Promise<FireDetection[]> {
    return new Promise((resolve) => {
      // Simulate network request latency
      setTimeout(() => {
        resolve([...mockFires]);
      }, 100);
    });
  },

  async reportNewFire(fire: Omit<FireDetection, 'id' | 'detectedAt'>): Promise<FireDetection> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newFire: FireDetection = {
          ...fire,
          id: `FIRE-${Math.floor(100 + Math.random() * 900)}`,
          detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        resolve(newFire);
      }, 100);
    });
  }
};
