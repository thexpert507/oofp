export interface Address {
	street: string;
	city: string;
	zip: string;
}

export interface Person {
	name: string;
	age: number;
	address: Address;
}

export interface Company {
	name: string;
	ceo: Person;
}

export const alice: Person = {
	name: "Alice",
	age: 30,
	address: { street: "123 Main St", city: "Springfield", zip: "62704" },
};

export const acme: Company = {
	name: "Acme Corp",
	ceo: alice,
};
