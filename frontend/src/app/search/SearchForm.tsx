'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, TextField, Button, MenuItem, Paper, Grid } from '@mui/material';
import { Search } from '@mui/icons-material';
import { HOUSE_TYPES } from '@/lib/constants';
import { buildSearchUrl } from '@/lib/utils/search-params';

interface SearchFormProps {
  initialValues: {
    q?: string;
    house?: string;
    speaker?: string;
    session?: string;
    from?: string;
    until?: string;
  };
}

export function SearchForm({ initialValues }: SearchFormProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialValues.q || '');
  const [house, setHouse] = useState(initialValues.house || '');
  const [speaker, setSpeaker] = useState(initialValues.speaker || '');
  const [session, setSession] = useState(initialValues.session || '');
  const [dateFrom, setDateFrom] = useState(initialValues.from || '');
  const [dateUntil, setDateUntil] = useState(initialValues.until || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const url = buildSearchUrl({
      q: keyword,
      house,
      speaker,
      session,
      from: dateFrom,
      until: dateUntil,
    });

    router.push(url);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="キーワード"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="検索したいキーワードを入力"
              variant="outlined"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              select
              label="院"
              value={house}
              onChange={(e) => setHouse(e.target.value)}
              variant="outlined"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            >
              {HOUSE_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="発言者"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="発言者名で絞り込み"
              variant="outlined"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="国会回次"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              placeholder="例: 213"
              variant="outlined"
              type="number"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="開始日"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              variant="outlined"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="終了日"
              type="date"
              value={dateUntil}
              onChange={(e) => setDateUntil(e.target.value)}
              variant="outlined"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />
          </Grid>

          <Grid size={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" size="large" startIcon={<Search />}>
                検索
              </Button>

              <Button
                type="button"
                variant="outlined"
                size="large"
                onClick={() => {
                  setKeyword('');
                  setHouse('');
                  setSpeaker('');
                  setSession('');
                  setDateFrom('');
                  setDateUntil('');
                  router.push('/search');
                }}
              >
                クリア
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}
