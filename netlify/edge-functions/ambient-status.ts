type WeatherCodes = {
	codes: number[];
	label: string;
};

const weatherCodes: WeatherCodes[] = [
	{ codes: [0], label: "Clear" },
	{ codes: [1], label: "Mostly clear" },
	{ codes: [2], label: "Partly cloudy" },
	{ codes: [3], label: "Overcast" },
	{ codes: [45, 48], label: "Foggy" },
	{ codes: [51, 53, 55], label: "Drizzle" },
	{ codes: [56, 57], label: "Freezing drizzle" },
	{ codes: [61, 63, 65], label: "Rain" },
	{ codes: [66, 67], label: "Freezing rain" },
	{ codes: [71, 73, 75, 77], label: "Snow" },
	{ codes: [80, 81, 82], label: "Rain showers" },
	{ codes: [85, 86], label: "Snow showers" },
	{ codes: [95, 96, 99], label: "Thunderstorms" },
];

const mapWeatherCode = (code: number) => {
	const match = weatherCodes.find((entry) => entry.codes.includes(code));
	return match ? match.label : "Weather";
};

const formatLocalTime = (timezone: string | undefined) => {
	const formatter = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: timezone,
	});
	return formatter.format(new Date());
};

export default async (request: Request, context: any) => {
	const response = await context.next();
	const geo = context?.geo ?? {};
	const latitude = geo.latitude;
	const longitude = geo.longitude;
	const timezone = geo.timezone;
	const locationLabel = geo.city || "Nearby";

	if (!latitude || !longitude) {
		return response;
	}

	const url = new URL("https://api.open-meteo.com/v1/forecast");
	url.searchParams.set("latitude", latitude);
	url.searchParams.set("longitude", longitude);
	url.searchParams.set("current", "temperature_2m,weather_code");
	url.searchParams.set("temperature_unit", "celsius");
	url.searchParams.set("timezone", "auto");

	let weatherText = "Weather unavailable";
	try {
		const weatherResponse = await fetch(url.toString());
		if (weatherResponse.ok) {
			const data = await weatherResponse.json();
			const temperature = Math.round(data.current.temperature_2m);
			const condition = mapWeatherCode(data.current.weather_code);
			const label = locationLabel ? ` · ${locationLabel}` : "";
			weatherText = `${condition} ${temperature}°C${label}`;
		}
	} catch (error) {
		weatherText = "Weather unavailable";
	}

	const timeText = formatLocalTime(timezone);

	return new HTMLRewriter()
		.on(".ambient-weather", {
			element(element) {
				element.setInnerContent(weatherText);
			},
		})
		.on(".ambient-time", {
			element(element) {
				element.setInnerContent(timeText);
			},
		})
		.transform(response);
};
