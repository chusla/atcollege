/**
 * Categorization Queue
 * Manages background processing of place categorization
 */

import React from 'react';
import { categorizePlace, getUncategorizedPlaces } from '@/api/llmCategorization';

class CategorizationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.listeners = new Set();
  }

  /**
   * Add place to queue
   */
  enqueue(placeId) {
    if (!this.queue.includes(placeId)) {
      this.queue.push(placeId);
      this.notifyListeners();
    }
  }

  /**
   * Add multiple places to queue
   */
  enqueueBatch(placeIds) {
    placeIds.forEach(id => {
      if (!this.queue.includes(id)) {
        this.queue.push(id);
      }
    });
    this.notifyListeners();
  }

  /**
   * Process queue
   */
  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.notifyListeners();

    while (this.queue.length > 0) {
      const placeId = this.queue.shift();
      
      try {
        await categorizePlace(placeId);
        this.notifyListeners();
      } catch (error) {
        console.error(`Error categorizing place ${placeId}:`, error);
        // Don't re-queue failed items to prevent infinite loops
        // They can be manually retried via admin interface
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.processing = false;
    this.notifyListeners();
  }

  /**
   * Start processing queue
   */
  start() {
    if (!this.processing) {
      this.process();
    }
  }

  /**
   * Load uncategorized places into queue
   */
  async loadUncategorized(limit = 20) {
    const places = await getUncategorizedPlaces(limit);
    const placeIds = places.map(p => p.id);
    this.enqueueBatch(placeIds);
    return placeIds.length;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    };
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.getStatus());
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.notifyListeners();
  }
}

// Singleton instance
export const categorizationQueue = new CategorizationQueue();

/**
 * React hook for categorization queue status
 */
export function useCategorizationQueue() {
  const [status, setStatus] = React.useState({
    queueLength: 0,
    processing: false
  });

  React.useEffect(() => {
    const unsubscribe = categorizationQueue.subscribe(setStatus);
    setStatus(categorizationQueue.getStatus());
    return unsubscribe;
  }, []);

  return {
    ...status,
    start: () => categorizationQueue.start(),
    loadUncategorized: (limit) => categorizationQueue.loadUncategorized(limit),
    clear: () => categorizationQueue.clear()
  };
}

