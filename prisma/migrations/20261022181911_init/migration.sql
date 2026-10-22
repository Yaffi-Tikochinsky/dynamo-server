-- CreateEnum
CREATE TYPE "Scale" AS ENUM ('YES_NO', 'RATING');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "Avatar" AS ENUM ('LION', 'TIGER', 'FOX', 'PANDA', 'KOALA', 'OWL', 'PENGUIN', 'TURTLE', 'DOLPHIN', 'WHALE', 'OCTOPUS', 'BUTTERFLY', 'BEE', 'UNICORN', 'HORSE', 'RABBIT', 'CAT', 'DOG', 'ROCKET', 'STAR', 'SUN', 'MOON', 'RAINBOW', 'SUNFLOWER', 'TREE', 'CACTUS', 'MOUNTAIN', 'BOOK', 'GUITAR', 'SOCCER');

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "joinCode" VARCHAR(12) NOT NULL,
    "managerId" INTEGER,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" VARCHAR(30) NOT NULL,
    "avatar" "Avatar" NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "description" VARCHAR(500),
    "scale" "Scale" NOT NULL,
    "visibility" "Visibility" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "prize" VARCHAR(100),
    "joinWindowDays" INTEGER,
    "previousChallengeId" INTEGER,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "challengeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "firstDay" DATE NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("challengeId","userId")
);

-- CreateTable
CREATE TABLE "Report" (
    "challengeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "value" INTEGER NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("challengeId","userId","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_joinCode_key" ON "Group"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "Group_managerId_key" ON "Group"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Challenge_groupId_idx" ON "Challenge"("groupId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_previousChallengeId_fkey" FOREIGN KEY ("previousChallengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_challengeId_userId_fkey" FOREIGN KEY ("challengeId", "userId") REFERENCES "Participant"("challengeId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
