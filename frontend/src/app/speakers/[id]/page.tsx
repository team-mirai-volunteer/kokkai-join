import { Suspense } from 'react';
import { Container, Paper, Skeleton, Box } from '@mui/material';
import { getSpeakerDetail } from '@/lib/actions/speaker-actions';
import { SpeakerHeader } from './components/SpeakerHeader';
import { SpeakerTabs } from './components/SpeakerTabs';

interface SpeakerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SpeakerDetailPage({ params }: SpeakerDetailPageProps) {
  const { id } = await params;
  const speaker = await getSpeakerDetail(id);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <SpeakerHeader speaker={speaker} />
      </Paper>

      <Suspense
        fallback={
          <Box>
            <Skeleton variant="rectangular" height={48} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={400} />
          </Box>
        }
      >
        <SpeakerTabs speaker={speaker} />
      </Suspense>
    </Container>
  );
}

export async function generateMetadata({ params }: SpeakerDetailPageProps) {
  const { id } = await params;
  const speaker = await getSpeakerDetail(id);

  return {
    title: `${speaker.displayName} - 発言者詳細 | 国会会議録検索`,
    description: `${speaker.displayName}の発言履歴、所属情報、統計データを表示`,
  };
}