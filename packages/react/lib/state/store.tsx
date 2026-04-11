import { Fn } from "@oofp/core/function";
import { useEffect, useState } from "react";

type UnsubscribeFn = () => void;

export type Store<S> = {
	value: S;
	subscribe: (listener: Fn<S, void>) => UnsubscribeFn;
	modify: (updater: Fn<S, S>) => void;
};

export const createStore = <S,>(initialState: S): Store<S> => {
	const listeners: Fn<S, void>[] = [];
	let state = initialState;

	const subscribe = (listener: Fn<S, void>): UnsubscribeFn => {
		listener(state);
		listeners.push(listener);
		return () => {
			const index = listeners.indexOf(listener);
			if (index !== -1) listeners.splice(index, 1);
		};
	};

	const modify = (updater: Fn<S, S>): void => {
		state = updater(state);
		listeners.forEach((listener) => listener(state));
	};

	return { value: state, subscribe, modify };
};

export const useStore = <S,>(store: Store<S>): S => {
	const [state, setState] = useState<S>(() => store.value);
	useEffect(() => store.subscribe(setState), [store]);
	return state;
};

type Props<S> = { initial: S };
export const useCreateStore = <S,>(props: Props<S>): Store<S> => {
	const [store] = useState(() => createStore(props.initial));
	return store;
};
