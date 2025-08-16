import { Container, Typography, Box, Button, Alert } from '@mui/material';
import { Home, Search } from '@mui/icons-material';
import Link from 'next/link';

export default function MeetingNotFound() {
  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          会議録が見つかりません
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          指定された会議録は存在しないか、一時的にアクセスできません。
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
        <Typography variant="body1" gutterBottom>
          考えられる原因：
        </Typography>
        <Typography variant="body2" component="div">
          • 会議録IDが正しくない
          <br />
          • 会議録が削除または移動された
          <br />• 一時的なシステムエラー
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button component={Link} href="/" variant="contained" startIcon={<Home />} size="large">
          トップページに戻る
        </Button>

        <Button
          component={Link}
          href="/search"
          variant="outlined"
          startIcon={<Search />}
          size="large"
        >
          会議録を検索
        </Button>
      </Box>
    </Container>
  );
}
