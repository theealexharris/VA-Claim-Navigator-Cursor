import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Subscription tier enum
export const subscriptionTierEnum = pgEnum("subscription_tier", ["starter", "pro", "deluxe", "business"]);

// User role enum
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  avatarUrl: text("avatar_url"),
  vaId: text("va_id"),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("starter").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  profileCompleted: boolean("profile_completed").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Service History
export const serviceHistory = pgTable("service_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branch: text("branch").notNull(),
  component: text("component").notNull(),
  dateEntered: timestamp("date_entered").notNull(),
  dateSeparated: timestamp("date_separated"),
  mos: text("mos"),
  deployments: jsonb("deployments").$type<Array<{location: string, startDate: string, endDate: string}>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical Conditions
export const medicalConditions = pgTable("medical_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conditionName: text("condition_name").notNull(),
  diagnosedDate: timestamp("diagnosed_date"),
  provider: text("provider"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Claims
export const claimStatusEnum = pgEnum("claim_status", ["draft", "in_progress", "submitted", "approved", "denied"]);

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conditionName: text("condition_name").notNull(),
  status: claimStatusEnum("status").default("draft").notNull(),
  dateOfOnset: timestamp("date_of_onset"),
  severity: text("severity"),
  symptoms: jsonb("symptoms").$type<string[]>(),
  serviceConnectionType: text("service_connection_type"),
  incidentDetails: text("incident_details"),
  functionalImpact: text("functional_impact"),
  completionPercentage: integer("completion_percentage").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lay Statements
export const layStatements = pgTable("lay_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimId: varchar("claim_id").references(() => claims.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Buddy Statements
export const buddyStatementStatusEnum = pgEnum("buddy_statement_status", ["pending", "completed", "sent"]);

export const buddyStatements = pgTable("buddy_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimId: varchar("claim_id").references(() => claims.id, { onDelete: "cascade" }),
  buddyName: text("buddy_name").notNull(),
  buddyEmail: text("buddy_email").notNull(),
  relationship: text("relationship").notNull(),
  conditionDescription: text("condition_description").notNull(),
  status: buddyStatementStatusEnum("status").default("pending").notNull(),
  content: text("content"),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Evidence/Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimId: varchar("claim_id").references(() => claims.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  category: text("category"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Referral Program
export const referralStatusEnum = pgEnum("referral_status", ["pending", "registered", "claimed_filed", "rewarded"]);

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  referredEmail: text("referred_email"),
  referredUserId: varchar("referred_user_id").references(() => users.id),
  status: referralStatusEnum("status").default("pending").notNull(),
  rewardAmount: integer("reward_amount").default(0),
  rewardPaidAt: timestamp("reward_paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  convertedAt: timestamp("converted_at"),
});

// Consultation Bookings
export const consultationStatusEnum = pgEnum("consultation_status", ["scheduled", "completed", "cancelled", "no_show"]);
export const consultationTypeEnum = pgEnum("consultation_type", ["initial_rating", "rating_increase", "appeal_strategy", "general_guidance"]);

export const consultations = pgTable("consultations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  consultationType: consultationTypeEnum("consultation_type").notNull(),
  currentRating: text("current_rating"),
  branchOfService: text("branch_of_service"),
  dischargeType: text("discharge_type"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  timezone: text("timezone").default("America/New_York"),
  status: consultationStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appeals
export const appealTypeEnum = pgEnum("appeal_type", ["supplemental", "higher_level_review", "board_appeal"]);
export const appealStatusEnum = pgEnum("appeal_status", ["draft", "submitted", "pending", "approved", "denied"]);

export const appeals = pgTable("appeals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimId: varchar("claim_id").references(() => claims.id, { onDelete: "cascade" }),
  type: appealTypeEnum("type").notNull(),
  status: appealStatusEnum("status").default("draft").notNull(),
  reason: text("reason").notNull(),
  newEvidence: text("new_evidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  serviceHistory: many(serviceHistory),
  medicalConditions: many(medicalConditions),
  claims: many(claims),
  layStatements: many(layStatements),
  buddyStatements: many(buddyStatements),
  documents: many(documents),
  appeals: many(appeals),
  referralsMade: many(referrals, { relationName: "referrer" }),
  consultations: many(consultations),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id], relationName: "referrer" }),
  referredUser: one(users, { fields: [referrals.referredUserId], references: [users.id] }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  user: one(users, { fields: [consultations.userId], references: [users.id] }),
}));

export const serviceHistoryRelations = relations(serviceHistory, ({ one }) => ({
  user: one(users, { fields: [serviceHistory.userId], references: [users.id] }),
}));

export const medicalConditionsRelations = relations(medicalConditions, ({ one }) => ({
  user: one(users, { fields: [medicalConditions.userId], references: [users.id] }),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  user: one(users, { fields: [claims.userId], references: [users.id] }),
  layStatements: many(layStatements),
  buddyStatements: many(buddyStatements),
  documents: many(documents),
  appeals: many(appeals),
}));

export const layStatementsRelations = relations(layStatements, ({ one }) => ({
  user: one(users, { fields: [layStatements.userId], references: [users.id] }),
  claim: one(claims, { fields: [layStatements.claimId], references: [claims.id] }),
}));

export const buddyStatementsRelations = relations(buddyStatements, ({ one }) => ({
  user: one(users, { fields: [buddyStatements.userId], references: [users.id] }),
  claim: one(claims, { fields: [buddyStatements.claimId], references: [claims.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  claim: one(claims, { fields: [documents.claimId], references: [claims.id] }),
}));

export const appealsRelations = relations(appeals, ({ one }) => ({
  user: one(users, { fields: [appeals.userId], references: [users.id] }),
  claim: one(claims, { fields: [appeals.claimId], references: [claims.id] }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertServiceHistorySchema = createInsertSchema(serviceHistory).omit({ id: true, createdAt: true });
export const insertMedicalConditionSchema = createInsertSchema(medicalConditions).omit({ id: true, createdAt: true });
export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLayStatementSchema = createInsertSchema(layStatements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBuddyStatementSchema = createInsertSchema(buddyStatements).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertAppealSchema = createInsertSchema(appeals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertConsultationSchema = createInsertSchema(consultations).omit({ id: true, createdAt: true });

// Site Stats (for counters like vets served)
export const siteStats = pgTable("site_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: integer("value").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSiteStatsSchema = createInsertSchema(siteStats).omit({ id: true, updatedAt: true });
export type SiteStats = typeof siteStats.$inferSelect;
export type InsertSiteStats = z.infer<typeof insertSiteStatsSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = z.infer<typeof insertServiceHistorySchema>;
export type MedicalCondition = typeof medicalConditions.$inferSelect;
export type InsertMedicalCondition = z.infer<typeof insertMedicalConditionSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type LayStatement = typeof layStatements.$inferSelect;
export type InsertLayStatement = z.infer<typeof insertLayStatementSchema>;
export type BuddyStatement = typeof buddyStatements.$inferSelect;
export type InsertBuddyStatement = z.infer<typeof insertBuddyStatementSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = z.infer<typeof insertAppealSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
