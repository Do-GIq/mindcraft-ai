-- CreateTable
CREATE TABLE `KnowledgeFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeFile_projectId_createdAt_idx`(`projectId`, `createdAt`),
    INDEX `KnowledgeFile_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeChunk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `knowledgeFileId` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `chunkIndex` INTEGER NOT NULL,
    `vectorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `KnowledgeChunk_vectorId_key`(`vectorId`),
    UNIQUE INDEX `KnowledgeChunk_knowledgeFileId_chunkIndex_key`(`knowledgeFileId`, `chunkIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KnowledgeFile` ADD CONSTRAINT `KnowledgeFile_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeFile` ADD CONSTRAINT `KnowledgeFile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeChunk` ADD CONSTRAINT `KnowledgeChunk_knowledgeFileId_fkey` FOREIGN KEY (`knowledgeFileId`) REFERENCES `KnowledgeFile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
