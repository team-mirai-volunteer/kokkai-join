'use client';

import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Home, Search, People } from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { label: 'ホーム', href: '/', icon: <Home /> },
    { label: '検索', href: '/search', icon: <Search /> },
    { label: '発言者', href: '/speakers', icon: <People /> },
  ];

  return (
    <AppBar 
      position="static" 
      elevation={0} 
      sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        color: 'text.primary'
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              mr: 4,
              fontWeight: 'bold',
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            国会ジョイン
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                startIcon={item.icon}
                sx={{
                  color: pathname === item.href ? 'primary.main' : 'text.primary',
                  backgroundColor: pathname === item.href ? 'action.hover' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}