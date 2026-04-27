-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbId" INTEGER,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "posterPath" TEXT,
    "genres" TEXT NOT NULL DEFAULT '[]',
    "streamingPlatforms" TEXT NOT NULL DEFAULT '[]',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchedAt" DATETIME,
    "overview" TEXT,
    "runtime" INTEGER,
    "streamingInfo" TEXT NOT NULL DEFAULT '[]',
    "streamingUpdatedAt" DATETIME,
    "addedById" INTEGER NOT NULL,
    CONSTRAINT "Movie_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("addedAt", "addedById", "genres", "id", "posterPath", "streamingPlatforms", "title", "tmdbId", "watchedAt", "year") SELECT "addedAt", "addedById", "genres", "id", "posterPath", "streamingPlatforms", "title", "tmdbId", "watchedAt", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
