import { Suspense } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getSpeakerList } from '@/lib/actions/speaker-actions';
import { SpeakerListContent } from './components/SpeakerListContent';

interface SpeakersPageProps {
  searchParams: Promise<{ 
    page?: string; 
    q?: string; 
    pageSize?: string;
    sortField?: string;
    sortOrder?: string;
  }>;
}

export default async function SpeakersPage({ searchParams }: SpeakersPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : 25;
  const searchQuery = params.q || '';
  const sortField = params.sortField || undefined;
  const sortOrder = params.sortOrder === 'asc' || params.sortOrder === 'desc' 
    ? params.sortOrder 
    : undefined;

  const result = await getSpeakerList(page, pageSize, searchQuery, sortField, sortOrder);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          発言者一覧
        </Typography>
        <Typography variant="body1" color="text.secondary">
          国会で発言した全ての発言者を表示しています
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <form action="/speakers" method="get">
          <TextField
            name="q"
            defaultValue={searchQuery}
            placeholder="発言者名で検索..."
            variant="outlined"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </form>
      </Paper>

      <Suspense
        fallback={
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>読み込み中...</Typography>
          </Box>
        }
      >
        <SpeakerListContent
          speakers={result.speakers}
          totalPages={result.totalPages}
          currentPage={result.currentPage}
          searchQuery={searchQuery}
          pageSize={pageSize}
          sortField={sortField}
          sortOrder={sortOrder}
        />
      </Suspense>
    </Container>
  );
}

export function generateMetadata() {
  return {
    title: '発言者一覧 | 国会会議録検索',
    description: '国会で発言した全ての発言者の一覧',
  };
}