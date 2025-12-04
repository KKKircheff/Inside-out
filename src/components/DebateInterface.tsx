'use client';

import { useState, useRef, useEffect } from 'react';
import { readStreamableValue } from 'ai/rsc';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    CircularProgress,
    Chip,
    LinearProgress,
    IconButton,
    Alert,
    List,
    ListItem,
    ListItemText,
    Tooltip,
} from '@mui/material';
import {
    Send as SendIcon,
    Mic as MicIcon,
    Stop as StopIcon,
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon,
    Add as AddIcon,
    Person as PersonIcon,
    PersonOff as PersonOffIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { evaluateDecision, type IntelligenceLayerResult } from '@/app/actions/intelligence';
import { runDebate } from '@/app/actions/debate';
import { transcribeAudio } from '@/app/actions/stt';
import { generateSpeech } from '@/app/actions/tts';
import { conductResearch, type ResearchResult } from '@/app/actions/research';
import { formatResearchContext, type DecisionOutput } from '@/lib/output-utils';
import ChatTimeline, { type ChatMessageData } from './debate/ChatTimeline';
import ClarifyingQuestionsPanel from './ClarifyingQuestionsPanel';
import AgentSelector from './AgentSelector';
import type { Agent } from '@/lib/agents';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { getAllAgents } from '@/app/actions/agents';

interface AgentInfo {
    id: string;
    name: string;
    emoji: string;
    color: string;
    avatarImage?: string;
}

type Stage = 'input' | 'intelligence' | 'research' | 'debate' | 'results';

interface DebateInterfaceProps {
    onSaveDecision?: (decision: string, recommendation?: string) => void;
}

export default function DebateInterface({ onSaveDecision }: DebateInterfaceProps) {
    // Auth context
    const { user } = useAuth();

    // User profile context
    const { profile, getPersonalContext } = useUserProfile();

    // Stage management
    const [stage, setStage] = useState<Stage>('input');
    const [decision, setDecision] = useState('');
    const [additionalContext, setAdditionalContext] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Intelligence Layer
    const [intelligenceResult, setIntelligenceResult] = useState<IntelligenceLayerResult | null>(null);
    const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([]);

    // Research Layer
    const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
    const [isResearching, setIsResearching] = useState(false);

    // Available agents (loaded from Firebase)
    const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
    const [agentsLoading, setAgentsLoading] = useState(true);

    // Debate Layer - Chat-style messages
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);

    // Results
    const [decisionOutput, setDecisionOutput] = useState<DecisionOutput | null>(null);
    const [totalRounds, setTotalRounds] = useState<number>(0);

    // Voice features
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTarget, setRecordingTarget] = useState<'decision' | 'additionalContext' | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    // Simple state machine for sequential message playback
    interface PendingMessage {
        id: string;
        type: 'agent' | 'moderator' | 'round-divider' | 'moderator-decision';
        agentName?: string;
        agentColor?: string;
        agentEmoji?: string;
        agentAvatarImage?: string;
        agentVoice?: string;
        round?: number;
        text?: string;
        decision?: 'CONTINUE' | 'CONCLUDE';
        reasoning?: string;
    }

    const [currentMessage, setCurrentMessage] = useState<PendingMessage | null>(null);
    const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
    const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());
    const revealAnimationRef = useRef<number | null>(null)

    // Agent selection
    const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);

    // Personal context toggle
    const [usePersonalContext, setUsePersonalContext] = useState(false);

    // Clarifying questions state
    const [clarifyingPanelOpen, setClarifyingPanelOpen] = useState(false);
    const [currentClarifyingQuestions, setCurrentClarifyingQuestions] = useState<string[]>([]);
    const [clarifyingRound, setClarifyingRound] = useState(0);
    const [allAnswers, setAllAnswers] = useState<string[]>([]);

    // Additional context visibility
    const [showAdditionalContext, setShowAdditionalContext] = useState(false);

    // ========================================
    // Effects
    // ========================================

    // Load agents from Firebase on mount
    useEffect(() => {
        const loadAgents = async () => {
            try {
                setAgentsLoading(true);
                // Get all agents (system + user's custom agents if logged in)
                const agents = await getAllAgents(user?.uid);
                setAvailableAgents(agents);
            } catch (err) {
                console.error('Failed to load agents:', err);
                setError('Failed to load agents from Firebase. Please refresh the page.');
            } finally {
                setAgentsLoading(false);
            }
        };

        loadAgents();
    }, [user?.uid]);

    // Auto-advance: When nothing is playing and we have pending messages, play the next one
    useEffect(() => {
        if (!currentMessage && pendingMessages.length > 0) {
            const next = pendingMessages[0];
            console.log('⏭️ Auto-advancing to next message:', next.type, next.id);

            setCurrentMessage(next);
            setPendingMessages(prev => prev.slice(1));

            // Start playing this message
            playMessage(next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMessage, pendingMessages.length]);

    // ========================================
    // Voice Functions
    // ========================================

    const startRecording = async (target: 'decision' | 'additionalContext') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            setRecordingTarget(target);

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await transcribeAudioFile(audioBlob, target);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            setError('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setRecordingTarget(null);
        }
    };

    const transcribeAudioFile = async (audioBlob: Blob, target: 'decision' | 'additionalContext') => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const result = await transcribeAudio(formData);

            if (target === 'decision') {
                setDecision(result.transcription);
            } else {
                setAdditionalContext(result.transcription);
            }
        } catch (err) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe audio. Please try typing instead.');
        }
    };

    const playAudio = async (text: string) => {
        if (!audioEnabled) return;

        try {
            const result = await generateSpeech({ text, voice: 'alloy', speed: 1.3 });

            // Convert base64 to blob
            const audioBlob = new Blob(
                [Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0))],
                { type: result.contentType }
            );
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = audioUrl;
                audioPlayerRef.current.play();
            }
        } catch (err) {
            console.error('TTS error:', err);
        }
    };

    // ========================================
    // Message Handling Functions
    // ========================================

    const addPendingMessage = (message: PendingMessage) => {
        // Check if already completed (prevent duplicates)
        if (completedMessageIds.has(message.id)) {
            console.log('⚠️ DUPLICATE - Already completed:', message.id);
            return;
        }

        console.log('📥 Adding to pending:', message.type, message.id);
        setPendingMessages(prev => [...prev, message]);
    };

    const completeMessage = (messageId: string) => {
        console.log('✅ Message completed:', messageId);
        setCompletedMessageIds(prev => new Set(prev).add(messageId));
        setCurrentMessage(null); // This triggers auto-advance effect

        // When moderator synthesis completes, transition to results stage
        if (messageId === 'moderator-synthesis' && decisionOutput) {
            console.log('📊 Moderator synthesis complete, showing results');
            setStage('results');
        }
    };

    // ========================================
    // Message Playback Functions
    // ========================================

    const getAudioDuration = (blob: Blob): Promise<number> => {
        return new Promise((resolve) => {
            const audio = new Audio(URL.createObjectURL(blob));
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
                URL.revokeObjectURL(audio.src);
            });
        });
    };

    const convertTextToAudio = async (text: string, voice?: string): Promise<{ blob: Blob; duration: number }> => {
        const result = await generateSpeech({ text, voice: voice || 'alloy', speed: 1.3 });

        const audioBlob = new Blob(
            [Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0))],
            { type: result.contentType }
        );

        const duration = await getAudioDuration(audioBlob);

        return { blob: audioBlob, duration };
    };

    const playMessage = async (message: PendingMessage) => {
        console.log('▶️ Playing message:', message.type, message.id);

        // Handle non-agent messages (round dividers, moderator decisions)
        if (message.type === 'round-divider') {
            // Just show the round divider immediately
            setChatMessages((prev) => [
                ...prev,
                {
                    id: message.id,
                    type: 'round-divider',
                    round: message.round,
                },
            ]);
            completeMessage(message.id);
            return;
        }

        if (message.type === 'moderator-decision') {
            // Show moderator decision immediately
            setChatMessages((prev) => [
                ...prev,
                {
                    id: message.id,
                    type: 'moderator-decision',
                    decision: message.decision,
                    reasoning: message.reasoning,
                },
            ]);
            completeMessage(message.id);
            return;
        }

        // Handle agent and moderator messages with audio
        const messageText = message.text || '';

        if (!audioEnabled || !messageText) {
            // Show text immediately without audio
            showMessageInUI(message, messageText, true);
            completeMessage(message.id);
            return;
        }

        try {
            // Convert to TTS
            console.log('🔊 Converting to audio...');
            showMessageInUI(message, '', false, true); // Show loading
            const audioData = await convertTextToAudio(messageText, message.agentVoice);

            // Play audio with synced text reveal
            await playAudioWithReveal(message, messageText, audioData);

            // Mark complete
            completeMessage(message.id);
        } catch (err) {
            console.error('❌ Playback error:', err);
            // Fallback: show text immediately
            showMessageInUI(message, messageText, true);
            completeMessage(message.id);
        }
    };

    const showMessageInUI = (
        message: PendingMessage,
        text: string,
        isComplete: boolean = false,
        isConverting: boolean = false
    ) => {
        if (message.type === 'agent') {
            setChatMessages((prev) => {
                const existing = prev.find(m => m.id === message.id);
                if (existing) {
                    return prev.map(msg =>
                        msg.id === message.id
                            ? { ...msg, content: text, isComplete, isConvertingAudio: isConverting }
                            : msg
                    );
                }
                return [
                    ...prev,
                    {
                        id: message.id,
                        type: 'agent' as const,
                        agentId: message.id.split('-')[0],
                        agentName: message.agentName,
                        agentColor: message.agentColor,
                        agentEmoji: message.agentEmoji,
                        agentAvatarImage: message.agentAvatarImage,
                        round: message.round,
                        content: text,
                        isComplete,
                        isConvertingAudio: isConverting,
                    },
                ];
            });
        } else if (message.type === 'moderator') {
            setChatMessages((prev) => {
                const existing = prev.find(m => m.id === message.id);
                if (existing) {
                    return prev.map(msg =>
                        msg.id === message.id
                            ? { ...msg, content: text, isComplete, isConvertingAudio: isConverting }
                            : msg
                    );
                }
                return [
                    ...prev,
                    {
                        id: message.id,
                        type: 'moderator-synthesis' as const,
                        content: text,
                        isComplete,
                        isConvertingAudio: isConverting,
                    },
                ];
            });
        }
    };

    const playAudioWithReveal = async (
        message: PendingMessage,
        text: string,
        audioData: { blob: Blob; duration: number }
    ): Promise<void> => {
        return new Promise<void>((resolve) => {
            const audioUrl = URL.createObjectURL(audioData.blob);

            if (!audioPlayerRef.current) {
                resolve();
                return;
            }

            console.log('🎵 Playing audio for:', message.id);

            // Show message in revealing state
            showMessageInUI(message, '', false, false);
            setChatMessages((prev) =>
                prev.map((msg) =>
                    msg.id === message.id ? { ...msg, isRevealing: true } : msg
                )
            );

            // Start synced text reveal animation
            const startTime = performance.now();
            const durationMs = audioData.duration * 1000;
            const textLength = text.length;

            const reveal = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / durationMs, 1);
                const charIndex = Math.floor(progress * textLength);
                const revealedText = text.substring(0, charIndex);

                setChatMessages((prev) =>
                    prev.map((msg) => (msg.id === message.id ? { ...msg, content: revealedText } : msg))
                );

                if (progress < 1) {
                    revealAnimationRef.current = requestAnimationFrame(reveal);
                }
            };

            revealAnimationRef.current = requestAnimationFrame(reveal);

            // Play audio
            audioPlayerRef.current.src = audioUrl;
            audioPlayerRef.current.play();

            audioPlayerRef.current.onended = () => {
                URL.revokeObjectURL(audioUrl);
                if (revealAnimationRef.current) {
                    cancelAnimationFrame(revealAnimationRef.current);
                }

                // Mark complete in UI
                setChatMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === message.id
                            ? { ...msg, content: text, isRevealing: false, isComplete: true }
                            : msg
                    )
                );

                resolve();
            };

            audioPlayerRef.current.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                if (revealAnimationRef.current) {
                    cancelAnimationFrame(revealAnimationRef.current);
                }
                // Fallback: show full text
                setChatMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === message.id ? { ...msg, content: text, isComplete: true } : msg
                    )
                );
                resolve();
            };
        });
    };


    // ========================================
    // Main Flow Functions
    // ========================================

    const handleStartAnalysis = async () => {
        if (!decision.trim()) {
            setError('Please enter a decision to evaluate');
            return;
        }

        setError(null);
        setStage('intelligence');

        try {
            // Build context from personal profile + additional context + all previous answers
            const contextParts = [
                usePersonalContext ? getPersonalContext() : null, // Include user's personal profile if enabled
                additionalContext.trim(),
                ...allAnswers
            ].filter(Boolean);
            const fullContext = contextParts.join('\n\n');

            // Intelligence Layer evaluation
            const result = await evaluateDecision(decision, fullContext);
            setIntelligenceResult(result);

            if (result.status === 'clarify') {
                // Check if we've exceeded max rounds
                if (clarifyingRound >= 2) {
                    // Max 2 rounds reached, proceed with what we have
                    await handleDebate(undefined, fullContext);
                    return;
                }

                // Show clarifying questions panel
                const questions = result.clarifyingQuestions?.slice(0, 3) || []; // Max 3 questions
                setCurrentClarifyingQuestions(questions);
                setClarifyingRound(prev => prev + 1);
                setClarifyingPanelOpen(true);
                setStage('input');
            } else if (result.status === 'research') {
                // Conduct research
                setStage('research');
                await handleResearch(result);
            } else {
                // Proceed directly to debate
                await handleDebate(undefined, fullContext);
            }
        } catch (err) {
            console.error('Intelligence layer error:', err);
            setError(err instanceof Error ? err.message : 'Analysis failed');
            setStage('input');
        }
    };

    const handleClarifyingAnswers = async (answers: string[]) => {
        // Store answers
        setAllAnswers(prev => [...prev, ...answers.filter(a => a.trim())]);
        setClarifyingPanelOpen(false);
        setCurrentClarifyingQuestions([]);

        // Re-evaluate with new context
        await handleStartAnalysis();
    };

    const handleSkipClarifying = async () => {
        setClarifyingPanelOpen(false);
        setCurrentClarifyingQuestions([]);

        // Proceed with current context including personal profile
        const contextParts = [
            usePersonalContext ? getPersonalContext() : null, // Include user's personal profile if enabled
            additionalContext.trim(),
            ...allAnswers
        ].filter(Boolean);
        const fullContext = contextParts.join('\n\n');

        if (intelligenceResult?.status === 'research') {
            setStage('research');
            await handleResearch(intelligenceResult);
        } else {
            await handleDebate(undefined, fullContext);
        }
    };

    const handleResearch = async (intelligenceResult: IntelligenceLayerResult) => {
        if (!intelligenceResult.researchNeeded || intelligenceResult.researchNeeded.length === 0) {
            await handleDebate();
            return;
        }

        setIsResearching(true);

        try {
            const results = await conductResearch(intelligenceResult.researchNeeded);
            setResearchResults(results);
            setIsResearching(false);

            // Proceed to debate with enriched context
            await handleDebate(results);
        } catch (err) {
            console.error('Research error:', err);
            setError('Research failed, proceeding without additional context');
            setIsResearching(false);
            await handleDebate();
        }
    };

    const handleDebate = async (research?: ResearchResult[], context?: string) => {
        setStage('debate');

        // Check if agents are loaded
        if (availableAgents.length === 0) {
            setError('Agents are still loading. Please wait...');
            return;
        }

        try {
            const enrichedContext = research ? formatResearchContext(research) : undefined;

            // Build full context with personal profile
            const contextParts = [
                usePersonalContext ? getPersonalContext() : null, // Include user's personal profile if enabled
                context || additionalContext,
                enrichedContext
            ].filter(Boolean);
            const fullContext = contextParts.join('\n\n');

            const { stream } = await runDebate(
                decision,
                availableAgents,
                user?.uid,
                fullContext,
                selectedAgents.length > 0 ? selectedAgents : undefined
            );

            // Process debate stream - convert events to pending messages
            for await (const event of readStreamableValue(stream)) {
                if (!event) continue;

                const { event: eventType, data } = event as { event: string; data: Record<string, unknown> };

                // Log events for debugging (except streaming chunks)
                if (eventType !== 'agent-stream') {
                    console.log('📡 Event received:', eventType, data);
                }

                switch (eventType) {
                    case 'debate-start':
                        console.log('🚀 Debate started');
                        setAgents(
                            (data.agents as { id: string; name: string; emoji: string; color: string; avatarImage?: string }[]).map((a) => ({
                                id: a.id,
                                name: a.name,
                                emoji: a.emoji,
                                color: a.color,
                                avatarImage: a.avatarImage,
                            }))
                        );
                        setChatMessages([]);
                        setPendingMessages([]);
                        setCompletedMessageIds(new Set());
                        setCurrentMessage(null);
                        break;

                    case 'round-start':
                        addPendingMessage({
                            id: `round-${data.round}`,
                            type: 'round-divider',
                            round: data.round as number,
                        });
                        break;

                    case 'agent-complete': {
                        const agentId = data.agentId as string;
                        const agentName = data.agentName as string;
                        const agentColor = data.agentColor as string;
                        const agentEmoji = data.agentEmoji as string;
                        const agentAvatarImage = data.agentAvatarImage as string | undefined;
                        const agentVoice = data.agentVoice as string | undefined;
                        const round = data.round as number;
                        const response = data.response as string;
                        const messageId = `${agentId}-r${round}`;

                        addPendingMessage({
                            id: messageId,
                            type: 'agent',
                            agentName,
                            agentColor,
                            agentEmoji,
                            agentAvatarImage,
                            agentVoice,
                            round,
                            text: response,
                        });
                        break;
                    }

                    case 'moderator-decision':
                        addPendingMessage({
                            id: 'moderator-decision',
                            type: 'moderator-decision',
                            decision: data.decision as 'CONTINUE' | 'CONCLUDE',
                            reasoning: data.reasoning as string,
                        });
                        break;

                    case 'moderator-synthesis-complete':
                        addPendingMessage({
                            id: 'moderator-synthesis',
                            type: 'moderator',
                            text: data.synthesis as string,
                        });
                        break;

                    case 'debate-complete': {
                        const output = data as unknown as DecisionOutput;
                        setDecisionOutput(output);
                        setTotalRounds(data.totalRounds as number);
                        // Don't set stage to 'results' yet - wait for moderator synthesis to complete

                        if (onSaveDecision) {
                            onSaveDecision(decision, output.recommendation);
                        }
                        break;
                    }

                    case 'error':
                        setError(data.error as string);
                        setStage('input');
                        break;

                    // Ignore streaming and other events
                    case 'agent-start':
                    case 'agent-stream':
                    case 'round-complete':
                    case 'moderator-synthesis-start':
                    case 'moderator-stream':
                    case 'moderator-decision-start':
                        // These events are not needed in the new flow
                        break;
                }
            }
        } catch (err) {
            console.error('Debate error:', err);
            setError(err instanceof Error ? err.message : 'Debate failed');
            setStage('input');
        }
    };

    const handleReset = () => {
        // Stop any playing audio
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = '';
        }

        // Cancel any ongoing reveal animation
        if (revealAnimationRef.current) {
            cancelAnimationFrame(revealAnimationRef.current);
        }

        // Clear message state machine
        setCurrentMessage(null);
        setPendingMessages([]);
        setCompletedMessageIds(new Set());

        // Reset all other state
        setStage('input');
        setDecision('');
        setAdditionalContext('');
        setError(null);
        setIntelligenceResult(null);
        setResearchResults([]);
        setAgents([]);
        setChatMessages([]);
        setDecisionOutput(null);
        setTotalRounds(0);
    };

    // ========================================
    // Render Functions
    // ========================================

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography
                    variant="h3"
                    component="h1"
                    gutterBottom
                    sx={{
                        fontWeight: 700,
                        fontSize: { xs: '2rem', md: '3rem' },
                        letterSpacing: '-0.02em',
                        textTransform: 'uppercase',
                    }}
                >
                    INSIDE OUT
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                    {profile.name ? `${profile.name}, let` : 'Let'} AI tear apart your ideas before reality does
                </Typography>
            </Box>

            {/* Input Stage */}
            {stage === 'input' && (
                <>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Box sx={{ position: 'relative', mb: 2 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    variant="outlined"
                                    label="What decision are you considering?"
                                    placeholder="e.g., Should I quit my job to start a startup? / Should I buy a Tesla? / Should we pivot our product strategy?"
                                    value={decision}
                                    onChange={(e) => setDecision(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && decision.trim()) {
                                            e.preventDefault();
                                            handleStartAnalysis();
                                        }
                                    }}
                                />
                                <IconButton
                                    color={isRecording && recordingTarget === 'decision' ? 'error' : 'primary'}
                                    onClick={() =>
                                        isRecording && recordingTarget === 'decision'
                                            ? stopRecording()
                                            : startRecording('decision')
                                    }
                                    disabled={isRecording && recordingTarget !== 'decision'}
                                    sx={{
                                        position: 'absolute',
                                        right: 8,
                                        bottom: 8,
                                    }}
                                >
                                    {isRecording && recordingTarget === 'decision' ? <StopIcon /> : <MicIcon />}
                                </IconButton>
                            </Box>

                            {!showAdditionalContext && (
                                <Button
                                    variant="text"
                                    startIcon={<AddIcon />}
                                    onClick={() => setShowAdditionalContext(true)}
                                    sx={{ mb: 2 }}
                                >
                                    Add More Context
                                </Button>
                            )}

                            {showAdditionalContext && (
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Additional Context (optional)
                                        </Typography>
                                        <Tooltip title="Hide Additional Context">
                                            <IconButton
                                                size="small"
                                                onClick={() => setShowAdditionalContext(false)}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    <Box sx={{ position: 'relative' }}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            variant="outlined"
                                            placeholder="Provide any relevant context: budget, timeline, constraints, motivation, etc."
                                            value={additionalContext}
                                            onChange={(e) => setAdditionalContext(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey && decision.trim()) {
                                                    e.preventDefault();
                                                    handleStartAnalysis();
                                                }
                                            }}
                                        />
                                        <IconButton
                                            color={isRecording && recordingTarget === 'additionalContext' ? 'error' : 'primary'}
                                            onClick={() =>
                                                isRecording && recordingTarget === 'additionalContext'
                                                    ? stopRecording()
                                                    : startRecording('additionalContext')
                                            }
                                            disabled={isRecording && recordingTarget !== 'additionalContext'}
                                            sx={{
                                                position: 'absolute',
                                                right: 8,
                                                bottom: 8,
                                            }}
                                        >
                                            {isRecording && recordingTarget === 'additionalContext' ? <StopIcon /> : <MicIcon />}
                                        </IconButton>
                                    </Box>
                                </Box>
                            )}

                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<SendIcon />}
                                    onClick={handleStartAnalysis}
                                    disabled={!decision.trim()}
                                >
                                    Start Analysis
                                </Button>

                                <AgentSelector
                                    availableAgents={availableAgents}
                                    selectedAgents={selectedAgents}
                                    onAgentsSelected={setSelectedAgents}
                                    loading={agentsLoading}
                                />

                                <Tooltip title={usePersonalContext ? 'Using Personal Profile' : 'Personal Profile Off'}>
                                    <IconButton
                                        color={usePersonalContext ? 'primary' : 'default'}
                                        onClick={() => setUsePersonalContext(!usePersonalContext)}
                                    >
                                        {usePersonalContext ? <PersonIcon /> : <PersonOffIcon />}
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={audioEnabled ? 'Audio Enabled' : 'Audio Disabled'}>
                                    <IconButton
                                        color={audioEnabled ? 'primary' : 'default'}
                                        onClick={() => setAudioEnabled(!audioEnabled)}
                                    >
                                        {audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                                    </IconButton>
                                </Tooltip>

                                {isRecording && (
                                    <Chip
                                        label={`Recording ${recordingTarget === 'decision' ? 'Decision' : 'Context'}...`}
                                        color="error"
                                    />
                                )}
                            </Box>

                            {error && (
                                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Clarifying Questions Panel - Inline */}
                    <ClarifyingQuestionsPanel
                        open={clarifyingPanelOpen}
                        questions={currentClarifyingQuestions}
                        round={clarifyingRound}
                        onSubmit={handleClarifyingAnswers}
                        onSkip={handleSkipClarifying}
                    />
                </>
            )}

            {/* Intelligence Layer Stage */}
            {stage === 'intelligence' && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <CircularProgress size={20} sx={{ mr: 2 }} />
                            <Typography variant="h6">Evaluating your decision...</Typography>
                        </Box>
                        <LinearProgress />
                    </CardContent>
                </Card>
            )}

            {/* Research Stage */}
            {stage === 'research' && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <CircularProgress size={20} sx={{ mr: 2 }} />
                            <Typography variant="h6">Gathering research...</Typography>
                        </Box>
                        {intelligenceResult?.researchNeeded && (
                            <List>
                                {intelligenceResult.researchNeeded.map((task, i) => (
                                    <ListItem key={i}>
                                        <Chip label={task.type} sx={{ mr: 1 }} />
                                        <ListItemText primary={task.query} secondary={task.reasoning} />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                        <LinearProgress />
                    </CardContent>
                </Card>
            )}

            {/* Debate Stage */}
            {(stage === 'debate' || stage === 'results') && (
                <Box sx={{ mb: 3 }}>
                    <ChatTimeline messages={chatMessages} autoScroll={stage === 'debate'} />
                </Box>
            )}

            {/* Results Stage */}
            {stage === 'results' && decisionOutput && (
                <>
                    <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', mb: 3 }}>
                        <CardContent>
                            <Typography variant="h4" gutterBottom>
                                Decision Confidence: {decisionOutput.confidenceScore}/100
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={decisionOutput.confidenceScore}
                                sx={{
                                    height: 12,
                                    borderRadius: 6,
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor:
                                            decisionOutput.confidenceScore < 30
                                                ? 'error.main'
                                                : decisionOutput.confidenceScore < 60
                                                    ? 'warning.main'
                                                    : 'success.main',
                                    },
                                }}
                            />
                            <Typography variant="h6" sx={{ mt: 2 }}>
                                Recommendation: {decisionOutput.recommendation.replace(/_/g, ' ')}
                            </Typography>
                        </CardContent>
                    </Card>

                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Agent Consensus
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                <Box>
                                    <Typography variant="caption" color="success.main">
                                        Support ({decisionOutput.agentConsensus.support.length})
                                    </Typography>
                                    <Box>
                                        {decisionOutput.agentConsensus.support.map((name) => (
                                            <Chip key={name} label={name} size="small" color="success" sx={{ m: 0.5 }} />
                                        ))}
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="warning.main">
                                        Conditional ({decisionOutput.agentConsensus.conditional.length})
                                    </Typography>
                                    <Box>
                                        {decisionOutput.agentConsensus.conditional.map((name) => (
                                            <Chip key={name} label={name} size="small" color="warning" sx={{ m: 0.5 }} />
                                        ))}
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="error.main">
                                        Oppose ({decisionOutput.agentConsensus.oppose.length})
                                    </Typography>
                                    <Box>
                                        {decisionOutput.agentConsensus.oppose.map((name) => (
                                            <Chip key={name} label={name} size="small" color="error" sx={{ m: 0.5 }} />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {decisionOutput.blindSpots.length > 0 && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom color="error">
                                    Blind Spots Revealed
                                </Typography>
                                <List>
                                    {decisionOutput.blindSpots.map((spot, i) => (
                                        <ListItem key={i}>
                                            <ListItemText primary={`${i + 1}. ${spot}`} />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                    )}

                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Recommended Action
                            </Typography>
                            <Typography>{decisionOutput.recommendedAction}</Typography>
                        </CardContent>
                    </Card>

                    <Button variant="outlined" size="large" fullWidth onClick={handleReset}>
                        Analyze Another Decision
                    </Button>
                </>
            )}

            {/* Hidden audio player */}
            <audio ref={audioPlayerRef} style={{ display: 'none' }} />
        </Box>
    );
}
