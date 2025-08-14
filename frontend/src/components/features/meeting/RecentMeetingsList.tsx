import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Stack
} from '@mui/material'
import { 
  CalendarToday, 
  Description,
  RecordVoiceOver 
} from '@mui/icons-material'
import NextLink from 'next/link'
import type { RecentMeeting } from '@/lib/types/api'

interface RecentMeetingsListProps {
  meetings: RecentMeeting[]
}

export function RecentMeetingsList({ meetings }: RecentMeetingsListProps) {

  if (meetings.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          会議録が見つかりませんでした
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
        最近の会議録
      </Typography>
      
      <Stack 
        direction="row" 
        flexWrap="wrap" 
        spacing={3} 
        justifyContent="flex-start"
        useFlexGap
      >
        {meetings.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </Stack>
    </Box>
  )
}

function MeetingCard({ meeting }: { meeting: RecentMeeting }) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <Card 
      component={NextLink}
      href={`/meeting/${meeting.id}`}
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'left' }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Chip 
            label={meeting.house} 
            size="small" 
            color="primary"
            variant="outlined"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
            <CalendarToday sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption">
              {formatDate(meeting.date)}
            </Typography>
          </Box>
        </Box>

        {/* タイトル */}
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom
          sx={{
            fontWeight: 600,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          {meeting.title}
        </Typography>

        {/* メタ情報 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            {meeting.session}
          </Typography>
          {meeting.issue && (
            <Typography variant="body2" color="text.secondary">
              {meeting.issue}
            </Typography>
          )}
          {meeting.speechCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <RecordVoiceOver sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {meeting.speechCount}発言
              </Typography>
            </Box>
          )}
        </Box>

        {/* クリックして詳細へ */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
          <Description sx={{ fontSize: 16, mr: 0.5 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            詳細を見る
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

