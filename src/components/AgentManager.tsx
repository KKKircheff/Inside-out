'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  TextField,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { getAllAgents, getUserCustomAgents, createCustomAgent, updateCustomAgent, deleteCustomAgent } from '@/app/actions/agents';
import type { Agent } from '@/lib/agents';
import { useAuth } from '@/contexts/AuthContext';
import { AVAILABLE_VOICES } from '@/lib/voice-constants';

interface AgentManagerProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Mock Marketplace Data
const MARKETPLACE_AGENTS: Partial<Agent>[] = [
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    emoji: '📊',
    role: 'Statistical Analysis Expert',
    personality: 'Analytical, data-driven, precise',
    color: '#10B981',
    avatarImage: '/Dexter.webp',
    systemPrompt: 'You are a Data Scientist analyzing decisions through statistical and analytical lens. Focus on data-driven insights, metrics, and quantifiable outcomes.',
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    emoji: '🎯',
    role: 'User-Centric Product Strategist',
    personality: 'Strategic, user-focused, pragmatic',
    color: '#8B5CF6',
    avatarImage: '/Joy.webp',
    systemPrompt: 'You are a Product Manager evaluating decisions from a product strategy perspective. Consider user needs, market fit, and product roadmap alignment.',
  },
  {
    id: 'security-expert',
    name: 'Security Expert',
    emoji: '🔒',
    role: 'Cybersecurity Specialist',
    personality: 'Cautious, thorough, risk-aware',
    color: '#EF4444',
    avatarImage: '/Fear.webp',
    systemPrompt: 'You are a Security Expert assessing decisions for security implications, vulnerabilities, and risk mitigation strategies.',
  },
  {
    id: 'ux-designer',
    name: 'UX Designer',
    emoji: '🎨',
    role: 'User Experience Advocate',
    personality: 'Empathetic, creative, user-focused',
    color: '#F59E0B',
    avatarImage: '/Joy.webp',
    systemPrompt: 'You are a UX Designer evaluating decisions based on user experience, usability, accessibility, and design principles.',
  },
  {
    id: 'lawyer',
    name: 'Legal Advisor',
    emoji: '⚖️',
    role: 'Compliance & Legal Expert',
    personality: 'Precise, compliance-focused, detail-oriented',
    color: '#6366F1',
    avatarImage: '/Sadness.webp',
    systemPrompt: 'You are a Legal Advisor analyzing decisions for legal compliance, regulatory requirements, and potential legal risks.',
  },
];

export default function AgentManager({ open, onClose }: AgentManagerProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for Create/Edit
  const [formData, setFormData] = useState<Partial<Agent>>({
    id: '',
    name: '',
    emoji: '',
    role: '',
    personality: '',
    color: '#3B82F6',
    avatarImage: '',
    systemPrompt: '',
    voice: '',
    model: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load agents
  useEffect(() => {
    if (open && user) {
      loadAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const loadAgents = async () => {
    if (!user) {
      setError('You must be logged in to manage agents');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const allAgents = await getAllAgents(user.uid);
      setAgents(allAgents);
    } catch (err) {
      setError('Failed to load agents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!user) {
      setError('You must be logged in to create agents');
      return;
    }

    if (!formData.name || !formData.systemPrompt) {
      setError('Please fill in all required fields (Name, System Prompt)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Remove id from formData since it will be generated from the name
      const { id: _id, ...agentData } = formData;
      await createCustomAgent(user.uid, agentData as Omit<Agent, 'id'>);
      setSuccess('Agent created successfully!');
      resetForm();
      await loadAgents();
      setTimeout(() => setTab(0), 1500); // Switch to "My Agents" tab
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!user) {
      setError('You must be logged in to update agents');
      return;
    }

    if (!editingId || !formData.name || !formData.systemPrompt) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Remove id from formData since we pass it separately
      const { id: _id, ...agentData } = formData;
      await updateCustomAgent(user.uid, editingId, agentData);
      setSuccess('Agent updated successfully!');
      resetForm();
      await loadAgents();
      setTab(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!user) {
      setError('You must be logged in to delete agents');
      return;
    }

    if (!confirm('Are you sure you want to delete this agent?')) return;

    setLoading(true);
    setError(null);
    try {
      await deleteCustomAgent(user.uid, id);
      setSuccess('Agent deleted successfully!');
      await loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setFormData(agent);
    setEditingId(agent.id);
    setTab(1);
  };

  const handleInstallAgent = async (agent: Partial<Agent>) => {
    if (!user) {
      setError('You must be logged in to install agents');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Remove id from agent since it will be generated from the name
      const { id: _id, ...agentData } = agent;
      await createCustomAgent(user.uid, agentData as Omit<Agent, 'id'>);
      setSuccess(`${agent.name} installed successfully!`);
      await loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install agent');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      emoji: '',
      role: '',
      personality: '',
      color: '#3B82F6',
      avatarImage: '',
      systemPrompt: '',
      voice: '',
      model: '',
    });
    setEditingId(null);
  };

  const handleClose = () => {
    resetForm();
    setError(null);
    setSuccess(null);
    setTab(0);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(20, 20, 20, 0.98)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Agent Management</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
          <Tab label="My Agents" />
          <Tab label={editingId ? 'Edit Agent' : 'Create New'} />
          <Tab label="Marketplace" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ m: 2 }}>
            {success}
          </Alert>
        )}

        {/* Tab 0: My Agents */}
        <TabPanel value={tab} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : agents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No agents found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System agents should appear here. Try refreshing the page.
              </Typography>
            </Box>
          ) : (
            <List>
              {agents.map((agent) => (
                <ListItem
                  key={agent.id}
                  secondaryAction={
                    !agent.isSystemAgent ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="My Agent" size="small" color="success" variant="outlined" />
                        <IconButton
                          edge="end"
                          onClick={() => handleEditAgent(agent)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteAgent(agent.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Chip label="System" size="small" color="primary" variant="outlined" />
                    )
                  }
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Typography variant="h5">{agent.emoji || '🤖'}</Typography>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={600}>
                          {agent.name}
                        </Typography>
                      }
                      secondary={agent.role}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Tab 1: Create/Edit */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              helperText="The agent's name (ID will be auto-generated from this)"
            />

            <TextField
              label="Emoji"
              value={formData.emoji || ''}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              fullWidth
              helperText="Single emoji character"
            />

            <TextField
              label="Role"
              value={formData.role || ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              fullWidth
              helperText="Brief description of the agent's role"
            />

            <TextField
              label="Personality"
              value={formData.personality || ''}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              fullWidth
              helperText="Agent's personality traits"
            />

            <TextField
              label="Color"
              type="color"
              value={formData.color || '#3B82F6'}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              fullWidth
            />

            <TextField
              label="Avatar Image"
              value={formData.avatarImage || ''}
              onChange={(e) => setFormData({ ...formData, avatarImage: e.target.value })}
              fullWidth
              helperText="Optional: Path to avatar image (e.g., '/Joy.webp')"
              placeholder="/Joy.webp"
            />

            <TextField
              label="System Prompt"
              value={formData.systemPrompt || ''}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              multiline
              rows={8}
              fullWidth
              required
              helperText="Detailed instructions for the agent's behavior"
            />

            <FormControl fullWidth>
              <InputLabel id="voice-select-label">Voice</InputLabel>
              <Select
                labelId="voice-select-label"
                value={formData.voice || 'alloy'}
                onChange={(e) => setFormData({ ...formData, voice: e.target.value })}
                label="Voice"
              >
                {AVAILABLE_VOICES.map((voice) => (
                  <MenuItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Select voice for text-to-speech</FormHelperText>
            </FormControl>

            <TextField
              label="Model"
              value={formData.model || ''}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              fullWidth
              helperText="Optional: AI model to use for this agent"
              placeholder="gpt-4"
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={resetForm} variant="outlined">
                {editingId ? 'Cancel' : 'Reset'}
              </Button>
              <Button
                onClick={editingId ? handleUpdateAgent : handleCreateAgent}
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : editingId ? 'Update Agent' : 'Create Agent'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* Tab 2: Marketplace */}
        <TabPanel value={tab} index={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Discover and install new agents from the community marketplace
          </Typography>
          <List>
            {MARKETPLACE_AGENTS.map((agent) => {
              const isInstalled = agents.some(a => a.id === agent.id);
              return (
                <ListItem
                  key={agent.id}
                  secondaryAction={
                    <Button
                      variant={isInstalled ? 'outlined' : 'contained'}
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => !isInstalled && handleInstallAgent(agent)}
                      disabled={isInstalled || loading}
                      sx={{
                        borderColor: isInstalled ? 'success.main' : undefined,
                        color: isInstalled ? 'success.main' : undefined,
                      }}
                    >
                      {isInstalled ? 'Installed' : 'Install'}
                    </Button>
                  }
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, mr: 2 }}>
                    <Typography variant="h5">{agent.emoji || '🤖'}</Typography>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={600}>
                          {agent.name}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" component="span" display="block" color="text.secondary">
                            {agent.role}
                          </Typography>
                          <Typography variant="caption" component="span" display="block" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            {agent.personality}
                          </Typography>
                        </>
                      }
                    />
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}
