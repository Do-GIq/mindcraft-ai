-- CreateTable
CREATE TABLE `AiGeneration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `documentId` INTEGER NULL,
    `provider` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `status` ENUM('SUCCESS', 'FAILED', 'ABORTED') NOT NULL,
    `inputChars` INTEGER NOT NULL,
    `outputChars` INTEGER NOT NULL DEFAULT 0,
    `firstTokenMs` INTEGER NULL,
    `durationMs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiGeneration_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AiGeneration_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiGeneration` ADD CONSTRAINT `AiGeneration_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiGeneration` ADD CONSTRAINT `AiGeneration_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
