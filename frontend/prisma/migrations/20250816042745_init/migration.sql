-- CreateTable
CREATE TABLE "public"."Meeting" (
    "id" TEXT NOT NULL,
    "issueID" TEXT NOT NULL,
    "imageKind" TEXT,
    "searchObject" INTEGER,
    "session" INTEGER NOT NULL,
    "nameOfHouse" TEXT NOT NULL,
    "nameOfMeeting" TEXT NOT NULL,
    "issue" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "closing" TEXT,
    "meetingURL" TEXT,
    "pdfURL" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Speaker" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "nameYomi" TEXT,
    "firstSpeechDate" TIMESTAMP(3),
    "lastSpeechDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpeakerAlias" (
    "id" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "aliasName" TEXT NOT NULL,
    "aliasYomi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."House" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpeakerRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakerRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpeakerAffiliation" (
    "id" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "partyGroupId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakerAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Speech" (
    "id" TEXT NOT NULL,
    "speechID" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "speakerId" TEXT,
    "affiliationId" TEXT,
    "positionId" TEXT,
    "roleId" TEXT,
    "rawSpeaker" TEXT NOT NULL,
    "rawSpeakerYomi" TEXT,
    "rawSpeakerGroup" TEXT,
    "rawSpeakerPosition" TEXT,
    "rawSpeakerRole" TEXT,
    "speechOrder" INTEGER NOT NULL,
    "speech" TEXT NOT NULL,
    "startPage" INTEGER,
    "speechURL" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Speech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncHistory" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "totalRecords" INTEGER,
    "processedRecords" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SearchCache" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_issueID_key" ON "public"."Meeting"("issueID");

-- CreateIndex
CREATE INDEX "Meeting_date_idx" ON "public"."Meeting"("date");

-- CreateIndex
CREATE INDEX "Meeting_session_idx" ON "public"."Meeting"("session");

-- CreateIndex
CREATE INDEX "Meeting_nameOfHouse_idx" ON "public"."Meeting"("nameOfHouse");

-- CreateIndex
CREATE INDEX "Meeting_nameOfMeeting_idx" ON "public"."Meeting"("nameOfMeeting");

-- CreateIndex
CREATE INDEX "Speaker_normalizedName_idx" ON "public"."Speaker"("normalizedName");

-- CreateIndex
CREATE INDEX "Speaker_nameYomi_idx" ON "public"."Speaker"("nameYomi");

-- CreateIndex
CREATE INDEX "Speaker_displayName_idx" ON "public"."Speaker"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Speaker_normalizedName_key" ON "public"."Speaker"("normalizedName");

-- CreateIndex
CREATE INDEX "SpeakerAlias_speakerId_idx" ON "public"."SpeakerAlias"("speakerId");

-- CreateIndex
CREATE INDEX "SpeakerAlias_aliasName_idx" ON "public"."SpeakerAlias"("aliasName");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerAlias_aliasName_aliasYomi_key" ON "public"."SpeakerAlias"("aliasName", "aliasYomi");

-- CreateIndex
CREATE UNIQUE INDEX "House_name_key" ON "public"."House"("name");

-- CreateIndex
CREATE INDEX "House_name_idx" ON "public"."House"("name");

-- CreateIndex
CREATE INDEX "PartyGroup_name_idx" ON "public"."PartyGroup"("name");

-- CreateIndex
CREATE INDEX "PartyGroup_isActive_idx" ON "public"."PartyGroup"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartyGroup_name_key" ON "public"."PartyGroup"("name");

-- CreateIndex
CREATE INDEX "Position_name_idx" ON "public"."Position"("name");

-- CreateIndex
CREATE INDEX "Position_category_idx" ON "public"."Position"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "public"."Position"("name");

-- CreateIndex
CREATE INDEX "SpeakerRole_name_idx" ON "public"."SpeakerRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerRole_name_key" ON "public"."SpeakerRole"("name");

-- CreateIndex
CREATE INDEX "SpeakerAffiliation_speakerId_idx" ON "public"."SpeakerAffiliation"("speakerId");

-- CreateIndex
CREATE INDEX "SpeakerAffiliation_partyGroupId_idx" ON "public"."SpeakerAffiliation"("partyGroupId");

-- CreateIndex
CREATE INDEX "SpeakerAffiliation_startDate_idx" ON "public"."SpeakerAffiliation"("startDate");

-- CreateIndex
CREATE INDEX "SpeakerAffiliation_endDate_idx" ON "public"."SpeakerAffiliation"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Speech_speechID_key" ON "public"."Speech"("speechID");

-- CreateIndex
CREATE INDEX "Speech_meetingId_idx" ON "public"."Speech"("meetingId");

-- CreateIndex
CREATE INDEX "Speech_speakerId_idx" ON "public"."Speech"("speakerId");

-- CreateIndex
CREATE INDEX "Speech_affiliationId_idx" ON "public"."Speech"("affiliationId");

-- CreateIndex
CREATE INDEX "Speech_positionId_idx" ON "public"."Speech"("positionId");

-- CreateIndex
CREATE INDEX "Speech_roleId_idx" ON "public"."Speech"("roleId");

-- CreateIndex
CREATE INDEX "Speech_rawSpeaker_idx" ON "public"."Speech"("rawSpeaker");

-- CreateIndex
CREATE INDEX "Speech_speechOrder_idx" ON "public"."Speech"("speechOrder");

-- CreateIndex
CREATE INDEX "SyncHistory_status_idx" ON "public"."SyncHistory"("status");

-- CreateIndex
CREATE INDEX "SyncHistory_syncType_idx" ON "public"."SyncHistory"("syncType");

-- CreateIndex
CREATE INDEX "SyncHistory_startedAt_idx" ON "public"."SyncHistory"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchCache_queryHash_key" ON "public"."SearchCache"("queryHash");

-- CreateIndex
CREATE INDEX "SearchCache_expiresAt_idx" ON "public"."SearchCache"("expiresAt");

-- CreateIndex
CREATE INDEX "SearchCache_hitCount_idx" ON "public"."SearchCache"("hitCount");

-- AddForeignKey
ALTER TABLE "public"."SpeakerAlias" ADD CONSTRAINT "SpeakerAlias_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "public"."Speaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpeakerAffiliation" ADD CONSTRAINT "SpeakerAffiliation_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "public"."Speaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpeakerAffiliation" ADD CONSTRAINT "SpeakerAffiliation_partyGroupId_fkey" FOREIGN KEY ("partyGroupId") REFERENCES "public"."PartyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Speech" ADD CONSTRAINT "Speech_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Speech" ADD CONSTRAINT "Speech_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "public"."Speaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Speech" ADD CONSTRAINT "Speech_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "public"."SpeakerAffiliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Speech" ADD CONSTRAINT "Speech_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Speech" ADD CONSTRAINT "Speech_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."SpeakerRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
