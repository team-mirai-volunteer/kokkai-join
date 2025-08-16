import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Button,
  Divider,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack,
  CalendarToday,
  Person,
  Home,
  PictureAsPdf,
  OpenInNew,
} from '@mui/icons-material';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { getMeetingDetail } from '@/lib/actions/meeting-actions';
import { formatMeetingDate } from '@/lib/utils/date';
import type { Metadata } from 'next';

interface MeetingDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: MeetingDetailPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const meeting = await getMeetingDetail(id);

    if (!meeting) {
      return {
        title: '会議録が見つかりません | 国会ジョイン',
        description: '指定された会議録が見つかりませんでした。',
      };
    }

    return {
      title: `${meeting.nameOfMeeting} - 第${meeting.session}回国会 | 国会ジョイン`,
      description: `${meeting.nameOfHouse}の${meeting.nameOfMeeting}（${formatMeetingDate(meeting.date.toString())}開催）の会議録詳細ページです。`,
      openGraph: {
        title: meeting.nameOfMeeting,
        description: `第${meeting.session}回国会 ${meeting.nameOfHouse}`,
        type: 'article',
      },
    };
  } catch {
    return {
      title: 'エラー | 国会ジョイン',
      description: '会議録の取得中にエラーが発生しました。',
    };
  }
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  try {
    const { id } = await params;
    const meeting = await getMeetingDetail(id);

    if (!meeting) {
      notFound();
    }

    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* パンくずリスト */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component={NextLink}
            href="/"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <Home sx={{ mr: 0.5, fontSize: 16 }} />
            ホーム
          </Link>
          <Typography color="text.primary">会議録詳細</Typography>
        </Breadcrumbs>

        {/* 戻るボタン */}
        <Button
          component={NextLink}
          href="/"
          startIcon={<ArrowBack />}
          sx={{ mb: 3 }}
          variant="outlined"
        >
          トップページに戻る
        </Button>

        {/* 会議録ヘッダー */}
        <Paper sx={{ p: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip label={meeting.nameOfHouse} color="primary" />
            <Chip label={`第${meeting.session}回国会`} variant="outlined" />
            {meeting.issue && <Chip label={meeting.issue} variant="outlined" />}
          </Box>

          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            {meeting.nameOfMeeting}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarToday sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                {formatMeetingDate(meeting.date.toString())}
              </Typography>
            </Box>

            {meeting.speeches && meeting.speeches.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  {(() => {
                    const speakers = meeting.speeches.map((speech) => speech.rawSpeaker);
                    // システム情報を除外して実際の発言者のみをカウント
                    const actualSpeakers = speakers.filter(
                      (speaker) =>
                        speaker &&
                        speaker.trim() !== '' &&
                        speaker !== '会議録情報' &&
                        !speaker.includes('情報')
                    );
                    const uniqueSpeakers = new Set(actualSpeakers);
                    const speakerCount = uniqueSpeakers.size;
                    const speechCount = meeting.speeches.length;

                    return `${speakerCount}人で${speechCount}発言`;
                  })()}
                </Typography>
              </Box>
            )}
          </Box>

          {/* 外部リンク */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {meeting.meetingURL && (
              <Button
                variant="contained"
                startIcon={<OpenInNew />}
                href={meeting.meetingURL}
                target="_blank"
                rel="noopener noreferrer"
              >
                元の会議録を開く
              </Button>
            )}

            {meeting.pdfURL && (
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                href={meeting.pdfURL}
                target="_blank"
                rel="noopener noreferrer"
              >
                PDF版を開く
              </Button>
            )}
          </Box>
        </Paper>

        {/* 発言一覧 */}
        {meeting.speeches && meeting.speeches.length > 0 ? (
          <Box>
            <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
              発言一覧
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {meeting.speeches.map((speech) => (
                <Paper key={speech.speechID} sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Box>
                      {speech.speaker ? (
                        <Link
                          component={NextLink}
                          href={`/speakers/${speech.speaker.id}`}
                          sx={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <Typography 
                            variant="h6" 
                            component="h3" 
                            sx={{ 
                              fontWeight: 'bold',
                              '&:hover': { color: 'primary.main' }
                            }}
                          >
                            {speech.speaker.displayName}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                          {speech.rawSpeaker}
                        </Typography>
                      )}
                      {speech.rawSpeakerPosition && (
                        <Typography variant="body2" color="text.secondary">
                          {speech.rawSpeakerPosition}
                        </Typography>
                      )}
                      {speech.rawSpeakerGroup && (
                        <Typography variant="body2" color="text.secondary">
                          {speech.rawSpeakerGroup}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        発言{speech.speechOrder}
                      </Typography>
                      {speech.startPage && (
                        <Typography variant="caption" color="text.secondary">
                          {speech.startPage}ページ
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {speech.speech && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography
                        variant="body1"
                        sx={{
                          lineHeight: 1.8,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {speech.speech}
                      </Typography>
                    </>
                  )}

                  <Box sx={{ mt: 2, textAlign: 'right' }}>
                    {speech.speechURL && (
                      <Button
                        size="small"
                        variant="text"
                        endIcon={<OpenInNew />}
                        href={speech.speechURL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        この発言の詳細
                      </Button>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 4 }}>
            この会議録には発言データが含まれていません。
            {meeting.meetingURL && (
              <Button
                variant="text"
                href={meeting.meetingURL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ ml: 2 }}
              >
                元の会議録で確認する
              </Button>
            )}
          </Alert>
        )}
      </Container>
    );
  } catch (error) {
    console.error('Failed to load meeting detail:', error);
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          会議録の読み込み中にエラーが発生しました。
          <Button component={NextLink} href="/" sx={{ ml: 2 }}>
            トップページに戻る
          </Button>
        </Alert>
      </Container>
    );
  }
}
