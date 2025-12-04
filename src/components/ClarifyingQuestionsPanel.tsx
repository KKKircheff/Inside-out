'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Alert } from '@mui/material';

interface ClarifyingQuestionsPanelProps {
    open: boolean;
    questions: string[];
    round: number;
    onSubmit: (answers: string[]) => void;
    onSkip: () => void;
}

export default function ClarifyingQuestionsPanel({
    open,
    questions,
    round,
    onSubmit,
    onSkip,
}: ClarifyingQuestionsPanelProps) {
    const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));

    // Reset answers when questions change
    useEffect(() => {
        setAnswers(Array(questions.length).fill(''));
    }, [questions.length]);

    const handleSubmit = () => {
        onSubmit(answers);
        setAnswers(Array(questions.length).fill('')); // Reset for next round
    };

    const handleSkip = () => {
        onSkip();
        setAnswers(Array(questions.length).fill(''));
    };

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const hasAnyAnswer = answers.some(answer => answer.trim().length > 0);

    if (!open) return null;

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                {/* Header */}
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Help us understand better
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        1 question to help us understand better
                    </Typography>
                </Alert>

                {/* Questions Content */}
                <Box>
                    {questions.map((question, index) => (
                        <Box key={index} sx={{ mb: 3 }}>
                            <Typography
                                variant="body1"
                                sx={{ mb: 1.5, fontWeight: 500 }}
                            >
                                {question}
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                variant="outlined"
                                placeholder="Your answer..."
                                value={answers[index]}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && hasAnyAnswer) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                        </Box>
                    ))}
                </Box>

                {/* Footer Actions */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'flex-end',
                        mt: 2,
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={handleSkip}
                    >
                        Skip
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!hasAnyAnswer}
                    >
                        Submit Answers
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}
