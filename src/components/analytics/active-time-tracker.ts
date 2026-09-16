export const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

type ActiveTimeTrackerOptions = {
	now?: () => number;
	idleTimeoutMs?: number;
	visible?: boolean;
	focused?: boolean;
};

export class ActiveTimeTracker {
	private readonly now: () => number;
	private readonly idleTimeoutMs: number;
	private accumulatedMs = 0;
	private runningSince: number | null = null;
	private lastActivityAt: number;
	private visible: boolean;
	private focused: boolean;

	constructor(options: ActiveTimeTrackerOptions = {}) {
		this.now = options.now ?? (() => performance.now());
		this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
		this.visible = options.visible ?? true;
		this.focused = options.focused ?? true;
		this.lastActivityAt = this.now();
		this.sync(this.lastActivityAt);
	}

	recordActivity(at = this.now()) {
		this.sync(at);
		this.lastActivityAt = at;
		this.sync(at);
	}

	setVisible(visible: boolean, at = this.now()) {
		this.sync(at);
		this.visible = visible;
		this.sync(at);
	}

	setFocused(focused: boolean, at = this.now()) {
		this.sync(at);
		this.focused = focused;
		this.sync(at);
	}

	getActiveDurationMs(at = this.now()) {
		this.sync(at);
		if (this.runningSince === null) return Math.round(this.accumulatedMs);
		return Math.round(this.accumulatedMs + at - this.runningSince);
	}

	private sync(at: number) {
		const idleAt = this.lastActivityAt + this.idleTimeoutMs;
		const shouldRun = this.visible && this.focused && at < idleAt;

		if (this.runningSince !== null && !shouldRun) {
			const stoppedAt = Math.min(at, idleAt);
			this.accumulatedMs += Math.max(0, stoppedAt - this.runningSince);
			this.runningSince = null;
			return;
		}

		if (this.runningSince === null && shouldRun) this.runningSince = at;
	}
}
