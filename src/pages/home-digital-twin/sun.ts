const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface SunConfig {
	lat: number;
	lon: number;
	// UTC 偏移（小时），如上海 +8
	tzOffset: number;
	// 本地日期
	year: number;
	month: number; // 1-12
	day: number;
}

export interface SunPosition {
	// 方位角（度）：0=北，90=东，180=南，270=西
	azimuth: number;
	// 高度角（度）：地平线 0，头顶 90
	elevation: number;
}

// 本地日期 + 时间(小时) -> UTC 毫秒时间戳
function localToUtc(cfg: SunConfig, hour: number) {
	return Date.UTC(cfg.year, cfg.month - 1, cfg.day) - cfg.tzOffset * 3600000 + hour * 3600000;
}

function solarConstants(jd: number) {
	const jc = (jd - 2451545.0) / 36525;
	const geomMeanLongSun = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
	const geomMeanAnomSun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
	const eccentEarthOrbit = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
	const sunEqOfCtr =
		Math.sin(geomMeanAnomSun * RAD) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
		Math.sin(2 * geomMeanAnomSun * RAD) * (0.019993 - 0.000101 * jc) +
		Math.sin(3 * geomMeanAnomSun * RAD) * 0.000289;
	const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
	const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * jc) * RAD);
	const meanObliqEcliptic = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
	const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos((125.04 - 1934.136 * jc) * RAD);
	const sunDeclination = Math.asin(Math.sin(obliqCorr * RAD) * Math.sin(sunAppLong * RAD)) * DEG;
	const varY = Math.tan((obliqCorr / 2) * RAD) ** 2;
	const eqOfTime =
		4 *
		DEG *
		(varY * Math.sin(2 * geomMeanLongSun * RAD) -
			2 * eccentEarthOrbit * Math.sin(geomMeanAnomSun * RAD) +
			4 * eccentEarthOrbit * varY * Math.sin(geomMeanAnomSun * RAD) * Math.cos(2 * geomMeanLongSun * RAD) -
			0.5 * varY * varY * Math.sin(4 * geomMeanLongSun * RAD) -
			1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * geomMeanAnomSun * RAD));
	return { sunDeclination, eqOfTime };
}

// NOAA 太阳位置算法，精度约 ±0.01°
export function sunPosition(cfg: SunConfig, hour: number): SunPosition {
	const jd = localToUtc(cfg, hour) / 86400000 + 2440587.5;
	const { sunDeclination, eqOfTime } = solarConstants(jd);
	const utc = localToUtc(cfg, hour) / 3600000;
	const trueSolarTime = (((utc + cfg.lon / 15 + eqOfTime / 60) % 24) + 24) % 24;
	const hourAngle = (trueSolarTime - 12) * 15;
	const latRad = cfg.lat * RAD;
	const sinElev =
		Math.sin(latRad) * Math.sin(sunDeclination * RAD) +
		Math.cos(latRad) * Math.cos(sunDeclination * RAD) * Math.cos(hourAngle * RAD);
	const elevation = Math.asin(Math.max(-1, Math.min(1, sinElev))) * DEG;
	const cosAz =
		(Math.sin(sunDeclination * RAD) - Math.sin(elevation * RAD) * Math.sin(latRad)) /
		(Math.cos(elevation * RAD) * Math.cos(latRad));
	let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * DEG;
	if (hourAngle > 0) azimuth = 360 - azimuth;
	return { azimuth, elevation };
}

// 计算日出日落（本地时钟小时）。极昼/极夜返回 null
export function sunriseSunset(cfg: SunConfig): { sunrise: number; sunset: number } | null {
	const jd = localToUtc(cfg, 12) / 86400000 + 2440587.5;
	const { sunDeclination, eqOfTime } = solarConstants(jd);
	const cosHour =
		Math.cos(90.833 * RAD) / (Math.cos(cfg.lat * RAD) * Math.cos(sunDeclination * RAD)) -
		Math.tan(cfg.lat * RAD) * Math.tan(sunDeclination * RAD);
	if (cosHour > 1 || cosHour < -1) return null;
	const hourAngle = Math.acos(cosHour) * DEG;
	const solarNoon = 12 + cfg.tzOffset - cfg.lon / 15 - eqOfTime / 60;
	return { sunrise: solarNoon - hourAngle / 15, sunset: solarNoon + hourAngle / 15 };
}

export function formatHour(hour: number) {
	const h = Math.floor(hour);
	const m = Math.round((hour - h) * 60) % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
