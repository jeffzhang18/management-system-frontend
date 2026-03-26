import apiClient from "../apiClient";

export interface SearchLocationReq {
	locationName: string;
	lang?: string;
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
	LocationId = "/weather/location",
	WeatherNow = "/weather/now",
	WeatherDays = "/weather/days-prediction",
	WeatherHours = "/weather/hours-prediction",
}

const searchLocation = (searchLocationReq: SearchLocationReq) => {
	const params = new URLSearchParams({ location: searchLocationReq.locationName });
	if (searchLocationReq.lang) {
		params.set("lang", searchLocationReq.lang);
	}

	return apiClient.get<SearchLocationResponse>({ url: `${WeatherApi.LocationId}?${params.toString()}` });
};

const getWeatherNow = (weatherReq: WeatherReq) => {
	const params = new URLSearchParams({ location: weatherReq.location });
	if (weatherReq.lang) {
		params.set("lang", weatherReq.lang);
	}

	return apiClient.get<WeatherNowResponse>({ url: `${WeatherApi.WeatherNow}?${params.toString()}` });
};

export default {
	searchLocation,
	getWeatherNow,
};
