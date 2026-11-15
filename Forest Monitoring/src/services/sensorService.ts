import { SensorNode } from '../types';
import { mockSensors } from '../data/sensors';

export const sensorService = {
  async getSensors(): Promise<SensorNode[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockSensors]);
      }, 100);
    });
  },

  async toggleNodeStatus(id: string): Promise<SensorNode | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const node = mockSensors.find(s => s.id === id);
        if (node) {
          const updated = {
            ...node,
            connectivity: node.connectivity === 'Online' ? 'Offline' as const : 'Online' as const,
            lastUpdated: '1 sec ago'
          };
          resolve(updated);
        } else {
          resolve(null);
        }
      }, 100);
    });
  }
};
