/**
 * Storage Interface
 * 
 * This interface defines the contract for storage operations.
 * It's kept separate from the implementation to allow for different backends.
 * 
 * The InsforgeStorageService implements this interface using Insforge SDK.
 * The old DatabaseStorage (in storage.ts) is deprecated but kept for reference.
 */

import type {
  User, InsertUser,
  ServiceHistory, InsertServiceHistory,
  MedicalCondition, InsertMedicalCondition,
  Claim, InsertClaim,
  LayStatement, InsertLayStatement,
  BuddyStatement, InsertBuddyStatement,
  Document, InsertDocument,
  Appeal, InsertAppeal,
  Referral, InsertReferral,
  Consultation, InsertConsultation
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string, accessToken?: string): Promise<User | undefined>;
  getUserByEmail(email: string, accessToken?: string): Promise<User | undefined>;
  createUser(user: InsertUser, accessToken?: string): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>, accessToken?: string): Promise<User | undefined>;

  // Service History methods
  getServiceHistory(userId: string, accessToken?: string): Promise<ServiceHistory[]>;
  getServiceHistoryById(id: string, accessToken?: string): Promise<ServiceHistory | undefined>;
  createServiceHistory(history: InsertServiceHistory, accessToken?: string): Promise<ServiceHistory>;
  updateServiceHistory(id: string, history: Partial<InsertServiceHistory>, accessToken?: string): Promise<ServiceHistory | undefined>;
  deleteServiceHistory(id: string, accessToken?: string): Promise<void>;

  // Medical Conditions methods
  getMedicalConditions(userId: string, accessToken?: string): Promise<MedicalCondition[]>;
  getMedicalConditionById(id: string, accessToken?: string): Promise<MedicalCondition | undefined>;
  createMedicalCondition(condition: InsertMedicalCondition, accessToken?: string): Promise<MedicalCondition>;
  updateMedicalCondition(id: string, condition: Partial<InsertMedicalCondition>, accessToken?: string): Promise<MedicalCondition | undefined>;
  deleteMedicalCondition(id: string, accessToken?: string): Promise<void>;

  // Claims methods
  getClaims(userId: string, accessToken?: string): Promise<Claim[]>;
  getClaim(id: string, accessToken?: string): Promise<Claim | undefined>;
  createClaim(claim: InsertClaim, accessToken?: string): Promise<Claim>;
  updateClaim(id: string, claim: Partial<InsertClaim>, accessToken?: string): Promise<Claim | undefined>;
  deleteClaim(id: string, accessToken?: string): Promise<void>;

  // Lay Statements methods
  getLayStatements(userId: string, accessToken?: string): Promise<LayStatement[]>;
  getLayStatementById(id: string, accessToken?: string): Promise<LayStatement | undefined>;
  getLayStatementsByClaim(claimId: string, accessToken?: string): Promise<LayStatement[]>;
  createLayStatement(statement: InsertLayStatement, accessToken?: string): Promise<LayStatement>;
  updateLayStatement(id: string, statement: Partial<InsertLayStatement>, accessToken?: string): Promise<LayStatement | undefined>;
  deleteLayStatement(id: string, accessToken?: string): Promise<void>;

  // Buddy Statements methods
  getBuddyStatements(userId: string, accessToken?: string): Promise<BuddyStatement[]>;
  getBuddyStatementById(id: string, accessToken?: string): Promise<BuddyStatement | undefined>;
  getBuddyStatementsByClaim(claimId: string, accessToken?: string): Promise<BuddyStatement[]>;
  createBuddyStatement(statement: InsertBuddyStatement, accessToken?: string): Promise<BuddyStatement>;
  updateBuddyStatement(id: string, statement: Partial<InsertBuddyStatement>, accessToken?: string): Promise<BuddyStatement | undefined>;
  deleteBuddyStatement(id: string, accessToken?: string): Promise<void>;

  // Documents methods
  getDocuments(userId: string, accessToken?: string): Promise<Document[]>;
  getDocumentById(id: string, accessToken?: string): Promise<Document | undefined>;
  getDocumentsByClaim(claimId: string, accessToken?: string): Promise<Document[]>;
  createDocument(document: InsertDocument, accessToken?: string): Promise<Document>;
  deleteDocument(id: string, accessToken?: string): Promise<void>;

  // Appeals methods
  getAppeals(userId: string, accessToken?: string): Promise<Appeal[]>;
  getAppeal(id: string, accessToken?: string): Promise<Appeal | undefined>;
  createAppeal(appeal: InsertAppeal, accessToken?: string): Promise<Appeal>;
  updateAppeal(id: string, appeal: Partial<InsertAppeal>, accessToken?: string): Promise<Appeal | undefined>;
  deleteAppeal(id: string, accessToken?: string): Promise<void>;

  // Referral methods
  getReferrals(userId: string, accessToken?: string): Promise<Referral[]>;
  getReferralById(id: string, accessToken?: string): Promise<Referral | undefined>;
  getReferralByCode(code: string, accessToken?: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral, accessToken?: string): Promise<Referral>;
  updateReferral(id: string, referral: Partial<InsertReferral>, accessToken?: string): Promise<Referral | undefined>;
  deleteReferral(id: string, accessToken?: string): Promise<boolean>;
  getReferralStats(userId: string, accessToken?: string): Promise<{ total: number; converted: number; rewards: number }>;

  // Consultation methods
  getConsultations(userId?: string, accessToken?: string): Promise<Consultation[]>;
  getConsultation(id: string, accessToken?: string): Promise<Consultation | undefined>;
  createConsultation(consultation: InsertConsultation, accessToken?: string): Promise<Consultation>;
  updateConsultation(id: string, consultation: Partial<InsertConsultation>, accessToken?: string): Promise<Consultation | undefined>;
  cancelConsultation(id: string, accessToken?: string): Promise<Consultation | undefined>;

  // Site Stats methods
  getStat(key: string, accessToken?: string): Promise<number>;
  incrementStat(key: string, accessToken?: string): Promise<number>;
  initializeStat(key: string, value: number, accessToken?: string): Promise<void>;

  // Stripe methods
  getStripeProducts(accessToken?: string): Promise<any[]>;
  getStripePrices(accessToken?: string): Promise<any[]>;
  getStripeProduct(productId: string, accessToken?: string): Promise<any>;
  getStripeSubscription(subscriptionId: string, accessToken?: string): Promise<any>;
}
