'use client';

import { Typography, Box, Chip, Stack } from '@mui/material';
import { formatDate } from '@/lib/utils/date';

interface SpeakerHeaderProps {
  speaker: {
    displayName: string;
    nameYomi: string | null;
    normalizedName: string;
    firstSpeechDate: Date | null;
    lastSpeechDate: Date | null;
    _count: {
      speeches: number;
    };
  };
}

export function SpeakerHeader({ speaker }: SpeakerHeaderProps) {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        {speaker.displayName}
      </Typography>
      
      {speaker.nameYomi && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {speaker.nameYomi}
        </Typography>
      )}

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Chip
          label={`発言数: ${speaker._count.speeches.toLocaleString()}件`}
          color="primary"
          variant="outlined"
        />
        
        {speaker.firstSpeechDate && speaker.lastSpeechDate && (
          <Typography variant="body2" color="text.secondary">
            活動期間: {formatDate(speaker.firstSpeechDate)} 〜 {formatDate(speaker.lastSpeechDate)}
          </Typography>
        )}
      </Stack>

      {speaker.normalizedName !== speaker.displayName && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          正規化名: {speaker.normalizedName}
        </Typography>
      )}
    </Box>
  );
}