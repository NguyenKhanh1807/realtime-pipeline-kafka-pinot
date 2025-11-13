/**
 * Repository Interfaces and Implementations Barrel Export
 */

// User Repository
export type { UserRepository } from './user-repository';
export { UserRepositoryImpl } from './implementations/user-repository-impl';

// Transaction Repository
export type { TransactionRepository } from './transaction-repository';
export { TransactionRepositoryImpl } from './implementations/transaction-repository-impl';

// Fraud Analysis Repository
export type { FraudAnalysisRepository } from './fraud-analysis-repository';
export { FraudAnalysisRepositoryImpl } from './implementations/fraud-analysis-repository-impl';
export { WebSocketRepositoryImpl } from './implementations/websocket-repository-impl';
export type { WebSocketRepository } from './websocket-repository';

// Factory functions - create repository instances
import { UserRepositoryImpl } from './implementations/user-repository-impl';
import { TransactionRepositoryImpl } from './implementations/transaction-repository-impl';
import { FraudAnalysisRepositoryImpl } from './implementations/fraud-analysis-repository-impl';
import { WebSocketRepositoryImpl } from './implementations/websocket-repository-impl';
import { websiteApiClient, pinotClient } from '@/src/services';
import { UserRepository } from './user-repository';
import { TransactionRepository } from './transaction-repository';
import { FraudAnalysisRepository } from './fraud-analysis-repository';
import type { WebSocketRepository } from './websocket-repository';

/**
 * Factory function to create UserRepository instance
 * This provides a single point of configuration
 */
export const createUserRepository = (): UserRepository => {
  return new UserRepositoryImpl(websiteApiClient);
};

/**
 * Factory function to create TransactionRepository instance
 */
export const createTransactionRepository = (): TransactionRepository => {
  return new TransactionRepositoryImpl(pinotClient);
};

/**
 * Factory function to create FraudAnalysisRepository instance
 */
export const createFraudAnalysisRepository = (): FraudAnalysisRepository => {
  return new FraudAnalysisRepositoryImpl(pinotClient);
};

/**
 * Factory function to create WebSocketRepository instance
 */
export const createWebSocketRepository = (wsUrl?: string): WebSocketRepository => {
  return new WebSocketRepositoryImpl(wsUrl);
};

/**
 * Default repository instances (singletons)
 * Use these in ViewModels and Commands
 */
export const userRepository: UserRepository = createUserRepository();
export const transactionRepository: TransactionRepository = createTransactionRepository();
export const fraudAnalysisRepository: FraudAnalysisRepository = createFraudAnalysisRepository();
export const webSocketRepository: WebSocketRepository = createWebSocketRepository();

