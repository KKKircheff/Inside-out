'use client';

import { Card, CardContent, Typography, List, ListItem, ListItemText, Alert, Box } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface BlindSpotsCardProps {
  blindSpots: string[];
}

export default function BlindSpotsCard({ blindSpots }: BlindSpotsCardProps) {
  if (blindSpots.length === 0) {
    return null;
  }

  return (
    <Card sx={{ mb: 3, boxShadow: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WarningIcon color="error" sx={{ mr: 1 }} />
          <Typography variant="h6" color="error" sx={{ fontWeight: 600 }}>
            Blind Spots Revealed
          </Typography>
        </Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          These are potential issues or considerations that may have been overlooked in your decision-making process.
        </Alert>
        <List>
          {blindSpots.map((spot, i) => (
            <ListItem key={i} sx={{ py: 0.5 }}>
              <ListItemText
                primary={`${i + 1}. ${spot}`}
                primaryTypographyProps={{
                  fontSize: '0.95rem',
                }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
