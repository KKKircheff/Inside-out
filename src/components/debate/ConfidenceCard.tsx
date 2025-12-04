'use client';

import { Card, CardContent, Typography, LinearProgress, Box } from '@mui/material';

interface ConfidenceCardProps {
  confidenceScore: number;
  recommendation: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'RECONSIDER' | 'DO_NOT_PROCEED';
}

export default function ConfidenceCard({ confidenceScore, recommendation }: ConfidenceCardProps) {
  const getRecommendationColor = () => {
    switch (recommendation) {
      case 'PROCEED':
        return '#4caf50';
      case 'PROCEED_WITH_CAUTION':
        return '#ff9800';
      case 'RECONSIDER':
        return '#ff5722';
      case 'DO_NOT_PROCEED':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getProgressBarColor = () => {
    if (confidenceScore < 30) return 'error.main';
    if (confidenceScore < 60) return 'warning.main';
    return 'success.main';
  };

  return (
    <Card
      sx={{
        bgcolor: getRecommendationColor(),
        color: 'white',
        mb: 3,
        boxShadow: 3,
      }}
    >
      <CardContent>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Decision Confidence: {confidenceScore}/100
        </Typography>
        <LinearProgress
          variant="determinate"
          value={confidenceScore}
          sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: 'rgba(255,255,255,0.3)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'rgba(255,255,255,0.9)',
            },
          }}
        />
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Recommendation: {recommendation.replace(/_/g, ' ')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
