-- Preserve all existing Step 2 fields and make ownership details optional for
-- scheduler records created before user authentication is implemented.
ALTER TABLE `email`
  MODIFY `userId` CHAR(36) NULL,
  MODIFY `senderId` CHAR(36) NULL,
  MODIFY `recipient` VARCHAR(191) NULL,
  MODIFY `idempotencyKey` VARCHAR(191) NULL,
  ADD COLUMN `errorMessage` TEXT NULL,
  ADD COLUMN `failedAt` DATETIME(3) NULL,
  ADD COLUMN `jobId` VARCHAR(191) NULL,
  ADD COLUMN `recipientEmail` VARCHAR(191) NULL,
  ADD COLUMN `senderEmail` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Email_jobId_key` ON `Email`(`jobId`);

-- CreateIndex
CREATE INDEX `Email_recipientEmail_idx` ON `Email`(`recipientEmail`);

-- CreateIndex
CREATE INDEX `Email_createdAt_idx` ON `Email`(`createdAt`);
