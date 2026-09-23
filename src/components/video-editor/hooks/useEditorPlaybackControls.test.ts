import { describe, expect, it, vi } from "vitest";
import { useEditorPlaybackControls } from "./useEditorPlaybackControls";

vi.mock("react", () => ({
	useCallback: (callback: unknown) => callback,
	useRef: (current: unknown) => ({ current }),
}));

describe("useEditorPlaybackControls frame stepping", () => {
	function setup(timelinePlayheadTime = 5.0, timelineDuration = 10.0) {
		const video = {};
		const playback = {
			video,
			isPlaying: false,
			pause: vi.fn(() => {
				playback.isPlaying = false;
			}),
			play: vi.fn().mockResolvedValue(undefined),
			seekTimeline: vi.fn(),
		};
		const videoPlaybackRef = { current: playback };
		const timelineRef = {
			current: {
				keyframes: [
					{ id: "k1", time: 2000 },
					{ id: "k2", time: 8000 },
				],
			},
		};
		const playSourceAudioPreview = vi.fn();

		const controls = useEditorPlaybackControls({
			videoPlaybackRef: videoPlaybackRef as unknown as Parameters<
				typeof useEditorPlaybackControls
			>[0]["videoPlaybackRef"],
			timelineRef: timelineRef as unknown as Parameters<
				typeof useEditorPlaybackControls
			>[0]["timelineRef"],
			playSourceAudioPreview,
			timelinePlayheadTime,
			timelineDuration,
		});

		return { controls, playback, videoPlaybackRef, timelineRef };
	}

	it("steps forward by 1 frame (1/60s) and pauses active playback", () => {
		const { controls, playback } = setup(2.0, 10.0);
		playback.isPlaying = true;

		controls.stepFrameForward();

		expect(playback.pause).toHaveBeenCalled();
		expect(playback.seekTimeline).toHaveBeenCalledWith(expect.closeTo(2.0 + 1 / 60, 5));
	});

	it("steps backward by 1 frame (1/60s) and pauses active playback", () => {
		const { controls, playback } = setup(2.0, 10.0);
		playback.isPlaying = true;

		controls.stepFrameBackward();

		expect(playback.pause).toHaveBeenCalled();
		expect(playback.seekTimeline).toHaveBeenCalledWith(expect.closeTo(2.0 - 1 / 60, 5));
	});

	it("supports custom fps (e.g. 30fps) for frame stepping", () => {
		const { controls, playback } = setup(2.0, 10.0);

		controls.stepFrameForward(30);
		expect(playback.seekTimeline).toHaveBeenCalledWith(expect.closeTo(2.0 + 1 / 30, 5));

		controls.stepFrameBackward(30);
		expect(playback.seekTimeline).toHaveBeenCalledWith(expect.closeTo(2.0 - 1 / 30, 5));
	});

	it("clamps frame stepping at 0 when stepping backward near start", () => {
		const { controls, playback } = setup(0.005, 10.0);

		controls.stepFrameBackward();

		expect(playback.seekTimeline).toHaveBeenCalledWith(0);
	});

	it("clamps frame stepping at duration when stepping forward near end", () => {
		const { controls, playback } = setup(9.995, 10.0);

		controls.stepFrameForward();

		expect(playback.seekTimeline).toHaveBeenCalledWith(10.0);
	});

	it("steps time by custom seconds (e.g. +1s and -1s)", () => {
		const { controls, playback } = setup(5.0, 10.0);

		controls.stepTimeSeconds(1);
		expect(playback.seekTimeline).toHaveBeenCalledWith(6.0);

		controls.stepTimeSeconds(-2.5);
		expect(playback.seekTimeline).toHaveBeenCalledWith(2.5);
	});

	it("clamps stepTimeSeconds within [0, duration]", () => {
		const { controls, playback } = setup(1.0, 10.0);

		controls.stepTimeSeconds(-5);
		expect(playback.seekTimeline).toHaveBeenCalledWith(0);

		controls.stepTimeSeconds(20);
		expect(playback.seekTimeline).toHaveBeenCalledWith(10.0);
	});
});
