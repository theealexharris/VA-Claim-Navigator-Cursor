import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, serviceHistory, medicalConditions, claims, layStatements, buddyStatements, documents, appeals, referrals, consultations, siteStats,
  type User, type InsertUser,
  type ServiceHistory, type InsertServiceHistory,
  type MedicalCondition, type InsertMedicalCondition,
  type Claim, type InsertClaim,
  type LayStatement, type InsertLayStatement,
  type BuddyStatement, type InsertBuddyStatement,
  type Document, type InsertDocument,
  type Appeal, type InsertAppeal,
  type Referral, type InsertReferral,
  type Consultation, type InsertConsultation
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Service History methods
  getServiceHistory(userId: string): Promise<ServiceHistory[]>;
  getServiceHistoryById(id: string): Promise<ServiceHistory | undefined>;
  createServiceHistory(history: InsertServiceHistory): Promise<ServiceHistory>;
  updateServiceHistory(id: string, history: Partial<InsertServiceHistory>): Promise<ServiceHistory | undefined>;
  deleteServiceHistory(id: string): Promise<void>;

  // Medical Conditions methods
  getMedicalConditions(userId: string): Promise<MedicalCondition[]>;
  getMedicalConditionById(id: string): Promise<MedicalCondition | undefined>;
  createMedicalCondition(condition: InsertMedicalCondition): Promise<MedicalCondition>;
  updateMedicalCondition(id: string, condition: Partial<InsertMedicalCondition>): Promise<MedicalCondition | undefined>;
  deleteMedicalCondition(id: string): Promise<void>;

  // Claims methods
  getClaims(userId: string): Promise<Claim[]>;
  getClaim(id: string): Promise<Claim | undefined>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, claim: Partial<InsertClaim>): Promise<Claim | undefined>;
  deleteClaim(id: string): Promise<void>;

  // Lay Statements methods
  getLayStatements(userId: string): Promise<LayStatement[]>;
  getLayStatementById(id: string): Promise<LayStatement | undefined>;
  getLayStatementsByClaim(claimId: string): Promise<LayStatement[]>;
  createLayStatement(statement: InsertLayStatement): Promise<LayStatement>;
  updateLayStatement(id: string, statement: Partial<InsertLayStatement>): Promise<LayStatement | undefined>;
  deleteLayStatement(id: string): Promise<void>;

  // Buddy Statements methods
  getBuddyStatements(userId: string): Promise<BuddyStatement[]>;
  getBuddyStatementById(id: string): Promise<BuddyStatement | undefined>;
  getBuddyStatementsByClaim(claimId: string): Promise<BuddyStatement[]>;
  createBuddyStatement(statement: InsertBuddyStatement): Promise<BuddyStatement>;
  updateBuddyStatement(id: string, statement: Partial<InsertBuddyStatement>): Promise<BuddyStatement | undefined>;
  deleteBuddyStatement(id: string): Promise<void>;

  // Documents methods
  getDocuments(userId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  getDocumentsByClaim(claimId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Appeals methods
  getAppeals(userId: string): Promise<Appeal[]>;
  getAppeal(id: string): Promise<Appeal | undefined>;
  createAppeal(appeal: InsertAppeal): Promise<Appeal>;
  updateAppeal(id: string, appeal: Partial<InsertAppeal>): Promise<Appeal | undefined>;
  deleteAppeal(id: string): Promise<void>;

  // Referral methods
  getReferrals(userId: string): Promise<Referral[]>;
  getReferralById(id: string): Promise<Referral | undefined>;
  getReferralByCode(code: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: string, referral: Partial<InsertReferral>): Promise<Referral | undefined>;
  deleteReferral(id: string): Promise<boolean>;
  getReferralStats(userId: string): Promise<{ total: number; converted: number; rewards: number }>;

  // Consultation methods
  getConsultations(userId?: string): Promise<Consultation[]>;
  getConsultation(id: string): Promise<Consultation | undefined>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: string, consultation: Partial<InsertConsultation>): Promise<Consultation | undefined>;
  cancelConsultation(id: string): Promise<Consultation | undefined>;

  // Site Stats methods
  getStat(key: string): Promise<number>;
  incrementStat(key: string): Promise<number>;
  initializeStat(key: string, value: number): Promise<void>;

  // Stripe methods
  getStripeProducts(): Promise<any[]>;
  getStripePrices(): Promise<any[]>;
  getStripeProduct(productId: string): Promise<any>;
  getStripeSubscription(subscriptionId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Service History methods
  async getServiceHistory(userId: string): Promise<ServiceHistory[]> {
    return db.select().from(serviceHistory).where(eq(serviceHistory.userId, userId)).orderBy(desc(serviceHistory.dateEntered));
  }

  async getServiceHistoryById(id: string): Promise<ServiceHistory | undefined> {
    const [result] = await db.select().from(serviceHistory).where(eq(serviceHistory.id, id));
    return result || undefined;
  }

  async createServiceHistory(history: InsertServiceHistory): Promise<ServiceHistory> {
    const deployments = history.deployments ? (history.deployments as { location: string; startDate: string; endDate: string }[]) : null;
    const [result] = await db.insert(serviceHistory).values({
      ...history,
      deployments,
    }).returning();
    return result;
  }

  async updateServiceHistory(id: string, updates: Partial<InsertServiceHistory>): Promise<ServiceHistory | undefined> {
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.deployments !== undefined) {
      updateData.deployments = updates.deployments ? (updates.deployments as { location: string; startDate: string; endDate: string }[]) : null;
    }
    const [result] = await db.update(serviceHistory).set(updateData).where(eq(serviceHistory.id, id)).returning();
    return result || undefined;
  }

  async deleteServiceHistory(id: string): Promise<void> {
    await db.delete(serviceHistory).where(eq(serviceHistory.id, id));
  }

  // Medical Conditions methods
  async getMedicalConditions(userId: string): Promise<MedicalCondition[]> {
    return db.select().from(medicalConditions).where(eq(medicalConditions.userId, userId)).orderBy(desc(medicalConditions.createdAt));
  }

  async getMedicalConditionById(id: string): Promise<MedicalCondition | undefined> {
    const [result] = await db.select().from(medicalConditions).where(eq(medicalConditions.id, id));
    return result || undefined;
  }

  async createMedicalCondition(condition: InsertMedicalCondition): Promise<MedicalCondition> {
    const [result] = await db.insert(medicalConditions).values(condition).returning();
    return result;
  }

  async updateMedicalCondition(id: string, updates: Partial<InsertMedicalCondition>): Promise<MedicalCondition | undefined> {
    const [result] = await db.update(medicalConditions).set(updates).where(eq(medicalConditions.id, id)).returning();
    return result || undefined;
  }

  async deleteMedicalCondition(id: string): Promise<void> {
    await db.delete(medicalConditions).where(eq(medicalConditions.id, id));
  }

  // Claims methods
  async getClaims(userId: string): Promise<Claim[]> {
    return db.select().from(claims).where(eq(claims.userId, userId)).orderBy(desc(claims.updatedAt));
  }

  async getClaim(id: string): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    return claim || undefined;
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    // Cast symptoms to proper array type if present
    const insertData = {
      ...claim,
      symptoms: claim.symptoms ? Array.from(claim.symptoms) : null,
    } as Parameters<typeof db.insert<typeof claims>>["0"] extends { values: (v: infer V) => unknown } ? V : never;
    const [result] = await db.insert(claims).values(insertData).returning();
    return result;
  }

  async updateClaim(id: string, updates: Partial<InsertClaim>): Promise<Claim | undefined> {
    const updateData: Record<string, unknown> = { ...updates, updatedAt: new Date() };
    if (updates.symptoms !== undefined) {
      updateData.symptoms = updates.symptoms ? (updates.symptoms as string[]) : null;
    }
    const [result] = await db.update(claims).set(updateData).where(eq(claims.id, id)).returning();
    return result || undefined;
  }

  async deleteClaim(id: string): Promise<void> {
    await db.delete(claims).where(eq(claims.id, id));
  }

  // Lay Statements methods
  async getLayStatements(userId: string): Promise<LayStatement[]> {
    return db.select().from(layStatements).where(eq(layStatements.userId, userId)).orderBy(desc(layStatements.createdAt));
  }

  async getLayStatementById(id: string): Promise<LayStatement | undefined> {
    const [result] = await db.select().from(layStatements).where(eq(layStatements.id, id));
    return result || undefined;
  }

  async getLayStatementsByClaim(claimId: string): Promise<LayStatement[]> {
    return db.select().from(layStatements).where(eq(layStatements.claimId, claimId)).orderBy(desc(layStatements.createdAt));
  }

  async createLayStatement(statement: InsertLayStatement): Promise<LayStatement> {
    const [result] = await db.insert(layStatements).values(statement).returning();
    return result;
  }

  async updateLayStatement(id: string, updates: Partial<InsertLayStatement>): Promise<LayStatement | undefined> {
    const [result] = await db.update(layStatements).set({ ...updates, updatedAt: new Date() }).where(eq(layStatements.id, id)).returning();
    return result || undefined;
  }

  async deleteLayStatement(id: string): Promise<void> {
    await db.delete(layStatements).where(eq(layStatements.id, id));
  }

  // Buddy Statements methods
  async getBuddyStatements(userId: string): Promise<BuddyStatement[]> {
    return db.select().from(buddyStatements).where(eq(buddyStatements.userId, userId)).orderBy(desc(buddyStatements.createdAt));
  }

  async getBuddyStatementById(id: string): Promise<BuddyStatement | undefined> {
    const [result] = await db.select().from(buddyStatements).where(eq(buddyStatements.id, id));
    return result || undefined;
  }

  async getBuddyStatementsByClaim(claimId: string): Promise<BuddyStatement[]> {
    return db.select().from(buddyStatements).where(eq(buddyStatements.claimId, claimId)).orderBy(desc(buddyStatements.createdAt));
  }

  async createBuddyStatement(statement: InsertBuddyStatement): Promise<BuddyStatement> {
    const [result] = await db.insert(buddyStatements).values(statement).returning();
    return result;
  }

  async updateBuddyStatement(id: string, updates: Partial<InsertBuddyStatement>): Promise<BuddyStatement | undefined> {
    const [result] = await db.update(buddyStatements).set(updates).where(eq(buddyStatements.id, id)).returning();
    return result || undefined;
  }

  async deleteBuddyStatement(id: string): Promise<void> {
    await db.delete(buddyStatements).where(eq(buddyStatements.id, id));
  }

  // Documents methods
  async getDocuments(userId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.uploadedAt));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [result] = await db.select().from(documents).where(eq(documents.id, id));
    return result || undefined;
  }

  async getDocumentsByClaim(claimId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.claimId, claimId)).orderBy(desc(documents.uploadedAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [result] = await db.insert(documents).values(document).returning();
    return result;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Appeals methods
  async getAppeals(userId: string): Promise<Appeal[]> {
    return db.select().from(appeals).where(eq(appeals.userId, userId)).orderBy(desc(appeals.updatedAt));
  }

  async getAppeal(id: string): Promise<Appeal | undefined> {
    const [appeal] = await db.select().from(appeals).where(eq(appeals.id, id));
    return appeal || undefined;
  }

  async createAppeal(appeal: InsertAppeal): Promise<Appeal> {
    const [result] = await db.insert(appeals).values(appeal).returning();
    return result;
  }

  async updateAppeal(id: string, updates: Partial<InsertAppeal>): Promise<Appeal | undefined> {
    const [result] = await db.update(appeals).set({ ...updates, updatedAt: new Date() }).where(eq(appeals.id, id)).returning();
    return result || undefined;
  }

  async deleteAppeal(id: string): Promise<void> {
    await db.delete(appeals).where(eq(appeals.id, id));
  }

  // Referral methods
  async getReferrals(userId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
  }

  async getReferralById(id: string): Promise<Referral | undefined> {
    const [result] = await db.select().from(referrals).where(eq(referrals.id, id));
    return result || undefined;
  }

  async getReferralByCode(code: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    return referral || undefined;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [result] = await db.insert(referrals).values(referral).returning();
    return result;
  }

  async updateReferral(id: string, updates: Partial<InsertReferral>): Promise<Referral | undefined> {
    const [result] = await db.update(referrals).set(updates).where(eq(referrals.id, id)).returning();
    return result || undefined;
  }

  async deleteReferral(id: string): Promise<boolean> {
    const result = await db.delete(referrals).where(eq(referrals.id, id)).returning();
    return result.length > 0;
  }

  async getReferralStats(userId: string): Promise<{ total: number; converted: number; rewards: number }> {
    const userReferrals = await this.getReferrals(userId);
    const converted = userReferrals.filter(r => r.status === "registered" || r.status === "claimed_filed" || r.status === "rewarded");
    const totalRewards = userReferrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
    return { total: userReferrals.length, converted: converted.length, rewards: totalRewards };
  }

  // Consultation methods
  async getConsultations(userId?: string): Promise<Consultation[]> {
    if (userId) {
      return db.select().from(consultations).where(eq(consultations.userId, userId)).orderBy(desc(consultations.scheduledDate));
    }
    return db.select().from(consultations).orderBy(desc(consultations.scheduledDate));
  }

  async getConsultation(id: string): Promise<Consultation | undefined> {
    const [consultation] = await db.select().from(consultations).where(eq(consultations.id, id));
    return consultation || undefined;
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const [result] = await db.insert(consultations).values(consultation).returning();
    return result;
  }

  async updateConsultation(id: string, updates: Partial<InsertConsultation>): Promise<Consultation | undefined> {
    const [result] = await db.update(consultations).set(updates).where(eq(consultations.id, id)).returning();
    return result || undefined;
  }

  async cancelConsultation(id: string): Promise<Consultation | undefined> {
    const [result] = await db.update(consultations).set({ status: "cancelled" }).where(eq(consultations.id, id)).returning();
    return result || undefined;
  }

  // Site Stats methods
  async getStat(key: string): Promise<number> {
    const [stat] = await db.select().from(siteStats).where(eq(siteStats.key, key));
    return stat?.value ?? 0;
  }

  async incrementStat(key: string): Promise<number> {
    const [stat] = await db
      .update(siteStats)
      .set({ 
        value: sql`${siteStats.value} + 1`,
        updatedAt: new Date()
      })
      .where(eq(siteStats.key, key))
      .returning();
    
    if (!stat) {
      // If stat doesn't exist, create it with value 1
      const [newStat] = await db.insert(siteStats).values({ key, value: 1 }).returning();
      return newStat.value;
    }
    return stat.value;
  }

  async initializeStat(key: string, value: number): Promise<void> {
    const existing = await db.select().from(siteStats).where(eq(siteStats.key, key));
    if (existing.length === 0) {
      await db.insert(siteStats).values({ key, value });
    }
  }

  // Stripe methods - query from stripe schema
  async getStripeProducts() {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = true ORDER BY created DESC`
    );
    return result.rows;
  }

  async getStripePrices() {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = true ORDER BY created DESC`
    );
    return result.rows;
  }

  async getStripeProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async getStripeSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }
}

export const storage = new DatabaseStorage();
