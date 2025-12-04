'use client';

import { Box, List, ListItem, ListItemButton, ListItemText, Typography, IconButton, Drawer, Button, Chip } from '@mui/material';
import { Add as AddIcon, Menu as MenuIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { DebateRecord } from '@/app/actions/debates';

interface SidebarProps {
    history: DebateRecord[];
    onNewDecision: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

// Helper function to format date
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Helper function to get recommendation color
function getRecommendationColor(recommendation: string): string {
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
}

export default function Sidebar({ history, onNewDecision, open = true, onOpenChange }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const desktopOpen = open;

    // Determine current debate ID from pathname
    const currentDebateId = pathname.startsWith('/debates/') ? pathname.split('/')[2] : undefined;

    const setDesktopOpen = (value: boolean) => {
        if (onOpenChange) {
            onOpenChange(value);
        }
    };

    const drawerWidth = 280;

    const drawerContent = (
        <Box
            sx={{
                width: drawerWidth,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'rgba(20, 20, 20, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <IconButton
                        onClick={() => setDesktopOpen(false)}
                        size="small"
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                                color: 'white',
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                            },
                        }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                </Box>
                <Button
                    onClick={onNewDecision}
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    sx={{
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 2,
                        py: 1.5,
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                            borderColor: 'rgba(255, 255, 255, 0.4)',
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                        },
                        transition: 'all 0.2s ease',
                    }}
                >
                    New Decision
                </Button>
            </Box>

            {/* History List */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
                    Recent Decisions
                </Typography>
                <List sx={{ p: 0 }}>
                    {history.length === 0 ? (
                        <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No previous decisions yet
                            </Typography>
                        </Box>
                    ) : (
                        history.map((item) => (
                            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => {
                                        router.push(`/debates/${item.id}`);
                                        setMobileOpen(false); // Close mobile drawer on selection
                                    }}
                                    selected={currentDebateId === item.id}
                                    sx={{
                                        borderRadius: 1,
                                        py: 1.5,
                                        px: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        '&.Mui-selected': {
                                            bgcolor: 'rgba(59, 130, 246, 0.15)',
                                            '&:hover': {
                                                bgcolor: 'rgba(59, 130, 246, 0.2)',
                                            },
                                        },
                                        '&:hover': {
                                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={item.decision}
                                        secondary={formatDate(item.createdAt)}
                                        primaryTypographyProps={{
                                            noWrap: true,
                                            fontSize: '0.875rem',
                                            fontWeight: currentDebateId === item.id ? 600 : 400,
                                            mb: 0.5,
                                        }}
                                        secondaryTypographyProps={{
                                            fontSize: '0.75rem',
                                            mb: 0.5,
                                        }}
                                    />
                                    {item.output && (
                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                            <Chip
                                                label={item.output.recommendation.replace(/_/g, ' ')}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.65rem',
                                                    height: '20px',
                                                    bgcolor: getRecommendationColor(item.output.recommendation),
                                                    color: 'white',
                                                    fontWeight: 600,
                                                }}
                                            />
                                            <Chip
                                                label={`${item.output.confidenceScore}%`}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.65rem',
                                                    height: '20px',
                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white',
                                                }}
                                            />
                                        </Box>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        ))
                    )}
                </List>
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="caption" color="text.secondary">
                    Devil&apos;s Advocate as a Service
                </Typography>
            </Box>
        </Box>
    );

    return (
        <>
            {/* Toggle Button - Shows when sidebar is closed */}
            {!desktopOpen && (
                <IconButton
                    onClick={() => setDesktopOpen(true)}
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        position: 'fixed',
                        top: 16,
                        left: 16,
                        zIndex: 1200,
                        bgcolor: 'rgba(20, 20, 20, 0.95)',
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                            bgcolor: 'rgba(30, 30, 30, 0.95)',
                        },
                    }}
                >
                    <MenuIcon />
                </IconButton>
            )}

            {/* Mobile Menu Button */}
            <IconButton
                onClick={() => setMobileOpen(!mobileOpen)}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 1300,
                    bgcolor: 'rgba(20, 20, 20, 0.95)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                        bgcolor: 'rgba(30, 30, 30, 0.95)',
                    },
                }}
            >
                <MenuIcon />
            </IconButton>

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{
                    keepMounted: true, // Better mobile performance
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Drawer - Fixed Position */}
            <Box
                sx={{
                    display: { xs: 'none', md: desktopOpen ? 'block' : 'none' },
                    width: drawerWidth,
                    flexShrink: 0,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    zIndex: 1100,
                }}
            >
                {drawerContent}
            </Box>
        </>
    );
}
