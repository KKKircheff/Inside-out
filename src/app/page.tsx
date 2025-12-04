'use client';

import { useState, useEffect } from 'react';
import { Container, Box, IconButton, Tooltip } from '@mui/material';
import { AccountCircle as AccountCircleIcon, Store as StoreIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DebateInterface from '@/components/DebateInterface';
import Sidebar from '@/components/Sidebar';
import AgentManager from '@/components/AgentManager';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDebates, type DebateRecord } from '@/app/actions/debates';

export default function Home() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [history, setHistory] = useState<DebateRecord[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentManagerOpen, setAgentManagerOpen] = useState(false);
  const [debateInterfaceKey, setDebateInterfaceKey] = useState(0);

  // Load debate history from Firestore when user is authenticated
  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      try {
        const debates = await getUserDebates(user.uid, 50);
        setHistory(debates);
      } catch (error) {
        console.error('Failed to load debate history:', error);
      }
    };

    loadHistory();
  }, [user]);

  const handleNewDecision = () => {
    // Reload the page to reset the debate interface
    window.location.reload();
  };

  const handleSaveDecision = async (decision: string, recommendation?: string) => {
    if (!user) return;

    // The debate will be saved automatically via DebateInterface
    // This callback is just for updating the sidebar
    const debates = await getUserDebates(user.uid, 50);
    setHistory(debates);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleAgentManagerClose = () => {
    setAgentManagerOpen(false);
    // Force DebateInterface to reload agents by changing key
    setDebateInterfaceKey(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          position: 'relative',
        }}
      >
        {/* Agent Manager Dialog */}
        <AgentManager open={agentManagerOpen} onClose={handleAgentManagerClose} />

        {/* Sidebar */}
        <Sidebar
          history={history}
          onNewDecision={handleNewDecision}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />

        {/* Sign Out Button - Top Right (leftmost) */}
        <Tooltip title="Sign Out" placement="left">
          <IconButton
            onClick={handleSignOut}
            sx={{
              position: 'fixed',
              top: 16,
              right: 144,
              bgcolor: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
              },
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <LogoutIcon fontSize="large" />
          </IconButton>
        </Tooltip>

        {/* Agent Manager Button - Top Right (middle) */}
        <Tooltip title="Agent Marketplace" placement="left">
          <IconButton
            onClick={() => setAgentManagerOpen(true)}
            sx={{
              position: 'fixed',
              top: 16,
              right: 80,
              bgcolor: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              '&:hover': {
                bgcolor: 'rgba(30, 30, 30, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
              },
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <StoreIcon fontSize="large" />
          </IconButton>
        </Tooltip>

        {/* Profile Button - Top Right (rightmost) */}
        <Tooltip title="Edit Profile" placement="left">
          <IconButton
            onClick={() => router.push('/profile')}
            sx={{
              position: 'fixed',
              top: 16,
              right: 16,
              bgcolor: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              '&:hover': {
                bgcolor: 'rgba(30, 30, 30, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
              },
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <AccountCircleIcon fontSize="large" />
          </IconButton>
        </Tooltip>

        <Container maxWidth="lg">
          <DebateInterface key={debateInterfaceKey} onSaveDecision={handleSaveDecision} />
        </Container>
      </Box>
    </ProtectedRoute>
  );
}
