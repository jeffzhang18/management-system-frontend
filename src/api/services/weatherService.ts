import apiClient from "../apiClient";

export interface SearchLocationReq {
	locationName: string;
}

export interface LocationInfo {
	name: string;
	id: string;
	lat: string;
	lon: string;
	adm2: string;
	adm1: string;
	country: string;
	tz: string;
	utcOffset: string;
	isDst: string;
	type: string;
	rank: string;
	fxLink: string;
}

// 引用信息
export interface ReferInfo {
	sources: string[];
	license: string[];
}

// API返回的数据结构
export interface SearchLocationResponse {
	code: string;
	location: LocationInfo[];
	refer: ReferInfo;
}

export interface WeatherReq {
	location: string;
	lang?: string;
}

export interface SaveLocationReq {
	userId: string;
	locationId: string;
	country: string;
	name: string;
	adm1: string;
}

export interface SavedLocationItem {
	locationId?: string;
	location_id?: string;
	id?: string;
	country?: string;
	name?: string;
	adm1?: string;
}

export interface SavedLocationsReq {
	userId: string;
}

export interface RemoveSavedLocationReq {
	userId: string;
	locationId: string;
}

export interface SaveLocationListReq {
	locationList: string[];
}

export interface SavedLocationListReq {
	page?: number;
	pageSize?: number;
}

export interface DaysWeatherReq extends WeatherReq {
	days: string;
}

export interface HoursWeatherReq extends WeatherReq {
	hours: string;
}

export interface WeatherNowInfo {
	obsTime?: string;
	temp?: string;
	feelsLike?: string;
	icon?: string;
	text?: string;
	wind360?: string;
	windDir?: string;
	windScale?: string;
	windSpeed?: string;
	humidity?: string;
	precip?: string;
	pressure?: string;
	vis?: string;
	cloud?: string;
	dew?: string;
}

export interface WeatherNowResponse {
	code: string;
	now: WeatherNowInfo;
	refer: ReferInfo;
}

export enum WeatherApi {
	SavedLocation = "/weather/saved-location",
	SavedLocationList = "/weather/saved-location-list",
	LocationId = "/weather/location",
	WeatherNow = "/weather/now",
	WeatherDays = "/weather/days-prediction",
	WeatherHours = "/weather/hours-prediction",
}

const searchLocation = (searchLocationReq: SearchLocationReq) => {
	const params = new URLSearchParams({ location: searchLocationReq.locationName });
	return apiClient.get<SearchLocationResponse>({ url: `${WeatherApi.LocationId}?${params.toString()}` });
};

const getWeatherNow = (weatherReq: WeatherReq) => {
	const params = new URLSearchParams({ location: weatherReq.location });
	if (weatherReq.lang) {
		params.set("lang", weatherReq.lang);
	}

	return apiClient.get<WeatherNowResponse>({ url: `${WeatherApi.WeatherNow}?${params.toString()}` });
};

const saveLocation = ({ userId, ...payload }: SaveLocationReq) =>
	apiClient.post({ url: `${WeatherApi.SavedLocation}?userId=${userId}`, data: payload });

const getSavedLocations = (savedLocationsReq: SavedLocationsReq) =>
	apiClient.get<SavedLocationItem[]>({ url: `${WeatherApi.SavedLocation}?userId=${savedLocationsReq.userId}` });

const removeSavedLocation = (savedLocationsReq: RemoveSavedLocationReq) =>
	apiClient.delete({
		url: `${WeatherApi.SavedLocation}?userId=${savedLocationsReq.userId}&locationId=${savedLocationsReq.locationId}`,
	});

const getSavedLocationList = (savedLocationListReq: SavedLocationListReq = {}) => {
	const params = new URLSearchParams();
	if (savedLocationListReq.page) params.set("page", String(savedLocationListReq.page));
	if (savedLocationListReq.pageSize) params.set("pageSize", String(savedLocationListReq.pageSize));
	const query = params.toString();
	return apiClient.get<unknown>({
		url: query ? `${WeatherApi.SavedLocationList}?${query}` : WeatherApi.SavedLocationList,
	});
};

const saveLocationList = (saveLocationListReq: SaveLocationListReq) =>
	apiClient.post({ url: WeatherApi.SavedLocationList, data: saveLocationListReq });

export default {
	searchLocation,
	getWeatherNow,
	saveLocation,
	getSavedLocations,
	removeSavedLocation,
	getSavedLocationList,
	saveLocationList,
};
