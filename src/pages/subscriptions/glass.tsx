import { GlassButton, GlassCard } from "@zakisheriff/liquid-glass";
import type { ComponentProps } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import "@zakisheriff/liquid-glass/styles.css";

/** Keep library-specific material settings at the page boundary. */
export function GlassPanel(props: ComponentProps<typeof GlassCard>) {
	const reducedMotion = useMediaQuery({ prefersReducedMotion: true });
	return <GlassCard radius="26px" intensity={reducedMotion ? 1 : 2} {...props} />;
}

export function GlassAction(props: ComponentProps<typeof GlassButton>) {
	const reducedMotion = useMediaQuery({ prefersReducedMotion: true });
	return <GlassButton intensity={reducedMotion ? 1 : 3} shimmer={!reducedMotion} {...props} />;
}
