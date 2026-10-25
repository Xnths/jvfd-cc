import { BookOpen, Brain, Clock, Compass, Flag, GraduationCap, Heart, LifeBuoy, MapPin, MessageCircle, Puzzle, Shield, Sparkles, Sun, Target, Users, type LucideIcon } from "lucide-react";

// Same allowlist as the Go API (validIcons in internal/api/admin.go).
export const SERVICE_ICONS: Record<string, LucideIcon> = {
    heart: Heart, brain: Brain, target: Target, "life-buoy": LifeBuoy, users: Users, compass: Compass, "graduation-cap": GraduationCap,
    "book-open": BookOpen, shield: Shield, sparkles: Sparkles, "message-circle": MessageCircle, sun: Sun, flag: Flag, puzzle: Puzzle, clock: Clock, "map-pin": MapPin,
};
export const iconFor = (name: string | undefined): LucideIcon => SERVICE_ICONS[name ?? ""] ?? Heart;
