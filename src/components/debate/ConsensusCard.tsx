'use client';

import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

interface ConsensusCardProps {
  consensus: {
    support: string[];
    conditional: string[];
    oppose: string[];
  };
}

export default function ConsensusCard({ consensus }: ConsensusCardProps) {
  return (
    <Card sx={{ mb: 3, boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Agent Consensus
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Support */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, fontWeight: 600 }}>
              Support ({consensus.support.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {consensus.support.length > 0 ? (
                consensus.support.map((name) => (
                  <Chip key={name} label={name} size="small" color="success" />
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  None
                </Typography>
              )}
            </Box>
          </Box>

          {/* Conditional */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 600 }}>
              Conditional ({consensus.conditional.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {consensus.conditional.length > 0 ? (
                consensus.conditional.map((name) => (
                  <Chip key={name} label={name} size="small" color="warning" />
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  None
                </Typography>
              )}
            </Box>
          </Box>

          {/* Oppose */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="error.main" sx={{ mb: 1, fontWeight: 600 }}>
              Oppose ({consensus.oppose.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {consensus.oppose.length > 0 ? (
                consensus.oppose.map((name) => (
                  <Chip key={name} label={name} size="small" color="error" />
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  None
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
