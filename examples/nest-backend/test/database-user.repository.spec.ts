import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";
import * as TE from "@oofp/core/task-either";
import { describe, expect, it, vi } from "vitest";
import type { Email, User, UserId } from "../src/domain/registration";
import {
	createDatabaseUserRepository,
	type UserPersistenceClient,
	type UserRow,
} from "../src/infrastructure/database-user.repository";

const row: UserRow = { id: "user-1", name: "Ada Lovelace", email: "ada@example.com" };
const user: User = {
	id: row.id as UserId,
	name: row.name,
	email: row.email as Email,
};
const uniqueViolation = { code: "unique-email" };

const createClient = (overrides: Partial<UserPersistenceClient> = {}): UserPersistenceClient => ({
	findUserByEmail: vi.fn(async () => row),
	insertUser: vi.fn(async () => row),
	...overrides,
});

const createRepository = (client: UserPersistenceClient) =>
	createDatabaseUserRepository(client, {
		isUniqueEmailViolation: (cause) => cause === uniqueViolation,
	});

describe("createDatabaseUserRepository", () => {
	it("maps a persisted row to a domain user", async () => {
		const repository = createRepository(createClient());
		const result = await TE.run(repository.findByEmail(user.email));

		expect(result).toEqual(E.right(M.just(user)));
	});

	it("maps a nullable lookup to Nothing", async () => {
		const repository = createRepository(
			createClient({ findUserByEmail: vi.fn(async () => null) }),
		);
		const result = await TE.run(repository.findByEmail(user.email));

		expect(result).toEqual(E.right(M.nothing()));
	});

	it("encodes the domain user and decodes the inserted row", async () => {
		const client = createClient();
		const repository = createRepository(client);
		const result = await TE.run(repository.save(user));

		expect(result).toEqual(E.right(user));
		expect(client.insertUser).toHaveBeenCalledWith(row);
	});

	it("maps a rejected lookup to UserRepositoryError", async () => {
		const repository = createRepository(
			createClient({ findUserByEmail: vi.fn(async () => Promise.reject(new Error("offline"))) }),
		);
		const result = await TE.run(repository.findByEmail(user.email));

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) expect(result.value._tag).toBe("UserRepositoryError");
	});

	it("maps an atomic unique violation to EmailAlreadyRegisteredError", async () => {
		const repository = createRepository(
			createClient({ insertUser: vi.fn(async () => Promise.reject(uniqueViolation)) }),
		);
		const result = await TE.run(repository.save(user));

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) expect(result.value._tag).toBe("EmailAlreadyRegisteredError");
	});

	it("maps other rejected inserts to UserRepositoryError", async () => {
		const repository = createRepository(
			createClient({ insertUser: vi.fn(async () => Promise.reject(new Error("offline"))) }),
		);
		const result = await TE.run(repository.save(user));

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) expect(result.value._tag).toBe("UserRepositoryError");
	});

	it("rejects invalid persisted rows at the infrastructure boundary", async () => {
		const repository = createRepository(
			createClient({ findUserByEmail: vi.fn(async () => ({ ...row, email: "invalid" })) }),
		);
		const result = await TE.run(repository.findByEmail(user.email));

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) expect(result.value._tag).toBe("UserRepositoryError");
	});
});
