import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AgentAvatar from './AgentAvatar';

interface ChatMessageProps {
    agentName: string;
    agentColor: string;
    agentEmoji: string;
    agentAvatarImage?: string;
    content: string;
    isStreaming: boolean;
    isWaitingForAudio?: boolean;
    isConvertingAudio?: boolean;
    isRevealing?: boolean;
    isComplete?: boolean;
    alignRight?: boolean;
}

export default function ChatMessage({
    agentName,
    agentColor,
    agentEmoji,
    agentAvatarImage,
    content,
    isStreaming,
    isWaitingForAudio,
    isConvertingAudio,
    isRevealing,
    isComplete,
    alignRight = false,
}: ChatMessageProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: alignRight ? 'row-reverse' : 'row',
                gap: 2,
                mb: 3,
                alignItems: 'flex-start',
            }}
        >
            <AgentAvatar name={agentName} color={agentColor} emoji={agentEmoji} avatarImage={agentAvatarImage} size="large" />

            <Box sx={{ flex: 1, maxWidth: '75%' }}>
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mb: 0.5,
                        fontWeight: 600,
                        color: agentColor,
                        textAlign: alignRight ? 'right' : 'left',
                        fontSize: '1rem',
                    }}
                >
                    {agentName}
                </Typography>

                <Paper
                    elevation={1}
                    sx={{
                        p: 2,
                        bgcolor: alignRight ? `${agentColor}15` : 'background.paper',
                        borderRadius: 2,
                        borderTopLeftRadius: alignRight ? 2 : 0,
                        borderTopRightRadius: alignRight ? 0 : 2,
                        position: 'relative',
                        fontSize: '1.2rem',
                        '& p': { mb: 1 },
                        '& p:last-child': { mb: 0 },
                    }}
                >
                    {/* State 1: Agent Generating (isStreaming = true) */}
                    {isStreaming && !content && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <CircularProgress size={14} sx={{ color: agentColor }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem' }}>
                                <em>Analyzing...</em>
                            </Typography>
                        </Box>
                    )}

                    {/* State 2: Converting to Audio (isConvertingAudio = true) */}
                    {isConvertingAudio && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <CircularProgress size={16} sx={{ color: agentColor }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                                Converting to audio...
                            </Typography>
                        </Box>
                    )}

                    {/* State 3: Revealing Text (isRevealing = true) or Complete */}
                    {content && (
                        <>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            {isRevealing && (
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-block',
                                        width: '2px',
                                        height: '1em',
                                        bgcolor: agentColor,
                                        ml: 0.5,
                                        animation: 'blink 1s infinite',
                                        '@keyframes blink': {
                                            '0%, 50%': { opacity: 1 },
                                            '51%, 100%': { opacity: 0 },
                                        },
                                    }}
                                />
                            )}
                        </>
                    )}
                </Paper>
            </Box>
        </Box>
    );
}
