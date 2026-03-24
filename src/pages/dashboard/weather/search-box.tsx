import { useState } from "react";
import type { LocationInfo, SearchLocationReq } from "@/api/services/weatherService";
import weatherService from "@/api/services/weatherService";

import { Input } from "@/ui/input";

const SearchBox = () => {
	const [inputValue, setInputValue] = useState<string>("");
	const [open, setOpen] = useState<boolean>(false);
	const [locations, setLocations] = useState<LocationInfo[]>([]);
	const [_choosedLocation, setChoosedLocation] = useState<string>("");
	const [_choosedLocationId, setChoosedLocationId] = useState<string>("");

	const handleSearch = async (searchLocationReq: SearchLocationReq) => {
		setLocations([]);
		try {
			const res = await weatherService.searchLocation(searchLocationReq);
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
				placeholder="请输入城市"
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
									setInputValue(`${location.name}`);
									setChoosedLocation(location.name);
									setChoosedLocationId(location.id);
									setOpen(false);
									setInputValue(`${location.country}, ${location.adm1}, ${location.name}`);
								}}
							>
								{location.country}, {location.adm1}, {location.name}
							</button>
						))
					) : (
						<div className="px-3 py-2 text-sm text-muted-foreground">没有匹配的城市</div>
					)}
				</div>
			)}
		</div>
	);
};
export default SearchBox;
