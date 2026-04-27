-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "watchedAt" DATETIME;

-- CreateTable
CREATE TABLE "WatchedVote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vote" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    CONSTRAINT "WatchedVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WatchedVote_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchedVote_userId_movieId_key" ON "WatchedVote"("userId", "movieId");
