-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmenname" TEXT NOT NULL,
    "ansprechpartner" TEXT NOT NULL,
    "anrede" TEXT,
    "telefon" TEXT NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "branche" TEXT,
    "ort" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'neu',
    "notizen" TEXT,
    "produkt" TEXT,
    "letzterAnruf" DATETIME,
    "anrufVersuche" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dauer" INTEGER,
    "ergebnis" TEXT NOT NULL,
    "notiz" TEXT,
    "twilioSid" TEXT,
    CONSTRAINT "Call_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_branche_idx" ON "Lead"("branche");

-- CreateIndex
CREATE INDEX "Lead_telefon_idx" ON "Lead"("telefon");

-- CreateIndex
CREATE INDEX "Call_leadId_idx" ON "Call"("leadId");

-- CreateIndex
CREATE INDEX "Call_datum_idx" ON "Call"("datum");
