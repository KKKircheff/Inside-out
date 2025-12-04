'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    MenuItem,
    IconButton,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    Tooltip,
} from '@mui/material';
import {
    Close as CloseIcon,
    Person as PersonIcon,
    Cake as CakeIcon,
    Work as WorkIcon,
    Place as PlaceIcon,
    AccountBalance as AccountBalanceIcon,
    EmojiEvents as EmojiEventsIcon,
    TrendingUp as TrendingUpIcon,
    FamilyRestroom as FamilyRestroomIcon,
    Notes as NotesIcon,
} from '@mui/icons-material';
import { useUserProfile, type UserProfile } from '@/contexts/UserProfileContext';

type ProfileField = keyof UserProfile;

interface FieldConfig {
    key: ProfileField;
    label: string;
    icon: React.ReactNode;
    type: 'text' | 'number' | 'select' | 'multiline';
    placeholder?: string;
    options?: { value: string; label: string }[];
    rows?: number;
}

export default function ProfilePage() {
    const router = useRouter();
    const { profile, updateProfile } = useUserProfile();
    const [formData, setFormData] = useState(profile);
    const [saved, setSaved] = useState(false);

    const fieldConfigs: FieldConfig[] = [
        { key: 'name', label: 'Name', icon: <PersonIcon />, type: 'text', placeholder: 'Your name' },
        { key: 'age', label: 'Age', icon: <CakeIcon />, type: 'number', placeholder: 'Your age' },
        { key: 'occupation', label: 'Occupation', icon: <WorkIcon />, type: 'text', placeholder: 'Your occupation' },
        { key: 'location', label: 'Location', icon: <PlaceIcon />, type: 'text', placeholder: 'Your location' },
        { key: 'financialSituation', label: 'Financial Situation', icon: <AccountBalanceIcon />, type: 'multiline', placeholder: 'e.g., Stable income, $50k savings', rows: 2 },
        { key: 'personalGoals', label: 'Personal Goals', icon: <EmojiEventsIcon />, type: 'multiline', placeholder: 'e.g., Build a successful startup', rows: 2 },
        {
            key: 'riskTolerance',
            label: 'Risk Tolerance',
            icon: <TrendingUpIcon />,
            type: 'select',
            options: [
                { value: 'low', label: 'Low - Prefer safety and stability' },
                { value: 'medium', label: 'Medium - Balanced approach' },
                { value: 'high', label: 'High - Willing to take significant risks' }
            ]
        },
        { key: 'familyStatus', label: 'Family Status', icon: <FamilyRestroomIcon />, type: 'text', placeholder: 'e.g., Single, no dependents' },
        { key: 'additionalContext', label: 'Additional Information', icon: <NotesIcon />, type: 'multiline', placeholder: 'Any other relevant information...', rows: 4 }
    ];

    const handleChange = (field: ProfileField, value: string | number) => {
        setFormData({ ...formData, [field]: value });
        setSaved(false);
    };

    const handleSave = () => {
        updateProfile(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
            <Container maxWidth="md">
                <Dialog
                    open={true}
                    onClose={() => router.push('/')}
                    maxWidth="md"
                    fullWidth
                    slotProps={{
                        paper: {
                            sx: {
                                bgcolor: 'rgba(20, 20, 20, 0.98)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2,
                                maxHeight: '90vh',
                            },
                        },
                    }}
                >
                    <DialogTitle>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                    Personal Profile
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Your personal context for decision analyses
                                </Typography>
                            </Box>
                            <Tooltip title="Close">
                                <IconButton onClick={() => router.push('/')} edge="end">
                                    <CloseIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </DialogTitle>

                    <DialogContent sx={{ pt: 2 }}>
                        {saved && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                Profile saved successfully!
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {fieldConfigs.map((config) => (
                                <Box
                                    key={config.key}
                                    sx={{
                                        display: 'flex',
                                        alignItems: config.type === 'multiline' ? 'flex-start' : 'center',
                                        gap: 2,
                                    }}
                                >
                                    {/* Icon */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 48,
                                            height: 48,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(100, 100, 100, 0.3)',
                                            color: 'primary.main',
                                            flexShrink: 0,
                                            mt: config.type === 'multiline' ? 1 : 0,
                                        }}
                                    >
                                        {config.icon}
                                    </Box>

                                    {/* Input Field */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            {config.label}
                                        </Typography>
                                        {config.type === 'select' ? (
                                            <TextField
                                                fullWidth
                                                select
                                                size="small"
                                                value={formData[config.key]}
                                                onChange={(e) => handleChange(config.key, e.target.value)}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        bgcolor: 'rgba(40, 40, 40, 0.8)',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(50, 50, 50, 0.9)',
                                                        },
                                                    },
                                                }}
                                            >
                                                {config.options?.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        ) : (
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type={config.type === 'number' ? 'number' : 'text'}
                                                multiline={config.type === 'multiline'}
                                                rows={config.rows}
                                                placeholder={config.placeholder}
                                                value={formData[config.key]}
                                                onChange={(e) =>
                                                    handleChange(
                                                        config.key,
                                                        config.type === 'number'
                                                            ? parseInt(e.target.value) || 0
                                                            : e.target.value
                                                    )
                                                }
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        bgcolor: 'rgba(40, 40, 40, 0.8)',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(50, 50, 50, 0.9)',
                                                        },
                                                    },
                                                }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" onClick={() => router.push('/')}>
                                Cancel
                            </Button>
                            <Button variant="contained" onClick={handleSave}>
                                Save Profile
                            </Button>
                        </Box>
                    </DialogContent>
                </Dialog>
            </Container>
        </Box>
    );
}
