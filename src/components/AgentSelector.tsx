'use client';

import { useState, useEffect } from 'react';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import { Psychology as PsychologyIcon } from '@mui/icons-material';
import type { Agent } from '@/lib/agents';

interface AgentSelectorProps {
  availableAgents: Agent[];
  selectedAgents?: Agent[];
  onAgentsSelected?: (agents: Agent[]) => void;
  loading?: boolean;
}

export default function AgentSelector({
  availableAgents,
  selectedAgents: externalSelectedAgents,
  onAgentsSelected,
  loading = false
}: AgentSelectorProps) {
  const [open, setOpen] = useState(false);

  // Use external selection if provided, otherwise default to all agents
  const initialSelection = externalSelectedAgents && externalSelectedAgents.length > 0
    ? new Set(externalSelectedAgents.map(a => a.id))
    : new Set(availableAgents.map(a => a.id));

  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(initialSelection);

  // Sync internal state when dialog opens and external selection changes
  useEffect(() => {
    if (open && externalSelectedAgents) {
      const newSelection = externalSelectedAgents.length > 0
        ? new Set(externalSelectedAgents.map(a => a.id))
        : new Set(availableAgents.map(a => a.id));
      setSelectedAgents(newSelection);
    }
  }, [open, externalSelectedAgents, availableAgents]);

  const handleToggleAgent = (agentId: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgents(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedAgents(new Set(availableAgents.map(a => a.id)));
  };

  const handleUseDefault = () => {
    // Use default logic (selectDebateAgents will be used)
    setSelectedAgents(new Set(availableAgents.map(a => a.id)));
    setOpen(false);
    if (onAgentsSelected) {
      onAgentsSelected([]);
    }
  };

  const handleApply = () => {
    const selected = availableAgents.filter(a => selectedAgents.has(a.id));
    setOpen(false);
    if (onAgentsSelected) {
      onAgentsSelected(selected);
    }
  };

  const handleClose = () => {
    // Reset to external selection when closing without applying
    if (externalSelectedAgents && externalSelectedAgents.length > 0) {
      setSelectedAgents(new Set(externalSelectedAgents.map(a => a.id)));
    } else {
      setSelectedAgents(new Set(availableAgents.map(a => a.id)));
    }
    setOpen(false);
  };

  return (
    <>
      <Tooltip title={loading ? "Loading agents..." : "Select Agents"} placement="top">
        <span>
          <IconButton
            onClick={() => setOpen(true)}
            size="large"
            disabled={loading || availableAgents.length === 0}
            sx={{
              color: selectedAgents.size === availableAgents.length ? 'primary.main' : 'warning.main',
            }}
          >
            <PsychologyIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(20, 20, 20, 0.98)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>
          <Box>
            <Typography variant="h6" component="div">Select Debate Agents</Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              Choose which agents will participate in the debate
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {availableAgents.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No agents available. Loading...
              </Typography>
            ) : (
              availableAgents.map((agent) => (
                <FormControlLabel
                  key={agent.id}
                  control={
                    <Checkbox
                      checked={selectedAgents.has(agent.id)}
                      onChange={() => handleToggleAgent(agent.id)}
                      sx={{
                        color: agent.color,
                        '&.Mui-checked': {
                          color: agent.color,
                        },
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '1.2rem' }}>{agent.emoji || '🤖'}</span>
                      <Box>
                        <Typography variant="body1">{agent.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.role}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              ))
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Selected: {selectedAgents.size} / {availableAgents.length} agents
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleSelectAll} variant="outlined" size="small">
            Select All
          </Button>
          <Button onClick={handleUseDefault} variant="outlined" size="small">
            Use Default
          </Button>
          <Button
            onClick={handleApply}
            variant="contained"
            disabled={selectedAgents.size === 0}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
