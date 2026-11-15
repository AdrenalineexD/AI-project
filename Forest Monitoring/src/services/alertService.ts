import { Alert } from '../types';
import { mockAlerts } from '../data/alerts';

export const alertService = {
  async getAlerts(): Promise<Alert[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockAlerts]);
      }, 100);
    });
  },

  async updateAlertStatus(id: string, status: Alert['status']): Promise<Alert | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const alert = mockAlerts.find(a => a.id === id);
        if (alert) {
          const updated = { ...alert, status };
          resolve(updated);
        } else {
          resolve(null);
        }
      }, 100);
    });
  },

  async createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newAlert: Alert = {
          ...alert,
          id: `ALT-${Math.floor(107 + Math.random() * 900)}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
        resolve(newAlert);
      }, 100);
    });
  }
};
