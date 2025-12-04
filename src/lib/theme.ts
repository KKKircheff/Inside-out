import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1B49AD', // Darker blue
      light: '#3B82F6',
      dark: '#0D2766',
    },
    secondary: {
      main: '#a855f7', // Purple accent
      light: '#c084fc',
      dark: '#9333ea',
    },
    background: {
      default: '#0a0e1a', // Dark navy background
      paper: 'rgba(15, 23, 42, 0.8)', // Semi-transparent dark blue
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 12, // Rounded corners matching the example
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '24px', // Extra rounded buttons
          padding: '12px 32px',
          fontSize: '1rem',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(27, 73, 173, 0.4)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '24px', // Extra rounded inputs matching the example
            backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker background
            fontSize: '1rem',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(27, 73, 173, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1B49AD',
              borderWidth: '2px',
            },
            '& input': {
              color: '#ffffff', // White text on dark input background
              padding: '16px 24px',
              fontSize: '1.1rem',
              fontWeight: 500,
            },
            '& textarea': {
              color: '#ffffff', // White text on dark input background
              fontSize: '1.1rem',
              fontWeight: 500,
            },
            '& input::placeholder': {
              color: 'rgba(255, 255, 255, 0.4)',
              opacity: 1,
            },
            '& textarea::placeholder': {
              color: 'rgba(255, 255, 255, 0.4)',
              opacity: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem',
            fontWeight: 500,
            backgroundColor: 'transparent',
            padding: '0 8px',
            '&.Mui-focused': {
              color: '#1B49AD',
              fontWeight: 600,
            },
            '&.MuiInputLabel-shrink': {
              color: '#1B49AD',
              fontWeight: 600,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'url(/background.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
      },
    },
  },
});
