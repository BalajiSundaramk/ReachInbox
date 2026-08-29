-- CreateTable
CREATE TABLE `SlackConnection` (
    `id` CHAR(36) NOT NULL,
    `scopeKey` VARCHAR(191) NOT NULL DEFAULT 'global',
    `teamId` VARCHAR(191) NOT NULL,
    `teamName` VARCHAR(191) NULL,
    `channelId` VARCHAR(191) NULL,
    `channelName` VARCHAR(191) NULL,
    `accessTokenEncrypted` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SlackConnection_scopeKey_key`(`scopeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
