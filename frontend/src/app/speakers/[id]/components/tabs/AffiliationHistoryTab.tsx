'use client';

import { Typography, Box, Card, CardContent, Chip, Stack } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab';
import { formatDate } from '@/lib/utils/date';

interface Affiliation {
  id: string;
  startDate: Date;
  endDate: Date | null;
  partyGroup: {
    id: string;
    name: string;
  } | null;
}

interface AffiliationHistoryTabProps {
  affiliations: Affiliation[];
}

export function AffiliationHistoryTab({ affiliations }: AffiliationHistoryTabProps) {
  // 現在の所属を先頭に表示
  const currentAffiliations = affiliations.filter(a => !a.endDate);
  const pastAffiliations = affiliations.filter(a => a.endDate);

  if (affiliations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          所属情報がありません
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {currentAffiliations.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            現在の所属
          </Typography>
          
          <Stack spacing={2} sx={{ mb: 4 }}>
            {currentAffiliations.map((affiliation) => (
              <Card key={affiliation.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {affiliation.partyGroup && (
                      <Chip
                        label={affiliation.partyGroup.name}
                        color="primary"
                        size="small"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {formatDate(affiliation.startDate)} から
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {pastAffiliations.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            過去の所属
          </Typography>
          
          <Timeline position="alternate">
            {pastAffiliations.map((affiliation, index) => (
              <TimelineItem key={affiliation.id}>
                <TimelineSeparator>
                  <TimelineDot color={index === 0 ? 'primary' : 'grey'} />
                  {index < pastAffiliations.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="column" spacing={1}>
                        {affiliation.partyGroup && (
                          <Chip
                            label={affiliation.partyGroup.name}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(affiliation.startDate)} 〜 {affiliation.endDate ? formatDate(affiliation.endDate) : ''}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </>
      )}
    </Box>
  );
}