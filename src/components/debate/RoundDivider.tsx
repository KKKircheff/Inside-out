import { Box, Chip, Divider } from '@mui/material';

interface RoundDividerProps {
    round: number;
}

export default function RoundDivider({ round }: RoundDividerProps) {
    return (
        <Box sx={{ my: 4, textAlign: 'center', position: 'relative' }}>
            <Divider sx={{ mb: 2 }} />
            <Chip
                label={`ROUND ${round}!`}
                color="primary"
                sx={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    px: 3,
                    py: 2.5,
                    height: 'auto',
                    borderRadius: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}
            />
            <Divider sx={{ mt: 2 }} />
        </Box>
    );
}
