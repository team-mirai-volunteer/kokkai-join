'use client'

import { Box, Card, CardContent, Typography, Chip, Button, Pagination, Stack } from '@mui/material'
import { CalendarToday, Person, OpenInNew } from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { buildSearchUrl } from '@/lib/utils/search-params'
import { PAGINATION } from '@/lib/constants'
import { formatDateShort } from '@/lib/utils/date'

interface Meeting {
  issueID: string
  nameOfMeeting: string
  nameOfHouse: string
  date: string
  session: string
  issue: string
  meetingURL: string
  pdfURL?: string
  speechCount?: number
}

interface SearchResultsProps {
  meetings: Meeting[]
  totalCount: number
  currentPage: number
  hasMore: boolean
  searchParams: {
    q?: string
    house?: string
    speaker?: string
    from?: string
    until?: string
  }
}

export function SearchResults({
  meetings,
  totalCount,
  currentPage,
  searchParams,
}: SearchResultsProps) {
  const router = useRouter()
  const totalPages = Math.ceil(totalCount / PAGINATION.DEFAULT_PAGE_SIZE)

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    const url = buildSearchUrl({
      ...searchParams,
      page,
    })

    router.push(url)
  }

  if (meetings.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        検索条件に一致する会議録が見つかりませんでした。
      </Typography>
    )
  }

  return (
    <Box>
      <Stack spacing={2}>
        {meetings.map((meeting) => (
          <Card key={meeting.issueID}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={meeting.nameOfHouse} size="small" color="primary" />
                <Chip label={meeting.session} size="small" variant="outlined" />
                {meeting.issue && <Chip label={meeting.issue} size="small" variant="outlined" />}
              </Box>

              <Typography variant="h6" component="h2" gutterBottom>
                <Link
                  href={`/meeting/${meeting.issueID}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {meeting.nameOfMeeting}
                </Link>
              </Typography>

              <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarToday sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {formatDateShort(meeting.date)}
                  </Typography>
                </Box>

                {meeting.speechCount !== undefined && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {meeting.speechCount}発言
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  component={Link}
                  href={`/meeting/${meeting.issueID}`}
                  size="small"
                  variant="contained"
                >
                  詳細を見る
                </Button>

                <Button
                  href={meeting.meetingURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                >
                  元データ
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Box>
  )
}
