import { Box, Card, CardContent, Typography, CircularProgress, Chip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Gavel as GavelIcon } from '@mui/icons-material';

interface ModeratorMessageProps {
    decision?: 'CONTINUE' | 'CONCLUDE';
    reasoning?: string;
    synthesis?: string;
    isStreaming?: boolean;
}

export default function ModeratorMessage({
    decision,
    reasoning,
    synthesis,
    isStreaming = false,
}: ModeratorMessageProps) {
    return (
        <Box sx={{ my: 4 }}>
            <Card
                sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                }}
                elevation={3}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <GavelIcon sx={{ fontSize: '2rem' }} />
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Moderator
                        </Typography>
                        {isStreaming && <CircularProgress size={20} color="inherit" sx={{ ml: 'auto' }} />}
                    </Box>

                    {decision && reasoning && (
                        <Box sx={{ mb: 2 }}>
                            <Chip
                                label={decision === 'CONTINUE' ? '▶ CONTINUING TO ROUND 3' : '✓ CONCLUDING DEBATE'}
                                sx={{
                                    bgcolor: decision === 'CONTINUE' ? 'warning.main' : 'success.main',
                                    color: 'white',
                                    fontWeight: 600,
                                    mb: 1,
                                }}
                            />
                            <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.9 }}>
                                {reasoning}
                            </Typography>
                        </Box>
                    )}

                    {synthesis && (
                        <Box sx={{ '& p': { mb: 1 }, '& p:last-child': { mb: 0 } }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{synthesis}</ReactMarkdown>
                        </Box>
                    )}

                    {!synthesis && !decision && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                            Evaluating debate...
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
