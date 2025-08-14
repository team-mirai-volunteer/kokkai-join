'use client';

import { createTheme } from '@mui/material/styles';

// モダンなカラーパレット
const colors = {
  primary: {
    50: '#f0f7ff',
    100: '#c7e1ff',
    200: '#9ec8ff', 
    300: '#75abff',
    400: '#4c8eff',
    500: '#0969da', // メインプライマリー
    600: '#0550ae',
    700: '#033d8b',
    800: '#0a3069',
    900: '#002047',
  },
  gray: {
    50: '#f8f9fa',
    100: '#f1f3f4',
    200: '#e1e4e8',
    300: '#d0d7de',
    400: '#8c959f',
    500: '#6e7781',
    600: '#57606a',
    700: '#424a53',
    800: '#32383f',
    900: '#24292f',
  },
  success: {
    main: '#1a7f37',
    light: '#2da44e',
    dark: '#0f5323',
  },
  error: {
    main: '#cf222e',
    light: '#ff6b6b',
    dark: '#a40e26',
  },
  warning: {
    main: '#fb8500',
    light: '#ffb347',
    dark: '#cc6a00',
  },
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary[500],
      light: colors.primary[400],
      dark: colors.primary[600],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.gray[600],
      light: colors.gray[500],
      dark: colors.gray[700],
    },
    success: {
      main: colors.success.main,
      light: colors.success.light,
      dark: colors.success.dark,
    },
    error: {
      main: colors.error.main,
      light: colors.error.light,
      dark: colors.error.dark,
    },
    warning: {
      main: colors.warning.main,
      light: colors.warning.light,
      dark: colors.warning.dark,
    },
    background: {
      default: colors.gray[50],
      paper: '#ffffff',
    },
    text: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
    },
    divider: colors.gray[200],
    grey: colors.gray,
  },

  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont', 
      '"Segoe UI"',
      '"Noto Sans"',
      'Helvetica',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      'var(--font-geist-sans)',
    ].join(','),
    
    // 見出しのスタイル
    h1: {
      fontSize: '32px',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
      color: colors.gray[900],
    },
    h2: {
      fontSize: '24px',
      fontWeight: 600, 
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
      color: colors.gray[900],
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.25,
      color: colors.gray[900],
    },
    h4: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.25,
      color: colors.gray[900],
    },
    h5: {
      fontSize: '14px', 
      fontWeight: 600,
      lineHeight: 1.25,
      color: colors.gray[900],
    },
    h6: {
      fontSize: '12px',
      fontWeight: 600,
      lineHeight: 1.25,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: colors.gray[700],
    },
    
    // 本文テキスト
    body1: {
      fontSize: '14px',
      lineHeight: 1.5,
      color: colors.gray[900],
    },
    body2: {
      fontSize: '12px',
      lineHeight: 1.4,
      color: colors.gray[700],
    },
    
    subtitle1: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.5,
      color: colors.gray[800],
    },
    subtitle2: {
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1.4, 
      color: colors.gray[700],
    },
    
    caption: {
      fontSize: '11px',
      lineHeight: 1.4,
      letterSpacing: '0.01em',
      color: colors.gray[600],
    },
    
    overline: {
      fontSize: '10px',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: colors.gray[600],
    },
    
    button: {
      fontSize: '14px',
      fontWeight: 500,
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: 6, // モダンな角丸
  },

  spacing: 8, // 8px基準

  components: {
    // ボタン
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '14px',
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          backgroundColor: colors.primary[500],
          color: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          '&:hover': {
            backgroundColor: colors.primary[600],
            boxShadow: `0 4px 8px rgba(9, 105, 218, 0.25)`,
          },
        },
        outlined: {
          borderColor: colors.gray[300],
          color: colors.primary[500],
          '&:hover': {
            backgroundColor: colors.gray[50],
            borderColor: colors.gray[400],
          },
        },
        text: {
          color: colors.primary[500],
          '&:hover': {
            backgroundColor: colors.primary[50],
          },
        },
      },
    },

    // カード
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: `1px solid ${colors.gray[200]}`,
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: colors.gray[300],
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },

    // フォーム要素
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: colors.gray[300],
            },
            '&:hover fieldset': {
              borderColor: colors.gray[400],
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary[500],
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: colors.gray[600],
            fontSize: '14px',
          },
          '& .MuiInputBase-input': {
            fontSize: '14px',
            padding: '8px 12px',
          },
        },
      },
    },

    // アプリバー
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.gray[900],
          color: '#ffffff',
          borderBottom: `1px solid ${colors.gray[700]}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
    },

    // コンテナ
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '16px',
          paddingRight: '16px',
          '@media (min-width: 768px)': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
          '@media (min-width: 1024px)': {
            paddingLeft: '32px',
            paddingRight: '32px',
          },
        },
      },
    },

    // チップ
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
        filled: {
          backgroundColor: colors.gray[100],
          color: colors.gray[800],
        },
        outlined: {
          borderColor: colors.gray[300],
          color: colors.gray[700],
        },
      },
    },

    // 紙（Paper）
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
        },
        outlined: {
          border: `1px solid ${colors.gray[200]}`,
        },
      },
    },

    // リスト
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          margin: '2px 0',
          '&:hover': {
            backgroundColor: colors.gray[50],
          },
          '&.Mui-selected': {
            backgroundColor: colors.primary[50],
            borderLeft: `3px solid ${colors.primary[500]}`,
            '&:hover': {
              backgroundColor: colors.primary[100],
            },
          },
        },
      },
    },
  },
});