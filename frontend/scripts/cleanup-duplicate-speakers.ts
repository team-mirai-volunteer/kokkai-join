#!/usr/bin/env bun
import { prisma } from '../src/lib/prisma';

async function cleanupDuplicateSpeakers() {
  console.log('🧹 重複Speakerの削除を開始します...');

  // 重複したnormalizedNameを取得
  const duplicates = await prisma.speaker.groupBy({
    by: ['normalizedName', 'nameYomi'],
    having: {
      normalizedName: {
        _count: {
          gt: 1,
        },
      },
    },
    _count: {
      normalizedName: true,
    },
  });

  console.log(`重複グループ数: ${duplicates.length}`);

  let totalDeleted = 0;
  let totalMerged = 0;

  for (const dup of duplicates) {
    // 同じnormalizedName + nameYomiを持つSpeakerを取得
    const speakers = await prisma.speaker.findMany({
      where: {
        normalizedName: dup.normalizedName,
        nameYomi: dup.nameYomi,
      },
      include: {
        speeches: true,
        aliases: true,
      },
      orderBy: [{ speechCount: 'desc' }, { createdAt: 'asc' }],
    });

    if (speakers.length <= 1) continue;

    // 最初のSpeaker（最も発言数が多い、または作成日が早い）を残す
    const keepSpeaker = speakers[0];
    const duplicateSpeakers = speakers.slice(1);

    console.log(`\n統合: ${dup.normalizedName} (${duplicateSpeakers.length}件の重複)`);

    await prisma.$transaction(async (tx) => {
      // 重複したSpeakerの発言を統合先に移動
      for (const dupSpeaker of duplicateSpeakers) {
        if (dupSpeaker.speeches.length > 0) {
          await tx.speech.updateMany({
            where: { speakerId: dupSpeaker.id },
            data: { speakerId: keepSpeaker.id },
          });
        }

        // 重複したSpeakerの別名を統合先に移動（重複チェック付き）
        for (const alias of dupSpeaker.aliases) {
          try {
            await tx.speakerAlias.upsert({
              where: {
                aliasName_aliasYomi: {
                  aliasName: alias.aliasName,
                  aliasYomi: alias.aliasYomi,
                },
              },
              update: {
                speakerId: keepSpeaker.id,
              },
              create: {
                speakerId: keepSpeaker.id,
                aliasName: alias.aliasName,
                aliasYomi: alias.aliasYomi,
              },
            });
          } catch {
            // 既に存在する場合は無視
          }
        }

        // 重複したSpeakerを削除
        await tx.speaker.delete({
          where: { id: dupSpeaker.id },
        });

        totalDeleted++;
      }

      // 統合先のSpeakerの統計を更新
      const totalSpeeches = await tx.speech.count({
        where: { speakerId: keepSpeaker.id },
      });

      const firstSpeech = await tx.speech.findFirst({
        where: { speakerId: keepSpeaker.id },
        include: { meeting: true },
        orderBy: { meeting: { date: 'asc' } },
      });

      const lastSpeech = await tx.speech.findFirst({
        where: { speakerId: keepSpeaker.id },
        include: { meeting: true },
        orderBy: { meeting: { date: 'desc' } },
      });

      await tx.speaker.update({
        where: { id: keepSpeaker.id },
        data: {
          speechCount: totalSpeeches,
          firstSpeechDate: firstSpeech?.meeting.date || keepSpeaker.firstSpeechDate,
          lastSpeechDate: lastSpeech?.meeting.date || keepSpeaker.lastSpeechDate,
        },
      });

      totalMerged++;
    });
  }

  console.log(`\n✅ 削除完了:`);
  console.log(`  統合されたSpeaker: ${totalMerged}人`);
  console.log(`  削除されたレコード: ${totalDeleted}件`);

  await prisma.$disconnect();
}

cleanupDuplicateSpeakers().catch(console.error);
