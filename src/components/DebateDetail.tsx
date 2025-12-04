'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { getDebate, type DebateRecord } from '@/app/actions/debates';
import ConfidenceCard from './debate/ConfidenceCard';
import ConsensusCard from './debate/ConsensusCard';
import BlindSpotsCard from './debate/BlindSpotsCard';

interface DebateDetailProps {
  debateId: string;
}

export default function DebateDetail({ debateId }: DebateDetailProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [debate, setDebate] = useState<DebateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDebate = async () => {
      if (!user) {
        setError('Please sign in to view this debate');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const debateData = await getDebate(user.uid, debateId);

        if (!debateData) {
          setError('Debate not found');
          setLoading(false);
          return;
        }

        setDebate(debateData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading debate:', err);
        setError('Failed to load debate. Please try again.');
        setLoading(false);
      }
    };

    loadDebate();
  }, [user, debateId]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !debate) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Debate not found'}
        </Alert>
        <Button variant="contained" startIcon={<HomeIcon />} onClick={handleGoHome}>
          Go to Home
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header with Navigation */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tooltip title="Go Back">
            <IconButton onClick={handleGoBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<HomeIcon />} onClick={handleGoHome}>
            New Decision
          </Button>
        </Box>

        {/* Title Section */}
        <Card sx={{ mb: 4, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PsychologyIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
                Debate Analysis
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              {debate.decision}
            </Typography>
            {debate.additionalContext && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Context:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {debate.additionalContext}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 2 }}>
              <Chip icon={<CalendarIcon />} label={formatDate(debate.createdAt)} variant="outlined" />
              <Chip label={`${debate.totalRounds} Rounds`} color="primary" variant="outlined" />
              {debate.intelligenceStatus && (
                <Chip label={`Status: ${debate.intelligenceStatus}`} variant="outlined" />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Agents Section */}
        <Card sx={{ mb: 4, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Participating Agents
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
              {debate.selectedAgents.map((agent) => (
                <Box
                  key={agent.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                  }}
                >
                  {agent.avatarImage ? (
                    <Avatar src={agent.avatarImage} sx={{ width: 32, height: 32 }} />
                  ) : (
                    <Typography sx={{ fontSize: '1.5rem' }}>{agent.emoji}</Typography>
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {agent.name}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Decision Output Cards */}
        {debate.output && (
          <>
            <ConfidenceCard
              confidenceScore={debate.output.confidenceScore}
              recommendation={debate.output.recommendation}
            />

            <ConsensusCard consensus={debate.output.agentConsensus} />

            <BlindSpotsCard blindSpots={debate.output.blindSpots} />

            {/* Recommended Action */}
            <Card sx={{ mb: 4, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Recommended Action
                </Typography>
                <Typography variant="body1">{debate.output.recommendedAction}</Typography>
              </CardContent>
            </Card>

            {/* Key Insights */}
            {debate.output.keyInsights && debate.output.keyInsights.length > 0 && (
              <Card sx={{ mb: 4, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Key Insights
                  </Typography>
                  <Stack spacing={2}>
                    {debate.output.keyInsights.map((insight, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 2,
                          bgcolor: 'background.default',
                          borderRadius: 1,
                          borderLeft: '4px solid',
                          borderColor: 'primary.main',
                        }}
                      >
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {insight.agentName}
                        </Typography>
                        <Typography variant="body2">{insight.insight}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Bottom Action */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button variant="contained" size="large" startIcon={<HomeIcon />} onClick={handleGoHome}>
            Analyze Another Decision
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
