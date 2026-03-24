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
	locationId: string;
}

export interface DaysWeatherReq extends WeatherReq {
	days: string;
}

export interface HoursWeatherReq extends WeatherReq {
	hours: string;
}

export enum WeatherApi {
	LocationId = "/weather/location",
	WeatherNow = "/weather/now",
	WeatherDays = "/weather/days",
	WeatherHours = "/weather/hours",
}

const searchLocation = (searchLocationReq: SearchLocationReq) =>
	apiClient.get<SearchLocationResponse>({ url: `${WeatherApi.LocationId}?location=${searchLocationReq.locationName}` });

export default {
	searchLocation,
};
