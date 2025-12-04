import { Avatar, Box } from '@mui/material';

interface AgentAvatarProps {
    name: string;
    color: string;
    emoji?: string;
    avatarImage?: string;
    size?: 'small' | 'medium' | 'large';
}

export default function AgentAvatar({ name, color, emoji, avatarImage, size = 'medium' }: AgentAvatarProps) {
    const sizeMap = {
        small: 32,
        medium: 40,
        large: 78,
    };

    const fontSize = {
        small: '0.875rem',
        medium: '1rem',
        large: '1.5rem',
    };

    // Get first letter of name for fallback
    const initial = name.charAt(0).toUpperCase();

    return (
        <Box sx={{ position: 'relative' }}>
            <Avatar
                src={avatarImage}
                alt={name}
                sx={{
                    bgcolor: color,
                    width: sizeMap[size],
                    height: sizeMap[size],
                    fontSize: fontSize[size],
                    fontWeight: 600,
                }}
            >
                {!avatarImage && initial}
            </Avatar>
            {emoji && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        fontSize: size === 'large' ? '1.68rem' : '0.875rem',
                        lineHeight: 1,
                        bgcolor: 'background.paper',
                        borderRadius: '50%',
                        padding: '2px',
                    }}
                >
                    {emoji}
                </Box>
            )}
        </Box>
    );
}
