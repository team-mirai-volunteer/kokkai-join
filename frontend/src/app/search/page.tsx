import { Container, Typography, Box, Alert } from '@mui/material'
import { SearchForm } from './SearchForm'
import { SearchResults } from './SearchResults'
import { searchMeetings } from '@/lib/actions/meeting-actions'
import { Suspense } from 'react'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    house?: string
    speaker?: string
    from?: string
    until?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''
  const page = parseInt(params.page || '1', 10)

  let searchResult = null
  let error = null

  if (query) {
    try {
      searchResult = await searchMeetings(query, {
        house: params.house,
        speaker: params.speaker,
        dateFrom: params.from,
        dateTo: params.until,
        page,
        limit: 20,
      })
    } catch (err) {
      error = err instanceof Error ? err.message : '検索中にエラーが発生しました'
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 4 }}>
        会議録検索
      </Typography>

      <SearchForm initialValues={params} />

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {searchResult && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            検索結果: {searchResult.totalCount.toLocaleString()}件
          </Typography>

          <Suspense fallback={<div>読み込み中...</div>}>
            <SearchResults
              meetings={searchResult.meetings}
              totalCount={searchResult.totalCount}
              currentPage={searchResult.currentPage || 1}
              hasMore={searchResult.hasMore}
              searchParams={params}
            />
          </Suspense>
        </Box>
      )}

      {!query && !error && (
        <Alert severity="info" sx={{ mt: 3 }}>
          キーワードを入力して検索してください。
        </Alert>
      )}
    </Container>
  )
}
