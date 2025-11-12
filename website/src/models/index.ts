// Model Layer - Domain Logic and Data Access
// This follows Domain-Driven Design principles

// Core domain types
export * from './types';

// Domain entities
export { User } from './entities/user';
export { Transaction } from './entities/transaction';
export { FraudAnalysis } from './entities/fraud-analysis';

// Value objects
export * from './value-objects';

// Repository interfaces
export type { UserRepository } from './repositories/user-repository';
export type { TransactionRepository } from './repositories/transaction-repository';
export type { FraudAnalysisRepository } from './repositories/fraud-analysis-repository';

// Domain services
export { FraudDetectionService } from './services/fraud-detection-service';

// Domain validators
export * from './validators/domain-validators';
