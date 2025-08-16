import { Container, Typography, Box, Alert } from '@mui/material';
import { SearchForm } from './SearchForm';
import { SearchResultsGrid } from './SearchResultsGrid';
import { searchMeetings } from '@/lib/actions/meeting-actions';
import { Suspense } from 'react';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    house?: string;
    speaker?: string;
    session?: string;
    from?: string;
    until?: string;
    page?: string;
    pageSize?: string;
    sortField?: string;
    sortOrder?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || '25', 10);
  const sortField = params.sortField;
  const sortOrder = params.sortOrder as 'asc' | 'desc' | undefined;

  let searchResult = null;
  let error = null;

  // キーワードがなくても、他の検索条件がある場合は検索を実行
  const hasSearchParams =
    query || params.house || params.speaker || params.session || params.from || params.until;

  if (hasSearchParams) {
    try {
      searchResult = await searchMeetings(query, {
        house: params.house,
        speaker: params.speaker,
        session: params.session,
        dateFrom: params.from,
        dateTo: params.until,
        page,
        limit: pageSize,
        sortField,
        sortOrder,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : '検索中にエラーが発生しました';
    }
  } else {
    // 検索条件がない場合は最新の会議録を表示
    try {
      searchResult = await searchMeetings('', {
        page,
        limit: pageSize,
        sortField,
        sortOrder,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : '会議録の取得に失敗しました';
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
            {hasSearchParams ? '検索結果' : '最新の会議録'}:{' '}
            {searchResult.totalCount.toLocaleString()}件
          </Typography>

          <Suspense fallback={<div>読み込み中...</div>}>
            <SearchResultsGrid
              meetings={searchResult.meetings}
              totalCount={searchResult.totalCount}
              currentPage={searchResult.currentPage || 1}
              hasMore={searchResult.hasMore}
              searchParams={params}
            />
          </Suspense>
        </Box>
      )}
    </Container>
  );
}
