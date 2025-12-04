import { useRef, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import ChatMessage from './ChatMessage';
import RoundDivider from './RoundDivider';
import ModeratorMessage from './ModeratorMessage';

export interface ChatMessageData {
    id: string;
    type: 'agent' | 'round-divider' | 'moderator-decision' | 'moderator-synthesis';
    agentId?: string;
    agentName?: string;
    agentColor?: string;
    agentEmoji?: string;
    agentAvatarImage?: string;
    round?: number;
    content?: string;
    fullText?: string; // Full text accumulated from streaming (hidden until audio ready)
    isStreaming?: boolean; // Agent is generating text
    isWaitingForAudio?: boolean; // Waiting for TTS conversion
    isConvertingAudio?: boolean; // Converting text to audio
    isRevealing?: boolean; // Text revealing with audio
    isComplete?: boolean; // Fully revealed
    decision?: 'CONTINUE' | 'CONCLUDE';
    reasoning?: string;
}

interface ChatTimelineProps {
    messages: ChatMessageData[];
    autoScroll?: boolean;
}

export default function ChatTimeline({ messages, autoScroll = true }: ChatTimelineProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, autoScroll]);

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                maxHeight: '70vh',
                overflowY: 'auto',
                bgcolor: 'background.default',
                borderRadius: 2,
            }}
        >
            <Box>
                {messages.map((message, index) => {
                    if (message.type === 'round-divider' && message.round) {
                        return <RoundDivider key={message.id} round={message.round} />;
                    }

                    if (message.type === 'agent' && message.agentName && message.agentColor) {
                        // Calculate agent message index (excluding non-agent messages)
                        const agentMessageIndex = messages
                            .slice(0, index)
                            .filter((m) => m.type === 'agent').length;

                        return (
                            <ChatMessage
                                key={message.id}
                                agentName={message.agentName}
                                agentColor={message.agentColor}
                                agentEmoji={message.agentEmoji || '🤖'}
                                agentAvatarImage={message.agentAvatarImage}
                                content={message.content || ''}
                                isStreaming={message.isStreaming || false}
                                isWaitingForAudio={message.isWaitingForAudio}
                                isConvertingAudio={message.isConvertingAudio}
                                isRevealing={message.isRevealing}
                                isComplete={message.isComplete}
                                alignRight={agentMessageIndex % 2 === 1}
                            />
                        );
                    }

                    if (message.type === 'moderator-decision') {
                        return (
                            <ModeratorMessage
                                key={message.id}
                                decision={message.decision}
                                reasoning={message.reasoning}
                            />
                        );
                    }

                    if (message.type === 'moderator-synthesis') {
                        return (
                            <ModeratorMessage
                                key={message.id}
                                synthesis={message.content}
                                isStreaming={message.isStreaming}
                            />
                        );
                    }

                    return null;
                })}

                <div ref={bottomRef} />
            </Box>
        </Paper>
    );
}
