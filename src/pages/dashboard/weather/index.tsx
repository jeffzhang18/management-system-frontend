import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TFunction } from "i18next";
import { GripVerticalIcon, RotateCwIcon, XIcon } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function normalizeSavedLocationIds(payload: unknown): string[] {
	if (Array.isArray(payload)) {
		return payload
			.map((item) => {
				if (typeof item === "string") return item;
				if (item && typeof item === "object") {
					const savedItem = item as SavedLocationItem;
					return savedItem.locationId || savedItem.location_id || savedItem.id || "";
				}
				return "";
			})
			.filter(Boolean);
	}

	if (payload && typeof payload === "object") {
		const source = payload as Record<string, unknown>;
		for (const key of ["locations", "savedLocations", "items", "list", "data"]) {
			const value = source[key];
			if (value) {
				return normalizeSavedLocationIds(value);
			}
		}
	}

	return [];
}

export default function CityInput() {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage || i18n.language;
	const weatherApiLang = useMemo(() => getWeatherApiLang(language), [language]);
	const [selectedCities, setSelectedCities] = useState<SelectedCityWeather[]>([]);
	const [refreshingAll, setRefreshingAll] = useState(false);
	const [pageLoading, setPageLoading] = useState(true);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
	const cityIds = useMemo(() => selectedCities.map((city) => city.location.id), [selectedCities]);
	const weatherMeta = useMemo(() => getWeatherMeta(t), [t]);
	const cityIdsRef = useRef<string[]>([]);
	const initializedLanguageRef = useRef(false);
	const prevWeatherApiLangRef = useRef(weatherApiLang);
	const loadFailedTextRef = useRef(t("sys.weather.loadFailed"));
	const userId = getStringItem(StorageEnum.UserId) || "";

	useEffect(() => {
		loadFailedTextRef.current = t("sys.weather.loadFailed");
	}, [t]);

	const persistLocationList = useCallback(
		async (locationList: string[]) => {
			if (!userId) {
				return;
			}

			try {
				await weatherService.saveLocationList({ locationList });
			} catch {
				// Best-effort persistence; ignore failures to keep UI responsive.
			}
		},
		[userId],
	);

	const handleSortEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;

			if (!over || active.id === over.id) {
				return;
			}

			let nextIds: string[] = [];
			setSelectedCities((currentCities) => {
				const oldIndex = currentCities.findIndex((city) => city.location.id === active.id);
				const newIndex = currentCities.findIndex((city) => city.location.id === over.id);

				if (oldIndex < 0 || newIndex < 0) {
					return currentCities;
				}

				const nextCities = arrayMove(currentCities, oldIndex, newIndex);
				nextIds = nextCities.map((city) => city.location.id);
				return nextCities;
			});
			if (nextIds.length > 0) {
				void persistLocationList(nextIds);
			}
		},
		[persistLocationList],
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
			let nextIds: string[] = [];

			setSelectedCities((currentCities) => {
				const existingCity = currentCities.find((city) => city.location.id === location.id);
				if (existingCity) {
					return currentCities;
				}

				shouldFetch = true;
				const nextCities = [...currentCities, { location, loading: true }];
				nextIds = nextCities.map((city) => city.location.id);
				return nextCities;
			});

			if (!shouldFetch) {
				return;
			}

			try {
				await weatherService.saveLocation({ locationId: location.id });
				if (nextIds.length > 0) {
					void persistLocationList(nextIds);
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
		[persistLocationList, updateCityWeather, weatherApiLang],
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

	const loadSavedLocations = useCallback(
		async (lang: string) => {
			if (!userId) {
				setPageLoading(false);
				return;
			}

			try {
				const [savedListRes, savedPayload] = await Promise.all([
					weatherService.getSavedLocationList(),
					weatherService.getSavedLocations({ userId }),
				]);
				const orderedIds = savedListRes?.data ?? [];
				const savedIds = [...new Set(normalizeSavedLocationIds(savedPayload))];
				const finalIds = orderedIds.length
					? [...orderedIds.filter((id) => savedIds.includes(id)), ...savedIds.filter((id) => !orderedIds.includes(id))]
					: savedIds;

				if (finalIds.length === 0) {
					setSelectedCities([]);
					setPageLoading(false);
					return;
				}

				const cityEntries = await Promise.all(
					finalIds.map(async (locationId) => {
						try {
							const [locationRes, weatherRes] = await Promise.all([
								weatherService.searchLocation({ locationName: locationId }),
								weatherService.getWeatherNow({ location: locationId, lang }),
							]);
							const location = locationRes.location?.[0];
							if (!location) {
								return null;
							}

							return {
								location,
								weather: weatherRes.now,
								loading: false,
							} satisfies SelectedCityWeather;
						} catch (error) {
							return {
								location: {
									id: locationId,
									name: locationId,
									lat: "",
									lon: "",
									adm2: "",
									adm1: "",
									country: "",
									tz: "",
									utcOffset: "",
									isDst: "",
									type: "city",
									rank: "",
									fxLink: "",
								},
								loading: false,
								error: error instanceof Error ? error.message : loadFailedTextRef.current,
							} satisfies SelectedCityWeather;
						}
					}),
				);

				setSelectedCities(cityEntries.filter(Boolean) as SelectedCityWeather[]);
			} catch {
				setSelectedCities([]);
			} finally {
				setPageLoading(false);
			}
		},
		[userId],
	);

	useEffect(() => {
		cityIdsRef.current = cityIds;
	}, [cityIds]);

	useEffect(() => {
		void loadSavedLocations(weatherApiLang);
	}, [loadSavedLocations, weatherApiLang]);

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

		void refreshAllWeather(cityIdsRef.current);
	}, [refreshAllWeather, weatherApiLang]);

	const handleRemoveLocation = useCallback(
		async (locationId: string) => {
			if (userId) {
				await weatherService.removeSavedLocation({ userId, locationId });
			}

			let nextIds: string[] = [];
			setSelectedCities((currentCities) => {
				const nextCities = currentCities.filter((city) => city.location.id !== locationId);
				nextIds = nextCities.map((city) => city.location.id);
				return nextCities;
			});
			void persistLocationList(nextIds);
		},
		[persistLocationList, userId],
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
						onClick={() => void refreshAllWeather(cityIds)}
						disabled={refreshingAll || cityIds.length === 0}
					>
						<RotateCwIcon className={refreshingAll ? "animate-spin" : ""} />
						{t("common.redo")}
					</Button>
				</div>
				<SearchBox onSelectLocation={handleAddLocation} />
			</div>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
				<SortableContext items={cityIds} strategy={rectSortingStrategy}>
					<div className="flex flex-wrap gap-3">
						{pageLoading ? (
							<WeatherCapsuleSkeleton />
						) : selectedCities.length > 0 ? (
							selectedCities.map((city) => (
								<SortableCapsule key={city.location.id} city={city} onRemove={handleRemoveLocation} t={t} />
							))
						) : (
							<div className="rounded-full border border-dashed px-4 py-2 text-sm text-muted-foreground">
								{t("sys.weather.noCitySelected")}
							</div>
						)}
					</div>
				</SortableContext>
			</DndContext>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
				<SortableContext items={cityIds} strategy={rectSortingStrategy}>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{pageLoading ? (
							<WeatherCardSkeleton />
						) : selectedCities.length > 0 ? (
							selectedCities.map((city) => (
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
		</div>
	);
}

function SortableCapsule({
	city,
	onRemove,
	t,
}: {
	city: SelectedCityWeather;
	onRemove: (locationId: string) => void;
	t: TFunction;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: city.location.id,
	});
	const style: CSSProperties = {
		transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
		transition,
		...capsuleStyle,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-sm ${isDragging ? "z-10 opacity-80" : ""}`}
		>
			<button
				type="button"
				style={capsuleHandleStyle}
				className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-full active:cursor-grabbing"
				aria-label={t("sys.weather.dragCity", { city: city.location.name })}
				{...attributes}
				{...listeners}
			>
				<GripVerticalIcon className="h-4 w-4" />
			</button>
			<span className="whitespace-nowrap">
				{city.location.country}, {city.location.adm1}, {city.location.name}
			</span>
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
								<div className="truncate whitespace-nowrap text-[11px] text-foreground/80">{weatherText}</div>
								<div className="mt-2 flex min-w-0 items-center gap-2">
									<div className="truncate whitespace-nowrap text-[11px] text-foreground/80">{feelsLikeMeta.label}</div>
									<div className="truncate whitespace-nowrap text-sm font-medium text-foreground/85">
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
						<div className="mt-2 truncate whitespace-nowrap text-sm font-semibold text-foreground/90">
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
