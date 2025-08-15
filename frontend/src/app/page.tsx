import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Divider,
  Alert,
} from '@mui/material'
import { Search, Book, People, Storage } from '@mui/icons-material'
import SearchButton from './components/SearchButton'
import Link from 'next/link'
import { getRecentMeetings, getDatabaseStats } from '@/lib/actions/meeting-actions'
import { RecentMeetingsList } from '@/components/features/meeting'
import { formatDateShort } from '@/lib/utils/date'

export default async function Home() {
  const stats = await getDatabaseStats()

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ヒーローセクション */}
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          国会ジョイン
        </Typography>
        <Typography variant="h4" component="h2" color="text.secondary" sx={{ mb: 3 }}>
          国会議論プラットフォーム
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6, mb: 4 }}
        >
          国会会議録を使いやすいUI/UXで表示し、国民が議論に参加したり、
          国会の議題に対して見識を深めるためのプラットフォームです。
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <SearchButton />
          <Button
            variant="outlined"
            size="large"
            startIcon={<Book />}
            sx={{ minWidth: 200 }}
            component={Link}
            href="/guide"
          >
            使い方を学ぶ
          </Button>
        </Box>
      </Box>

      {/* データベース統計 */}
      {stats && (
        <Box sx={{ mb: 4 }}>
          <Alert severity="info" icon={<Storage />}>
            <Typography variant="body2">
              データベース: {stats.totalMeetings.toLocaleString()}件の会議録、
              {stats.totalSpeeches.toLocaleString()}件の発言を保存済み
              {stats.oldestMeeting && stats.newestMeeting && (
                <span>
                  （{formatDateShort(stats.oldestMeeting.date.toISOString())} 〜
                  {formatDateShort(stats.newestMeeting.date.toISOString())}）
                </span>
              )}
            </Typography>
          </Alert>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* 最近の会議録セクション */}
      <Box sx={{ mb: 4 }}>
        <RecentMeetingsSection />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* 機能紹介セクション */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
          主な機能
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 1000,
            mx: 'auto',
          }}
        >
          <Card sx={{ minWidth: 280, flex: 1, maxWidth: 320 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Search color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" component="h3" gutterBottom>
                高度な検索機能
              </Typography>
              <Typography variant="body2" color="text.secondary">
                キーワード、発言者、日付、院などの条件で効率的に会議録を検索
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 280, flex: 1, maxWidth: 320 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Book color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" component="h3" gutterBottom>
                分かりやすい表示
              </Typography>
              <Typography variant="body2" color="text.secondary">
                会議録の内容を読みやすく整理し、重要な情報をハイライト表示
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 280, flex: 1, maxWidth: 320 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <People color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" component="h3" gutterBottom>
                議論への参加
              </Typography>
              <Typography variant="body2" color="text.secondary">
                会議録に対してコメントや投票を通じて、民主的な議論に参加
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  )
}

// Server Componentとして最近の会議録を取得・表示
async function RecentMeetingsSection() {
  try {
    const meetings = await getRecentMeetings(18)

    if (meetings.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 2 }}>
            最近の会議録
          </Typography>
          <Alert severity="warning">
            データベースに会議録が保存されていません。 まず `bun run sync:data`
            コマンドでデータを同期してください。
          </Alert>
        </Box>
      )
    }

    return <RecentMeetingsList meetings={meetings} />
  } catch (error) {
    console.error('Failed to load recent meetings:', error)
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 2 }}>
          最近の会議録
        </Typography>
        <Alert severity="error">
          会議録の取得に失敗しました。データベース接続を確認してください。
        </Alert>
      </Box>
    )
  }
}
