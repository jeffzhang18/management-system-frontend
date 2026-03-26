import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LocationInfo, SearchLocationReq } from "@/api/services/weatherService";
import weatherService from "@/api/services/weatherService";

import { Input } from "@/ui/input";

interface SearchBoxProps {
	onSelectLocation?: (location: LocationInfo) => void;
}

const SearchBox = ({ onSelectLocation }: SearchBoxProps) => {
	const { t, i18n } = useTranslation();
	const [inputValue, setInputValue] = useState<string>("");
	const [open, setOpen] = useState<boolean>(false);
	const [locations, setLocations] = useState<LocationInfo[]>([]);

	const handleSearch = async (searchLocationReq: SearchLocationReq) => {
		if (!searchLocationReq.locationName.trim()) {
			setLocations([]);
			setOpen(false);
			return;
		}

		setLocations([]);
		try {
			const res = await weatherService.searchLocation({
				...searchLocationReq,
				lang: i18n.resolvedLanguage || i18n.language,
			});
			setLocations(res.location);
		} catch (e) {
			console.log(e);
		} finally {
			setOpen(true);
		}
	};

	return (
		<div className="relative w-[300px]">
			<Input
				value={inputValue}
				placeholder={t("sys.weather.whichCityPlaceHolder")}
				onChange={(e) => {
					setInputValue(e.target.value);
				}}
				onKeyDown={(downKey) => {
					if (downKey.key === "Enter") {
						handleSearch({ locationName: inputValue });
					}
				}}
				onBlur={() => {
					setTimeout(() => setOpen(false), 100);
				}}
			/>

			{open && (
				<div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md">
					{locations.length > 0 ? (
						locations.map((location) => (
							<button
								key={location.id}
								type="button"
								className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
								onMouseDown={() => {
									onSelectLocation?.(location);
									setOpen(false);
									setLocations([]);
									setInputValue("");
								}}
							>
								{location.country}, {location.adm1}, {location.name}
							</button>
						))
					) : (
						<div className="px-3 py-2 text-sm text-muted-foreground">{t("sys.weather.noMatchedCity")}</div>
					)}
				</div>
			)}
		</div>
	);
};
export default SearchBox;
