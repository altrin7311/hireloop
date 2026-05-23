import {
  pgTable,
  pgSchema,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  vector,
  index,
} from "drizzle-orm/pg-core";

export const EMBEDDING_DIMENSIONS = 768;

// Supabase Auth lives in the `auth` schema. Drizzle never creates this — only references it.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const userCredits = pgTable("user_credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(2),
  totalPurchased: integer("total_purchased").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  applicationId: uuid("application_id"),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  targetRoles: text("target_roles").array(),
  targetLocations: text("target_locations").array(),
  seniorityLevel: text("seniority_level"),
  industries: text("industries").array(),
  excludeCompanies: text("exclude_companies").array(),
  tonePreference: text("tone_preference"),
  alwaysEmphasize: text("always_emphasize").array(),
  neverMention: text("never_mention").array(),
  salaryExpectation: text("salary_expectation"),
  noticePeriod: text("notice_period"),
  workAuthorization: boolean("work_authorization"),
  requiresSponsorship: boolean("requires_sponsorship"),
  preferredName: text("preferred_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  autoApply: boolean("auto_apply").notNull().default(false),
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    sourceFile: text("source_file").notNull(),
    fileId: uuid("file_id").notNull(),
    chunkType: text("chunk_type").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    wordCount: integer("word_count").notNull(),
    pineconeId: text("pinecone_id"),
    fileType: text("file_type").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    embeddingIndex: index("document_chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    userIdIdx: index("document_chunks_user_id_idx").on(t.userId),
  }),
);

export const jobListings = pgTable(
  "job_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: text("platform").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    remote: boolean("remote").notNull().default(false),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    description: text("description"),
    applicationUrl: text("application_url").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
    isGhost: boolean("is_ghost").notNull().default(false),
    ghostReason: text("ghost_reason"),
    applicantCount: integer("applicant_count"),
  },
  (t) => ({
    platformExternalUnique: unique("job_listings_platform_external_id_unique").on(
      t.platform,
      t.externalId,
    ),
  }),
);

export const userJobScores = pgTable(
  "user_job_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobListings.id, { onDelete: "cascade" }),
    matchScore: integer("match_score").notNull(),
    matchedSkills: text("matched_skills").array(),
    missingSkills: text("missing_skills").array(),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userJobUnique: unique("user_job_scores_user_id_job_id_unique").on(t.userId, t.jobId),
  }),
);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobListings.id, { onDelete: "restrict" }),
  tailoredCv: jsonb("tailored_cv"),
  coverLetter: text("cover_letter"),
  qaReport: jsonb("qa_report"),
  matchScore: integer("match_score"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  submissionStatus: text("submission_status").notNull().default("pending"),
  interviewStatus: text("interview_status").notNull().default("pending"),
  creditsUsed: integer("credits_used").notNull().default(1),
  platform: text("platform").notNull(),
  notes: text("notes"),
});

export type UserCredits = typeof userCredits.$inferSelect;
export type NewUserCredits = typeof userCredits.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type JobListing = typeof jobListings.$inferSelect;
export type NewJobListing = typeof jobListings.$inferInsert;
export type UserJobScore = typeof userJobScores.$inferSelect;
export type NewUserJobScore = typeof userJobScores.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
