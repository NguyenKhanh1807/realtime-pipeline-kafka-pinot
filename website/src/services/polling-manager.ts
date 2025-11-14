/**
 * Unified Polling Manager
 * Coordinates multiple polling sources to prevent duplicate requests and manage intervals
 */

import { log as logger } from '@/src/lib/logger';

export interface PollingTask {
  id: string;
  name: string;
  fn: () => Promise<void>;
  interval: number;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  errorCount: number;
  maxErrors?: number;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface PollingManagerOptions {
  globalPause?: boolean;
  maxConcurrentPolls?: number;
}

/**
 * Unified Polling Manager
 * Manages multiple polling tasks with coordination, deduplication, and error handling
 */
export class PollingManager {
  private tasks: Map<string, PollingTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private globalPause = false;
  private maxConcurrentPolls = 3;
  private activePolls = 0;
  private pollQueue: string[] = [];

  constructor(options: PollingManagerOptions = {}) {
    this.globalPause = options.globalPause || false;
    this.maxConcurrentPolls = options.maxConcurrentPolls || 3;
  }

  /**
   * Register a polling task
   */
  register(task: PollingTask): void {
    if (this.tasks.has(task.id)) {
      logger.warn(`Polling task ${task.id} already registered, updating...`);
    }

    this.tasks.set(task.id, {
      ...task,
      enabled: task.enabled !== false,
      errorCount: 0,
    });

    // Start polling if enabled and not globally paused
    if (task.enabled && !this.globalPause) {
      this.startTask(task.id);
    }
  }

  /**
   * Unregister a polling task
   */
  unregister(taskId: string): void {
    this.stopTask(taskId);
    this.tasks.delete(taskId);
  }

  /**
   * Start polling for a specific task
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn(`Polling task ${taskId} not found`);
      return;
    }

    if (this.intervals.has(taskId)) {
      logger.warn(`Polling task ${taskId} is already running`);
      return;
    }

    task.enabled = true;

    // Execute immediately
    this.executeTask(taskId);

    // Schedule recurring execution
    const intervalId = setInterval(() => {
      this.executeTask(taskId);
    }, task.interval);

    this.intervals.set(taskId, intervalId);

    logger.info(`Started polling task: ${task.name} (${taskId})`, {
      metadata: {
        interval: task.interval,
        taskId,
      },
    });
  }

  /**
   * Stop polling for a specific task
   */
  stopTask(taskId: string): void {
    const intervalId = this.intervals.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(taskId);

      const task = this.tasks.get(taskId);
      if (task) {
        task.enabled = false;
        logger.info(`Stopped polling task: ${task.name} (${taskId})`);
      }
    }
  }

  /**
   * Execute a polling task
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || !task.enabled || this.globalPause) {
      return;
    }

    // Check if we've hit max concurrent polls
    if (this.activePolls >= this.maxConcurrentPolls) {
      // Queue the task for later
      if (!this.pollQueue.includes(taskId)) {
        this.pollQueue.push(taskId);
      }
      return;
    }

    // Check error threshold
    if (task.maxErrors && task.errorCount >= task.maxErrors) {
      logger.warn(`Polling task ${taskId} exceeded max errors, disabling`, {
        metadata: {
          errorCount: task.errorCount,
          maxErrors: task.maxErrors,
        },
      });
      this.stopTask(taskId);
      return;
    }

    this.activePolls++;
    task.lastRun = new Date();
    task.nextRun = new Date(Date.now() + task.interval);

    try {
      await task.fn();
      
      // Reset error count on success
      task.errorCount = 0;
      task.onSuccess?.();

      // Process queued tasks
      this.processQueue();
    } catch (error) {
      task.errorCount++;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      logger.error(`Polling task ${taskId} failed`, errorObj, {
        metadata: {
          errorCount: task.errorCount,
          taskName: task.name,
        },
      });

      task.onError?.(errorObj);

      // Process queued tasks even on error
      this.processQueue();
    } finally {
      this.activePolls--;
    }
  }

  /**
   * Process queued polling tasks
   */
  private processQueue(): void {
    while (this.pollQueue.length > 0 && this.activePolls < this.maxConcurrentPolls) {
      const taskId = this.pollQueue.shift();
      if (taskId) {
        this.executeTask(taskId);
      }
    }
  }

  /**
   * Pause all polling tasks
   */
  pauseAll(): void {
    this.globalPause = true;
    logger.info('All polling tasks paused');
  }

  /**
   * Resume all polling tasks
   */
  resumeAll(): void {
    this.globalPause = false;
    
    // Restart all enabled tasks
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.enabled && !this.intervals.has(taskId)) {
        this.startTask(taskId);
      }
    }

    logger.info('All polling tasks resumed');
  }

  /**
   * Get status of all polling tasks
   */
  getStatus(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    interval: number;
    lastRun?: Date;
    nextRun?: Date;
    errorCount: number;
  }> {
    return Array.from(this.tasks.values()).map((task) => ({
      id: task.id,
      name: task.name,
      enabled: task.enabled,
      interval: task.interval,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      errorCount: task.errorCount,
    }));
  }

  /**
   * Get status of a specific task
   */
  getTaskStatus(taskId: string): PollingTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Update task interval
   */
  updateInterval(taskId: string, newInterval: number): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn(`Polling task ${taskId} not found`);
      return;
    }

    const wasRunning = this.intervals.has(taskId);
    
    if (wasRunning) {
      this.stopTask(taskId);
    }

    task.interval = newInterval;

    if (wasRunning) {
      this.startTask(taskId);
    }

    logger.info(`Updated polling interval for ${taskId}`, {
      metadata: {
        newInterval,
        taskName: task.name,
      },
    });
  }

  /**
   * Clear all polling tasks
   */
  clear(): void {
    for (const taskId of this.tasks.keys()) {
      this.stopTask(taskId);
    }
    this.tasks.clear();
    this.intervals.clear();
    this.pollQueue = [];
    this.activePolls = 0;
  }

  /**
   * Get active poll count
   */
  getActivePollCount(): number {
    return this.activePolls;
  }

  /**
   * Get total registered tasks count
   */
  getTotalTasksCount(): number {
    return this.tasks.size;
  }
}

/**
 * Global polling manager instance
 * Use this singleton instance across the application
 */
export const pollingManager = new PollingManager({
  maxConcurrentPolls: 3,
});

