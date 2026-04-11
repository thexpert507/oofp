import { useEffect, useState } from "react";
import { AppFrame } from "./layout/AppFrame";
import { CurrentApiPage } from "./pages/CurrentApiPage";
import { StateLabPage } from "./pages/state-lab/StateLabPage";
import { ensureRoute, getRoute } from "./lib/routes";
import type { Route } from "./lib/routes";

export default function App() {
	const [route, setRoute] = useState<Route>(getRoute);

	useEffect(() => {
		ensureRoute();
		const handleHashChange = () => setRoute(getRoute());
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	return (
		<AppFrame route={route}>
			{route === "state-lab" ? <StateLabPage /> : <CurrentApiPage />}
		</AppFrame>
	);
}
