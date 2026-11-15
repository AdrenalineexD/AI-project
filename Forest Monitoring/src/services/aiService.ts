import { AIDecision, AIRecommendation } from '../types';
import { mockAIDecisions, mockAIRecommendations } from '../data/ai';

export const aiService = {
  async getAIDecisions(): Promise<AIDecision[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockAIDecisions]);
      }, 100);
    });
  },

  async getAIRecommendations(): Promise<AIRecommendation[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockAIRecommendations]);
      }, 100);
    });
  },

  async approveRecommendation(id: string): Promise<AIRecommendation | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const rec = mockAIRecommendations.find(r => r.id === id);
        if (rec) {
          const updated = { ...rec, status: 'Approved' as const };
          resolve(updated);
        } else {
          resolve(null);
        }
      }, 100);
    });
  }
};
