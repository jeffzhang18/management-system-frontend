import {
	closestCenter,
	DndContext,
	type DragCancelEvent,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TFunction } from "i18next";
import { GripVerticalIcon, RotateCwIcon, XIcon } from "lucide-react";
import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { LocalEnum, StorageEnum } from "#/enum";
import type { LocationInfo, SavedLocationItem, WeatherNowInfo } from "@/api/services/weatherService";
import weatherService from "@/api/services/weatherService";
import { themeVars } from "@/theme/theme.css";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { getStringItem } from "@/utils/storage";
import { rgbAlpha } from "@/utils/theme";
import SearchBox from "./search-box";

interface SelectedCityWeather {
	location: LocationInfo;
	weather?: WeatherNowInfo;
	loading: boolean;
	error?: string;
}

const weatherImageMap = {
	sunny: "https://api.iconify.design/qlementine-icons:sun-16.svg?color=%23f59e0b",
	cloudy: "https://api.iconify.design/qlementine-icons:cloud-16.svg?color=%2364748b",
	partlyCloudy: "https://api.iconify.design/mdi:weather-partly-cloudy.svg?color=%23f59e0b",
	rain: "https://api.iconify.design/mdi:weather-rainy.svg?color=%230ea5e9",
	snow: "https://api.iconify.design/mdi:weather-snowy.svg?color=%2338bdf8",
	thunder: "https://api.iconify.design/mdi:weather-lightning-rainy.svg?color=%237c3aed",
	fog: "https://api.iconify.design/mdi:weather-fog.svg?color=%2394a3b8",
	wind: "https://api.iconify.design/mdi:weather-windy.svg?color=%2306b6d4",
	default: "https://api.iconify.design/mdi:weather-partly-cloudy.svg?color=%230ea5e9",
} as const;

const weatherTextRules = [
	[/雷阵雨|雷雨|雷暴/, "Thunderstorm"],
	[/暴雪|大雪|中雪|小雪|阵雪|雪/, "Snow"],
	[/暴雨|大雨|中雨|小雨|阵雨|雨/, "Rain"],
	[/雾|霾|沙|尘/, "Fog"],
	[/大风|风/, "Windy"],
	[/晴间多云|多云间晴/, "Partly Cloudy"],
	[/多云|少云/, "Cloudy"],
	[/阴/, "Overcast"],
	[/晴/, "Sunny"],
] as const;

const weatherImageRules = [
	{ pattern: /thunder|lightning|storm|雷|暴/, image: weatherImageMap.thunder },
	{ pattern: /snow|sleet|hail|雪|冰/, image: weatherImageMap.snow },
	{ pattern: /rain|drizzle|shower|pour|雨/, image: weatherImageMap.rain },
	{ pattern: /fog|mist|haze|smoke|雾|霾/, image: weatherImageMap.fog },
	{ pattern: /wind|gust|breeze|飓|风/, image: weatherImageMap.wind },
	{ pattern: /partly|mostly sunny|mostly clear|间晴|晴间|多云间晴/, image: weatherImageMap.partlyCloudy },
	{ pattern: /cloud|overcast|阴|云/, image: weatherImageMap.cloudy },
	{ pattern: /sun|clear|晴/, image: weatherImageMap.sunny },
] as const;

const windDirectionMap: Record<string, string> = {
	北风: "North Wind",
	东北风: "Northeast Wind",
	东风: "East Wind",
	东南风: "Southeast Wind",
	南风: "South Wind",
	西南风: "Southwest Wind",
	西风: "West Wind",
	西北风: "Northwest Wind",
	旋转风: "Variable Wind",
	无持续风向: "Variable Wind",
};

const palette = themeVars.colors.palette.primary;
const cardStyle = {
	borderColor: rgbAlpha(palette.defaultChannel, 0.14),
	background: `linear-gradient(135deg, ${rgbAlpha(palette.lighter, 0.34)} 0%, ${rgbAlpha(palette.light, 0.16)} 58%, ${rgbAlpha(themeVars.colors.background.paper, 0.94)} 100%)`,
	boxShadow: `0 16px 36px ${rgbAlpha(palette.defaultChannel, 0.12)}`,
};
const capsuleStyle = {
	borderColor: rgbAlpha(palette.defaultChannel, 0.18),
	background: `linear-gradient(135deg, ${rgbAlpha(palette.lighter, 0.24)} 0%, ${rgbAlpha(themeVars.colors.background.paper, 0.96)} 100%)`,
	color: themeVars.colors.text.primary,
	boxShadow: `0 8px 20px ${rgbAlpha(palette.defaultChannel, 0.1)}`,
};
const capsuleHandleStyle = {
	backgroundColor: rgbAlpha(themeVars.colors.background.paper, 0.82),
	color: themeVars.colors.palette.primary.default,
};
const softPanelStyle = {
	background: rgbAlpha(themeVars.colors.background.paper, 0.8),
	boxShadow: `0 10px 24px ${rgbAlpha(palette.defaultChannel, 0.08)}`,
};
const dragHandleStyle = {
	background: rgbAlpha(themeVars.colors.background.paper, 0.96),
	color: themeVars.colors.palette.primary.default,
	border: `1px solid ${rgbAlpha(palette.defaultChannel, 0.12)}`,
};
const capsuleTransition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, box-shadow 180ms ease";

function getWeatherImage(weather?: WeatherNowInfo) {
	const text = (weather?.text || "").trim().toLowerCase();

	for (const rule of weatherImageRules) {
		if (rule.pattern.test(text)) {
			return rule.image;
		}
	}

	if (/雷/.test(text)) return weatherImageMap.thunder;
	if (/雪|冰|冻/.test(text)) return weatherImageMap.snow;
	if (/雨|阵雨/.test(text)) return weatherImageMap.rain;
	if (/雾|霾|沙|尘/.test(text)) return weatherImageMap.fog;
	if (/风/.test(text)) return weatherImageMap.wind;
	if (/晴/.test(text)) return /多云|阴/.test(text) ? weatherImageMap.partlyCloudy : weatherImageMap.sunny;
	if (/多云|少云|阴/.test(text)) return /晴/.test(text) ? weatherImageMap.partlyCloudy : weatherImageMap.cloudy;

	return weatherImageMap.default;
}

function getWeatherText(text: string | undefined, language: string) {
	if (!text) return "--";
	if (language === LocalEnum.zh_CN) return text;

	for (const [pattern, translation] of weatherTextRules) {
		if (pattern.test(text)) {
			return translation;
		}
	}

	return text;
}

function getWindDirectionText(text: string | undefined, language: string) {
	if (!text) return "--";
	if (language === LocalEnum.zh_CN) return text;
	return windDirectionMap[text] || text;
}

function getLocaleTag(language: string) {
	return language === LocalEnum.zh_CN ? "zh-CN" : "en-US";
}

function getWeatherApiLang(language: string) {
	return language === LocalEnum.zh_CN ? "zh" : "en";
}

function formatObservationTime(obsTime: string | undefined, language: string) {
	if (!obsTime) return "--";

	try {
		return new Intl.DateTimeFormat(getLocaleTag(language), {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(obsTime));
	} catch {
		return obsTime;
	}
}

function getWeatherMeta(t: TFunction) {
	return [
		{ label: t("sys.weather.feelsLike"), key: "feelsLike", unit: "°C" },
		{ label: t("sys.weather.humidity"), key: "humidity", unit: "%" },
		{ label: t("sys.weather.windSpeed"), key: "windSpeed", unit: "km/h" },
		{ label: t("sys.weather.pressure"), key: "pressure", unit: "hPa" },
	] as const;
}

function normalizeSavedLocationItems(payload: unknown): SavedLocationItem[] {
	if (Array.isArray(payload)) {
		return payload
			.map((item) => {
				if (typeof item === "string") return { locationId: item };
				if (item && typeof item === "object") {
					return item as SavedLocationItem;
				}
				return null;
			})
			.filter(Boolean) as SavedLocationItem[];
	}

	if (payload && typeof payload === "object") {
		const source = payload as Record<string, unknown>;
		for (const key of ["locations", "savedLocations", "items", "list", "data"]) {
			const value = source[key];
			if (value) {
				return normalizeSavedLocationItems(value);
			}
		}
	}

	return [];
}

const PAGE_SIZE = 9;

export default function CityInput() {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage || i18n.language;
	const weatherApiLang = useMemo(() => getWeatherApiLang(language), [language]);
	const [selectedCities, setSelectedCities] = useState<SelectedCityWeather[]>([]);
	const [refreshingAll, setRefreshingAll] = useState(false);
	const [pageLoading, setPageLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [visibleCardCount, setVisibleCardCount] = useState(0);
	const [activeCapsuleId, setActiveCapsuleId] = useState<string | null>(null);
	const [capsulePreviewCities, setCapsulePreviewCities] = useState<SelectedCityWeather[] | null>(null);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
	const cityIds = useMemo(() => selectedCities.map((city) => city.location.id), [selectedCities]);
	const capsuleCities = useMemo(() => capsulePreviewCities ?? selectedCities, [capsulePreviewCities, selectedCities]);
	const capsuleCityIds = useMemo(() => capsuleCities.map((city) => city.location.id), [capsuleCities]);
	const visibleCityIds = useMemo(() => cityIds.slice(0, visibleCardCount), [cityIds, visibleCardCount]);
	const visibleCities = useMemo(() => selectedCities.slice(0, visibleCardCount), [selectedCities, visibleCardCount]);
	const activeCapsule = useMemo(
		() => (activeCapsuleId ? (capsuleCities.find((city) => city.location.id === activeCapsuleId) ?? null) : null),
		[activeCapsuleId, capsuleCities],
	);
	const weatherMeta = useMemo(() => getWeatherMeta(t), [t]);
	const cityIdsRef = useRef<string[]>([]);
	const capsulePreviewCitiesRef = useRef<SelectedCityWeather[] | null>(null);
	const capsulePreviewFrameRef = useRef<number | null>(null);
	const capsulePreviewEnabledRef = useRef(true);
	const capsuleDragBurstCountRef = useRef(0);
	const capsuleDragBurstTimestampRef = useRef(0);
	const visibleCardCountRef = useRef(0);
	const loadingMoreRef = useRef(false);
	const lastCapsuleOverIdRef = useRef<string | null>(null);
	const initializedLanguageRef = useRef(false);
	const prevWeatherApiLangRef = useRef(weatherApiLang);
	const loadFailedTextRef = useRef(t("sys.weather.loadFailed"));
	const userId = getStringItem(StorageEnum.UserId) || "";

	useEffect(() => {
		loadFailedTextRef.current = t("sys.weather.loadFailed");
	}, [t]);

	useEffect(() => {
		capsulePreviewCitiesRef.current = capsulePreviewCities;
	}, [capsulePreviewCities]);

	useEffect(
		() => () => {
			if (capsulePreviewFrameRef.current !== null) {
				cancelAnimationFrame(capsulePreviewFrameRef.current);
			}
		},
		[],
	);

	const updateCityWeather = useCallback(
		(locationId: string, updater: (city: SelectedCityWeather) => SelectedCityWeather) => {
			setSelectedCities((currentCities) =>
				currentCities.map((city) => (city.location.id === locationId ? updater(city) : city)),
			);
		},
		[],
	);

	const handleAddLocation = useCallback(
		async (location: LocationInfo) => {
			let shouldFetch = false;
			let nextLength = 0;
			let nextLocationIds: string[] = [];

			setSelectedCities((currentCities) => {
				const existingCity = currentCities.find((city) => city.location.id === location.id);
				if (existingCity) {
					nextLength = currentCities.length;
					nextLocationIds = currentCities.map((city) => city.location.id);
					return currentCities;
				}

				shouldFetch = true;
				nextLength = currentCities.length + 1;
				nextLocationIds = [...currentCities.map((city) => city.location.id), location.id];
				return [...currentCities, { location, loading: true }];
			});

			if (!shouldFetch) {
				return;
			}

			setVisibleCardCount((count) => Math.min(Math.max(count + 1, PAGE_SIZE), nextLength));

			try {
				if (userId) {
					await weatherService.saveLocation({
						userId,
						locationId: location.id,
						country: location.country,
						name: location.name,
						adm1: location.adm1,
					});
					await weatherService.saveLocationList({ locationList: nextLocationIds });
				}
				const res = await weatherService.getWeatherNow({ location: location.id, lang: weatherApiLang });
				updateCityWeather(location.id, (city) => ({ ...city, weather: res.now, loading: false, error: undefined }));
			} catch (error) {
				updateCityWeather(location.id, (city) => ({
					...city,
					loading: false,
					error: error instanceof Error ? error.message : loadFailedTextRef.current,
				}));
			}
		},
		[updateCityWeather, weatherApiLang, userId],
	);

	const refreshAllWeather = useCallback(
		async (locationIds: string[]) => {
			if (locationIds.length === 0) {
				return;
			}

			setRefreshingAll(true);

			await Promise.all(
				locationIds.map(async (cityId) => {
					updateCityWeather(cityId, (currentCity) => ({ ...currentCity, loading: true, error: undefined }));

					try {
						const res = await weatherService.getWeatherNow({ location: cityId, lang: weatherApiLang });
						updateCityWeather(cityId, (currentCity) => ({
							...currentCity,
							weather: res.now,
							loading: false,
							error: undefined,
						}));
					} catch (error) {
						updateCityWeather(cityId, (currentCity) => ({
							...currentCity,
							loading: false,
							error: error instanceof Error ? error.message : loadFailedTextRef.current,
						}));
					}
				}),
			);

			setRefreshingAll(false);
		},
		[updateCityWeather, weatherApiLang],
	);

	const fetchWeatherForIds = useCallback(
		async (locationIds: string[], lang: string) => {
			if (locationIds.length === 0) {
				return;
			}

			await Promise.all(
				locationIds.map(async (locationId) => {
					updateCityWeather(locationId, (currentCity) => ({ ...currentCity, loading: true, error: undefined }));

					try {
						const res = await weatherService.getWeatherNow({ location: locationId, lang });
						updateCityWeather(locationId, (currentCity) => ({
							...currentCity,
							weather: res.now,
							loading: false,
							error: undefined,
						}));
					} catch (error) {
						updateCityWeather(locationId, (currentCity) => ({
							...currentCity,
							loading: false,
							error: error instanceof Error ? error.message : loadFailedTextRef.current,
						}));
					}
				}),
			);
		},
		[updateCityWeather],
	);

	const commitSortedCities = useCallback(
		(sortedCities: SelectedCityWeather[]) => {
			const sortedIds = sortedCities.map((city) => city.location.id);
			const frontVisibleIds = sortedIds.slice(0, visibleCardCountRef.current);
			const frontSet = new Set(frontVisibleIds);
			const idsToFetch = sortedCities
				.filter((city) => frontSet.has(city.location.id) && !city.weather && !city.loading)
				.map((city) => city.location.id);

			if (idsToFetch.length > 0) {
				const fetchSet = new Set(idsToFetch);
				setSelectedCities(
					sortedCities.map((city) =>
						fetchSet.has(city.location.id) ? { ...city, loading: true, error: undefined } : city,
					),
				);
				void fetchWeatherForIds(idsToFetch, weatherApiLang);
			} else {
				setSelectedCities(sortedCities);
			}

			if (sortedIds.length > 0) {
				cityIdsRef.current = sortedIds;
				void weatherService.saveLocationList({ locationList: sortedIds });
			}
		},
		[fetchWeatherForIds, weatherApiLang],
	);

	const handleSortEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;

			if (!over || active.id === over.id) {
				return;
			}

			const oldIndex = selectedCities.findIndex((city) => city.location.id === active.id);
			const newIndex = selectedCities.findIndex((city) => city.location.id === over.id);

			if (oldIndex < 0 || newIndex < 0) {
				return;
			}

			commitSortedCities(arrayMove(selectedCities, oldIndex, newIndex));
		},
		[commitSortedCities, selectedCities],
	);

	const handleCapsuleDragStart = useCallback(
		(event: DragStartEvent) => {
			const nextPreviewCities = selectedCities;
			setActiveCapsuleId(String(event.active.id));
			capsulePreviewCitiesRef.current = nextPreviewCities;
			setCapsulePreviewCities(nextPreviewCities);
			capsulePreviewEnabledRef.current = true;
			capsuleDragBurstCountRef.current = 0;
			capsuleDragBurstTimestampRef.current = 0;
			lastCapsuleOverIdRef.current = null;
		},
		[selectedCities],
	);

	const handleCapsuleDragOver = useCallback((event: DragOverEvent) => {
		const { active, over } = event;

		if (!over) {
			return;
		}

		const activeId = String(active.id);
		const overId = String(over.id);

		if (!capsulePreviewEnabledRef.current) {
			return;
		}

		const now = performance.now();
		if (now - capsuleDragBurstTimestampRef.current < 180) {
			capsuleDragBurstCountRef.current += 1;
		} else {
			capsuleDragBurstCountRef.current = 1;
		}
		capsuleDragBurstTimestampRef.current = now;

		if (capsuleDragBurstCountRef.current > 18) {
			capsulePreviewEnabledRef.current = false;
			lastCapsuleOverIdRef.current = null;
			capsulePreviewCitiesRef.current = null;

			if (capsulePreviewFrameRef.current !== null) {
				cancelAnimationFrame(capsulePreviewFrameRef.current);
				capsulePreviewFrameRef.current = null;
			}

			setCapsulePreviewCities(null);
			return;
		}

		if (activeId === overId || lastCapsuleOverIdRef.current === overId) {
			return;
		}

		const currentCities = capsulePreviewCitiesRef.current;
		if (!currentCities) {
			return;
		}

		const oldIndex = currentCities.findIndex((city) => city.location.id === activeId);
		const newIndex = currentCities.findIndex((city) => city.location.id === overId);

		if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
			return;
		}

		const nextCities = arrayMove(currentCities, oldIndex, newIndex);
		lastCapsuleOverIdRef.current = overId;
		capsulePreviewCitiesRef.current = nextCities;

		if (capsulePreviewFrameRef.current !== null) {
			cancelAnimationFrame(capsulePreviewFrameRef.current);
		}

		capsulePreviewFrameRef.current = requestAnimationFrame(() => {
			capsulePreviewFrameRef.current = null;
			setCapsulePreviewCities(nextCities);
		});
	}, []);

	const resetCapsuleDrag = useCallback(() => {
		if (capsulePreviewFrameRef.current !== null) {
			cancelAnimationFrame(capsulePreviewFrameRef.current);
			capsulePreviewFrameRef.current = null;
		}

		capsulePreviewEnabledRef.current = true;
		capsuleDragBurstCountRef.current = 0;
		capsuleDragBurstTimestampRef.current = 0;
		setActiveCapsuleId(null);
		capsulePreviewCitiesRef.current = null;
		setCapsulePreviewCities(null);
		lastCapsuleOverIdRef.current = null;
	}, []);

	const handleCapsuleDragCancel = useCallback(
		(_event: DragCancelEvent) => {
			resetCapsuleDrag();
		},
		[resetCapsuleDrag],
	);

	const handleCapsuleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { over } = event;
			const previewCities = capsulePreviewCities;
			const previewEnabled = capsulePreviewEnabledRef.current;
			resetCapsuleDrag();

			if (!over) {
				return;
			}

			if (!previewEnabled || !previewCities) {
				handleSortEnd(event);
				return;
			}

			const currentIds = selectedCities.map((city) => city.location.id);
			const previewIds = previewCities.map((city) => city.location.id);

			if (currentIds.join("|") === previewIds.join("|")) {
				return;
			}

			commitSortedCities(previewCities);
		},
		[capsulePreviewCities, commitSortedCities, handleSortEnd, resetCapsuleDrag, selectedCities],
	);

	const loadSavedLocations = useCallback(
		async (lang: string) => {
			if (!userId) {
				setPageLoading(false);
				setSelectedCities([]);
				setVisibleCardCount(0);
				return;
			}

			setPageLoading(true);
			setSelectedCities([]);
			setVisibleCardCount(0);

			try {
				const savedPayload = await weatherService.getSavedLocationList();
				const savedItems = normalizeSavedLocationItems(savedPayload);
				const savedIds = [
					...new Set(savedItems.map((item) => item.locationId || item.location_id || item.id || "").filter(Boolean)),
				];

				if (savedIds.length === 0) {
					setSelectedCities([]);
					return;
				}

				const savedMetaMap = new Map(
					savedItems
						.map((item) => {
							const id = item.locationId || item.location_id || item.id || "";
							return id ? [id, { country: item.country || "", name: item.name || "", adm1: item.adm1 || "" }] : null;
						})
						.filter(Boolean) as Array<[string, { country: string; name: string; adm1: string }]>,
				);

				const baseCities = savedIds.map((locationId) => {
					const meta = savedMetaMap.get(locationId);
					return {
						location: {
							id: locationId,
							name: meta?.name || locationId,
							lat: "",
							lon: "",
							adm2: "",
							adm1: meta?.adm1 || "",
							country: meta?.country || "",
							tz: "",
							utcOffset: "",
							isDst: "",
							type: "city",
							rank: "",
							fxLink: "",
						},
						loading: false,
					} satisfies SelectedCityWeather;
				});

				setSelectedCities(baseCities);
				const initialCount = Math.min(PAGE_SIZE, baseCities.length);
				setVisibleCardCount(initialCount);
				await fetchWeatherForIds(savedIds.slice(0, initialCount), lang);
			} catch {
				setSelectedCities([]);
				setVisibleCardCount(0);
			} finally {
				setPageLoading(false);
			}
		},
		[fetchWeatherForIds, userId],
	);

	useEffect(() => {
		cityIdsRef.current = cityIds;
	}, [cityIds]);

	useEffect(() => {
		visibleCardCountRef.current = visibleCardCount;
	}, [visibleCardCount]);

	useEffect(() => {
		void loadSavedLocations(weatherApiLang);
	}, [loadSavedLocations, weatherApiLang]);

	useEffect(() => {
		const onScroll = () => {
			if (pageLoading || loadingMoreRef.current) {
				return;
			}

			if (visibleCardCountRef.current >= cityIdsRef.current.length) {
				return;
			}

			if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140) {
				const start = visibleCardCountRef.current;
				const end = Math.min(start + PAGE_SIZE, cityIdsRef.current.length);
				const ids = cityIdsRef.current.slice(start, end);
				loadingMoreRef.current = true;
				setLoadingMore(true);
				setVisibleCardCount(end);
				void fetchWeatherForIds(ids, weatherApiLang).finally(() => {
					loadingMoreRef.current = false;
					setLoadingMore(false);
				});
			}
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [fetchWeatherForIds, pageLoading, weatherApiLang]);

	useEffect(() => {
		if (!initializedLanguageRef.current) {
			initializedLanguageRef.current = true;
			prevWeatherApiLangRef.current = weatherApiLang;
			return;
		}

		if (prevWeatherApiLangRef.current === weatherApiLang) {
			return;
		}

		prevWeatherApiLangRef.current = weatherApiLang;

		void refreshAllWeather(cityIdsRef.current.slice(0, visibleCardCountRef.current));
	}, [refreshAllWeather, weatherApiLang]);

	const handleRemoveLocation = useCallback(
		async (locationId: string) => {
			let nextLocationIds: string[] = [];
			if (userId) {
				await weatherService.removeSavedLocation({ userId, locationId });
			}

			setSelectedCities((currentCities) => {
				const nextCities = currentCities.filter((city) => city.location.id !== locationId);
				nextLocationIds = nextCities.map((city) => city.location.id);
				setVisibleCardCount((count) => Math.min(count, nextCities.length));
				return nextCities;
			});

			if (userId) {
				await weatherService.saveLocationList({ locationList: nextLocationIds });
			}
		},
		[userId],
	);

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div className="space-y-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold">{t("sys.nav.weather")}</h1>
						<p className="text-sm text-muted-foreground">{t("sys.weather.pageDescription")}</p>
					</div>
					<Button
						variant="outline"
						onClick={() => void refreshAllWeather(visibleCityIds)}
						disabled={refreshingAll || visibleCityIds.length === 0}
					>
						<RotateCwIcon className={refreshingAll ? "animate-spin" : ""} />
						{t("common.redo")}
					</Button>
				</div>
				<SearchBox onSelectLocation={handleAddLocation} />
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleCapsuleDragStart}
				onDragOver={handleCapsuleDragOver}
				onDragEnd={handleCapsuleDragEnd}
				onDragCancel={handleCapsuleDragCancel}
			>
				<SortableContext items={capsuleCityIds} strategy={rectSortingStrategy}>
					<div className="flex flex-wrap gap-3">
						{pageLoading ? (
							<WeatherCapsuleSkeleton />
						) : capsuleCities.length > 0 ? (
							capsuleCities.map((city) => (
								<SortableCapsule
									key={city.location.id}
									city={city}
									onRemove={handleRemoveLocation}
									t={t}
									hideWhileDragging={city.location.id === activeCapsuleId}
								/>
							))
						) : (
							<div className="rounded-full border border-dashed px-4 py-2 text-sm text-muted-foreground">
								{t("sys.weather.noCitySelected")}
							</div>
						)}
					</div>
				</SortableContext>
				<DragOverlay>
					{activeCapsule ? <CapsuleChip city={activeCapsule} onRemove={() => {}} t={t} isOverlay /> : null}
				</DragOverlay>
			</DndContext>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
				<SortableContext items={visibleCityIds} strategy={rectSortingStrategy}>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{pageLoading ? (
							<WeatherCardSkeleton />
						) : visibleCities.length > 0 ? (
							visibleCities.map((city) => (
								<SortableWeatherCard
									key={city.location.id}
									city={city}
									language={language}
									weatherMeta={weatherMeta}
									t={t}
								/>
							))
						) : (
							<Card className="border-dashed md:col-span-2 xl:col-span-3">
								<CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
									{t("sys.weather.emptyCardHint")}
								</CardContent>
							</Card>
						)}
					</div>
				</SortableContext>
			</DndContext>

			{loadingMore && <div className="text-center text-sm text-muted-foreground">{t("common.loadingText")}</div>}
		</div>
	);
}

function CapsuleChip({
	city,
	onRemove,
	t,
	handleProps,
	className,
	isOverlay = false,
}: {
	city: SelectedCityWeather;
	onRemove: (locationId: string) => void;
	t: TFunction;
	handleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
	className?: string;
	isOverlay?: boolean;
}) {
	const fullLocationName = `${city.location.country}, ${city.location.adm1}, ${city.location.name}`;

	return (
		<div
			style={capsuleStyle}
			className={`inline-flex w-[320px] max-w-full items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-sm ${className ?? ""}`}
			title={fullLocationName}
		>
			<button
				type="button"
				style={capsuleHandleStyle}
				className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${isOverlay ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"}`}
				aria-label={t("sys.weather.dragCity", { city: city.location.name })}
				{...(handleProps ?? {})}
			>
				<GripVerticalIcon className="h-4 w-4" />
			</button>
			<span className="min-w-0 flex-1 truncate whitespace-nowrap">{fullLocationName}</span>
			<button
				type="button"
				onClick={() => onRemove(city.location.id)}
				style={capsuleHandleStyle}
				className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:opacity-90"
				aria-label={t("sys.weather.removeCity", { city: city.location.name })}
			>
				<XIcon className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}

function SortableCapsule({
	city,
	onRemove,
	t,
	hideWhileDragging = false,
}: {
	city: SelectedCityWeather;
	onRemove: (locationId: string) => void;
	t: TFunction;
	hideWhileDragging?: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: city.location.id,
	});
	const style: CSSProperties = {
		transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
		transition: transition ? capsuleTransition : undefined,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<CapsuleChip
				city={city}
				onRemove={onRemove}
				t={t}
				handleProps={{ ...attributes, ...listeners }}
				className={
					isDragging && hideWhileDragging
						? "opacity-0"
						: isDragging
							? "z-10 opacity-80 shadow-md"
							: "transition-shadow duration-200 ease-out"
				}
			/>
		</div>
	);
}

function SortableWeatherCard({
	city,
	language,
	weatherMeta,
	t,
}: {
	city: SelectedCityWeather;
	language: string;
	weatherMeta: ReadonlyArray<{ label: string; key: keyof WeatherNowInfo; unit: string }>;
	t: TFunction;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: city.location.id,
	});
	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		...cardStyle,
	};
	const weatherText = city.loading
		? t("common.loadingText")
		: getWeatherText(city.weather?.text, language) || t("sys.weather.liveWeather");
	const windText = city.loading ? "--" : getWindDirectionText(city.weather?.windDir, language);
	const observedAt = city.error || formatObservationTime(city.weather?.obsTime, language);
	const feelsLikeMeta = weatherMeta[0];
	const humidityMeta = weatherMeta[1];
	const windSpeedMeta = weatherMeta[2];
	const pressureMeta = weatherMeta[3];
	const feelsLikeValue = city.weather?.[feelsLikeMeta.key] || "--";
	const humidityValue = city.weather?.[humidityMeta.key] || "--";
	const windSpeedValue = city.weather?.[windSpeedMeta.key] || "--";
	const pressureValue = city.weather?.[pressureMeta.key] || "--";

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={`gap-4 overflow-hidden border ${isDragging ? "z-10 opacity-85" : ""}`}
		>
			<CardHeader className="pb-0">
				<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
					<div className="space-y-1">
						<CardTitle className="truncate text-lg">{city.location.name}</CardTitle>
						<p className="text-sm text-muted-foreground">
							{city.location.country}, {city.location.adm1}
						</p>
					</div>
					<div className="flex shrink-0 items-start justify-end gap-2 justify-self-end">
						<button
							type="button"
							style={dragHandleStyle}
							className="inline-flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full active:cursor-grabbing"
							aria-label={t("sys.weather.dragCard", { city: city.location.name })}
							{...attributes}
							{...listeners}
						>
							<GripVerticalIcon className="h-4 w-4" />
						</button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-[minmax(0,1fr)_112px] gap-4">
					<div className="flex min-h-[156px] min-w-0 flex-col rounded-[28px]">
						<div>
							<p className="truncate text-sm text-muted-foreground">
								{observedAt || t("sys.weather.currentWeatherInfo")}
							</p>
							<div className="whitespace-nowrap text-5xl font-semibold text-foreground">
								{city.loading ? "--" : `${city.weather?.temp ?? "--"}°C`}
							</div>
							<div className="mt-4 min-w-0">
								<div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">{weatherText}</div>
								<div className="mt-2 flex min-w-0 items-center gap-2">
									<div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">
										{feelsLikeMeta.label}
									</div>
									<div className="truncate whitespace-nowrap text-sm font-medium text-muted-foreground">
										{city.loading || feelsLikeValue === "--"
											? feelsLikeValue
											: `${feelsLikeValue}${feelsLikeMeta.unit}`}
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="grid min-w-0 grid-rows-[112px_minmax(0,1fr)] gap-3">
						<div style={softPanelStyle} className="flex items-center justify-center rounded-[28px] p-4 shadow-sm">
							<img
								src={getWeatherImage(city.weather)}
								alt={city.loading ? t("common.loadingText") : `${city.location.name} ${weatherText}`}
								className="h-16 w-16 shrink-0 drop-shadow-sm"
								loading="lazy"
							/>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div style={softPanelStyle} className="min-w-0 rounded-[24px] p-4 shadow-sm">
						<div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">{windSpeedMeta.label}</div>
						<div className="mt-2 truncate whitespace-nowrap text-base font-semibold text-foreground">
							{city.loading || windSpeedValue === "--" ? windSpeedValue : `${windSpeedValue}${windSpeedMeta.unit}`}
						</div>
					</div>
					<div style={softPanelStyle} className="min-w-0 rounded-[24px] p-4 shadow-sm">
						<div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">
							{t("sys.weather.windDirection")}
						</div>
						<div className="mt-2 truncate whitespace-nowrap text-sm font-semibold text-foreground">
							{windText || t("sys.weather.noData")}
						</div>
					</div>
					<div style={softPanelStyle} className="min-w-0 rounded-[24px] p-4 shadow-sm">
						<div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">{humidityMeta.label}</div>
						<div className="mt-2 truncate whitespace-nowrap text-base font-semibold text-foreground">
							{city.loading || humidityValue === "--" ? humidityValue : `${humidityValue}${humidityMeta.unit}`}
						</div>
					</div>
					<div style={softPanelStyle} className="min-w-0 rounded-[24px] p-4 shadow-sm">
						<div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">{pressureMeta.label}</div>
						<div className="mt-2 truncate whitespace-nowrap text-base font-semibold text-foreground">
							{city.loading || pressureValue === "--" ? pressureValue : `${pressureValue}${pressureMeta.unit}`}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function WeatherCapsuleSkeleton() {
	return (
		<>
			<Skeleton className="h-11 w-56 rounded-full border" style={capsuleStyle} />
			<Skeleton className="h-11 w-64 rounded-full border" style={capsuleStyle} />
			<Skeleton className="h-11 w-52 rounded-full border" style={capsuleStyle} />
		</>
	);
}

function WeatherCardSkeleton() {
	const skeletonCardKeys = ["weather-skeleton-1", "weather-skeleton-2", "weather-skeleton-3"] as const;
	const skeletonPanelKeys = ["panel-wind-speed", "panel-wind-direction", "panel-humidity", "panel-pressure"] as const;

	return (
		<>
			{skeletonCardKeys.map((cardKey) => (
				<Card key={cardKey} className="overflow-hidden border" style={cardStyle}>
					<CardHeader className="pb-0">
						<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
							<div className="space-y-2">
								<Skeleton className="h-8 w-28 rounded-xl" />
								<Skeleton className="h-5 w-44 rounded-lg" />
							</div>
							<Skeleton className="h-9 w-9 rounded-full border" style={dragHandleStyle} />
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-[minmax(0,1fr)_112px] gap-4">
							<div className="space-y-4">
								<Skeleton className="h-5 w-28 rounded-lg" />
								<Skeleton className="h-16 w-32 rounded-2xl" />
								<div className="space-y-2 pt-1">
									<Skeleton className="h-4 w-12 rounded-lg" />
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-16 rounded-lg" />
										<Skeleton className="h-4 w-20 rounded-lg" />
									</div>
								</div>
							</div>
							<div className="rounded-[28px] p-4" style={softPanelStyle}>
								<Skeleton className="h-full min-h-[156px] w-full rounded-[20px]" />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							{skeletonPanelKeys.map((panelKey) => (
								<div key={`${cardKey}-${panelKey}`} className="space-y-3 rounded-[24px] p-4" style={softPanelStyle}>
									<Skeleton className="h-4 w-14 rounded-lg" />
									<Skeleton className="h-8 w-24 rounded-xl" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			))}
		</>
	);
}
