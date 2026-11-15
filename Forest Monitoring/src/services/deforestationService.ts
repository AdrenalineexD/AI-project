import { DeforestationAlert } from '../types';
import { mockDeforestationAlerts, mockDeforestationStats } from '../data/deforestation';

export const deforestationService = {
  async getAlerts(): Promise<DeforestationAlert[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockDeforestationAlerts]);
      }, 100);
    });
  },

  async getStats(): Promise<typeof mockDeforestationStats> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ...mockDeforestationStats });
      }, 100);
    });
  },

  async updateAlertStatus(id: string, status: DeforestationAlert['status']): Promise<DeforestationAlert | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const alert = mockDeforestationAlerts.find(a => a.id === id);
        if (alert) {
          const updated = { ...alert, status };
          resolve(updated);
        } else {
          resolve(null);
        }
      }, 100);
    });
  }
};
